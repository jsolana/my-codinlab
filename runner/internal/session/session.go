// Package session runs one user submission and bridges it to the browser.
package session

import (
	"bufio"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"os"
	"strconv"
	"sync"
	"sync/atomic"
	"time"

	"github.com/jsolana/my-codinlab/runner/internal/protocol"
	"github.com/jsolana/my-codinlab/runner/internal/runtime"
	"github.com/jsolana/my-codinlab/runner/internal/sandbox"
)

// Limits bound the resources a single session may use.
type Limits struct {
	BuildTimeout time.Duration
	TotalTimeout time.Duration
	StepTimeout  time.Duration // max time waiting for the browser to answer
	MaxEvents    int
	MaxLineBytes int
}

// FinishReason explains why a session ended.
type FinishReason string

const (
	ReasonExited  FinishReason = "exited"
	ReasonStopped FinishReason = "stopped"
	ReasonTimeout FinishReason = "timeout"
	ReasonError   FinishReason = "error"
)

type reply struct {
	requestID string
	data      json.RawMessage
}

// Session is one execution of user code.
type Session struct {
	id      string
	rt      runtime.Runtime
	sandbox sandbox.Sandbox
	limits  Limits
	log     *eventLog
	replies chan reply
	cancel  context.CancelFunc
	nextReq atomic.Int64
	stopped atomic.Bool
	events  atomic.Int64
}

func newSession(id string, rt runtime.Runtime, sb sandbox.Sandbox, limits Limits, cancel context.CancelFunc) *Session {
	return &Session{
		cancel:  cancel,
		id:      id,
		rt:      rt,
		sandbox: sb,
		limits:  limits,
		log:     newEventLog(),
		replies: make(chan reply, 1),
	}
}

func (s *Session) ID() string { return s.id }

// Read returns buffered events from index `from` (see eventLog.read).
func (s *Session) Read(from int) ([]Event, <-chan struct{}, bool) { return s.log.read(from) }

// Reply delivers the browser's answer to a pending request.
func (s *Session) Reply(requestID string, data json.RawMessage) error {
	select {
	case s.replies <- reply{requestID: requestID, data: data}:
		return nil
	default:
		return errors.New("no request is waiting for a reply")
	}
}

// Stop terminates the session.
func (s *Session) Stop() {
	s.stopped.Store(true)
	s.cancel()
}

func (s *Session) emit(eventType string, payload any) {
	if s.events.Add(1) > int64(s.limits.MaxEvents) {
		return
	}
	s.log.append(eventType, payload)
}

// run executes the whole lifecycle; it blocks until the session ends.
func (s *Session) run(ctx context.Context, source string) {
	defer s.cancel()
	defer s.log.close()

	reason, exitCode := s.execute(ctx, source)
	if reason == ReasonError && ctx.Err() == context.DeadlineExceeded {
		reason = ReasonTimeout
	}
	if s.stopped.Load() {
		reason = ReasonStopped
	}
	s.log.append("finished", map[string]any{"reason": reason, "exitCode": exitCode})
}

func (s *Session) execute(ctx context.Context, source string) (FinishReason, int) {
	dir, err := os.MkdirTemp("", "codinlab-*")
	if err != nil {
		s.emit("error", map[string]string{"message": err.Error()})
		return ReasonError, -1
	}
	defer os.RemoveAll(dir)

	plan, err := s.rt.Prepare(dir, source)
	if err != nil {
		s.emit("error", map[string]string{"message": err.Error()})
		return ReasonError, -1
	}
	if len(plan.Build) > 0 {
		if ok := s.build(ctx, dir, plan); !ok {
			return ReasonError, 1
		}
	}
	s.emit("started", map[string]string{})
	return s.runProgram(ctx, dir, plan)
}

// build compiles the program; a failure is reported as a compile_error event.
func (s *Session) build(ctx context.Context, dir string, plan runtime.Plan) bool {
	buildCtx, cancel := context.WithTimeout(ctx, s.limits.BuildTimeout)
	defer cancel()

	proc, err := s.sandbox.Start(buildCtx, sandbox.Spec{Dir: dir, Argv: plan.Build, Env: plan.Env})
	if err != nil {
		s.emit("error", map[string]string{"message": err.Error()})
		return false
	}
	defer proc.Kill()
	_ = proc.Stdin().Close()

	var wg sync.WaitGroup
	var out, errOut []byte
	wg.Add(2)
	go func() { defer wg.Done(); out = readLimited(proc.Stdout(), 64<<10) }()
	go func() { defer wg.Done(); errOut = readLimited(proc.Stderr(), 64<<10) }()
	wg.Wait()
	exitCode, _ := proc.Wait()
	if exitCode == 0 {
		return true
	}
	if buildCtx.Err() != nil {
		s.emit("error", map[string]string{"message": "build timed out"})
		return false
	}
	s.emit("compile_error", map[string]string{"output": string(out) + string(errOut)})
	return false
}

func (s *Session) runProgram(ctx context.Context, dir string, plan runtime.Plan) (FinishReason, int) {
	proc, err := s.sandbox.Start(ctx, sandbox.Spec{Dir: dir, Argv: plan.Run, Env: plan.Env})
	if err != nil {
		s.emit("error", map[string]string{"message": err.Error()})
		return ReasonError, -1
	}
	defer proc.Kill()

	go func() { <-ctx.Done(); proc.Kill() }()

	var stderrDone sync.WaitGroup
	stderrDone.Add(1)
	go func() {
		defer stderrDone.Done()
		s.forwardStderr(proc.Stderr())
	}()

	if !s.serve(ctx, proc) {
		proc.Kill()
	}
	stderrDone.Wait()
	exitCode, _ := proc.Wait()
	if ctx.Err() != nil {
		return ReasonError, exitCode
	}
	return ReasonExited, exitCode
}

// serve answers the program's protocol messages until it closes stdout.
// It returns true when the program ended on its own.
func (s *Session) serve(ctx context.Context, proc sandbox.Process) bool {
	scanner := bufio.NewScanner(proc.Stdout())
	scanner.Buffer(make([]byte, 0, 64<<10), s.limits.MaxLineBytes)
	stdin := proc.Stdin()
	defer stdin.Close()

	for scanner.Scan() {
		line := scanner.Bytes()
		msg, ok := protocol.DecodeLine(line)
		if !ok {
			s.emit("log", map[string]string{"stream": "stdout", "text": string(line)})
			continue
		}
		switch msg.Type {
		case protocol.TypeLog:
			s.emit("log", map[string]string{"stream": "stdout", "text": msg.Text})
		case protocol.TypeObserve:
			if !s.roundTrip(ctx, stdin, "observe", nil, protocol.TypeObservation) {
				return false
			}
		case protocol.TypeAct:
			if !s.roundTrip(ctx, stdin, "act", msg.Action, protocol.TypeStep) {
				return false
			}
		}
	}
	if err := scanner.Err(); err != nil {
		s.emit("error", map[string]string{"message": "program output error: " + err.Error()})
		return false
	}
	return true
}

// roundTrip forwards a request to the browser and writes its answer to the program.
func (s *Session) roundTrip(ctx context.Context, stdin io.Writer, kind string, action json.RawMessage, replyType string) bool {
	requestID := strconv.FormatInt(s.nextReq.Add(1), 10)
	s.emit("request", map[string]any{"id": requestID, "kind": kind, "action": action})

	timer := time.NewTimer(s.limits.StepTimeout)
	defer timer.Stop()

	for {
		select {
		case r := <-s.replies:
			if r.requestID != requestID {
				continue // stale reply
			}
			encoded, err := protocol.EncodeReply(replyType, r.data)
			if err != nil {
				s.emit("error", map[string]string{"message": err.Error()})
				return false
			}
			if _, err := stdin.Write(encoded); err != nil {
				return false
			}
			return true
		case <-timer.C:
			s.emit("error", map[string]string{"message": fmt.Sprintf("the browser did not answer within %s", s.limits.StepTimeout)})
			return false
		case <-ctx.Done():
			return false
		}
	}
}

func (s *Session) forwardStderr(r io.Reader) {
	scanner := bufio.NewScanner(r)
	scanner.Buffer(make([]byte, 0, 64<<10), s.limits.MaxLineBytes)
	for scanner.Scan() {
		s.emit("log", map[string]string{"stream": "stderr", "text": scanner.Text()})
	}
}

func readLimited(r io.Reader, limit int64) []byte {
	data, _ := io.ReadAll(io.LimitReader(r, limit))
	_, _ = io.Copy(io.Discard, r)
	return data
}
