package session_test

import (
	"encoding/json"
	"os/exec"
	"strings"
	"testing"
	"time"

	"github.com/jsolana/my-codinlab/runner/internal/runtime"
	"github.com/jsolana/my-codinlab/runner/internal/runtime/golang"
	"github.com/jsolana/my-codinlab/runner/internal/sandbox"
	"github.com/jsolana/my-codinlab/runner/internal/session"
)

func newManager(t *testing.T, stepTimeout, total time.Duration) *session.Manager {
	t.Helper()
	if _, err := exec.LookPath("go"); err != nil {
		t.Skip("go toolchain not available")
	}
	return session.NewManager(session.ManagerConfig{
		Registry: runtime.NewRegistry(golang.New()),
		Sandbox:  sandbox.Local{},
		Limits: session.Limits{
			BuildTimeout: 60 * time.Second,
			TotalTimeout: total,
			StepTimeout:  stepTimeout,
			MaxEvents:    1000,
			MaxLineBytes: 1 << 20,
		},
		MaxConcurrent: 2,
		Retention:     time.Minute,
	})
}

// drive plays the browser's role: answers observe/act and collects event types.
func drive(t *testing.T, sess *session.Session, answer func(kind string) json.RawMessage) []session.Event {
	t.Helper()
	var all []session.Event
	index := 0
	deadline := time.After(90 * time.Second)
	for {
		events, wake, closed := sess.Read(index)
		for _, ev := range events {
			index++
			all = append(all, ev)
			if ev.Type == "request" {
				var req struct {
					ID   string `json:"id"`
					Kind string `json:"kind"`
				}
				if err := json.Unmarshal(ev.Data, &req); err != nil {
					t.Fatal(err)
				}
				if err := sess.Reply(req.ID, answer(req.Kind)); err != nil {
					t.Fatal(err)
				}
			}
		}
		if closed && len(events) == 0 {
			return all
		}
		if len(events) > 0 {
			continue
		}
		select {
		case <-wake:
		case <-deadline:
			t.Fatal("timed out waiting for session")
		}
	}
}

func types(events []session.Event) string {
	names := make([]string, len(events))
	for i, ev := range events {
		names[i] = ev.Type
	}
	return strings.Join(names, ",")
}

const echoProgram = `package main

import (
	"fmt"
	"usercode/codinlab"
)

func main() {
	env := codinlab.Connect()
	var obs struct{ N int }
	if err := env.Observe(&obs); err != nil {
		panic(err)
	}
	step, err := env.Act(map[string]string{"move": "UP"})
	if err != nil {
		panic(err)
	}
	fmt.Println("plain output")
	env.Logf("n=%d done=%v", obs.N, step.Done)
}
`

func TestSessionRoundTrip(t *testing.T) {
	manager := newManager(t, 5*time.Second, time.Minute)
	sess, err := manager.Create("go", echoProgram)
	if err != nil {
		t.Fatal(err)
	}
	events := drive(t, sess, func(kind string) json.RawMessage {
		if kind == "observe" {
			return json.RawMessage(`{"N":7}`)
		}
		return json.RawMessage(`{"observation":null,"done":true}`)
	})
	got := types(events)
	want := "started,request,request,log,log,finished"
	if got != want {
		t.Fatalf("events = %s, want %s", got, want)
	}
	if !strings.Contains(string(events[4].Data), "n=7 done=true") {
		t.Fatalf("unexpected log: %s", events[4].Data)
	}
}

func TestSessionCompileError(t *testing.T) {
	manager := newManager(t, 5*time.Second, time.Minute)
	sess, err := manager.Create("go", "package main\nfunc main() { undefined() }\n")
	if err != nil {
		t.Fatal(err)
	}
	events := drive(t, sess, func(string) json.RawMessage { return nil })
	if got := types(events); got != "compile_error,finished" {
		t.Fatalf("events = %s", got)
	}
	if !strings.Contains(string(events[0].Data), "undefined") {
		t.Fatalf("compile output missing: %s", events[0].Data)
	}
}

func TestSessionTimeout(t *testing.T) {
	manager := newManager(t, 5*time.Second, 6*time.Second)
	sess, err := manager.Create("go", "package main\nfunc main() { for {} }\n")
	if err != nil {
		t.Fatal(err)
	}
	events := drive(t, sess, func(string) json.RawMessage { return nil })
	last := events[len(events)-1]
	if last.Type != "finished" || !strings.Contains(string(last.Data), "timeout") {
		t.Fatalf("expected timeout, got %s %s", last.Type, last.Data)
	}
}

func TestUnsupportedLanguage(t *testing.T) {
	manager := newManager(t, time.Second, time.Second)
	if _, err := manager.Create("cobol", ""); err == nil {
		t.Fatal("expected error for unsupported language")
	}
}
