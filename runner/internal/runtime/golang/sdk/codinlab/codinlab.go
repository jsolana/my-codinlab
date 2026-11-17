// Package codinlab lets a program observe a challenge and act on it.
//
// The program talks to the platform through stdin/stdout using JSON lines.
// Anything else printed to stdout is shown as plain log output.
package codinlab

import (
	"bufio"
	"encoding/json"
	"fmt"
	"io"
	"os"
)

// Step is the platform's answer to an action.
type Step struct {
	Observation json.RawMessage `json:"observation"`
	Reward      float64         `json:"reward"`
	Done        bool            `json:"done"`
	Message     string          `json:"message"`
	Error       string          `json:"error"`
	Info        json.RawMessage `json:"info"`
}

// DecodeObservation unmarshals the observation into v.
func (s Step) DecodeObservation(v any) error { return json.Unmarshal(s.Observation, v) }

// DecodeInfo unmarshals challenge-specific extra data into v.
func (s Step) DecodeInfo(v any) error { return json.Unmarshal(s.Info, v) }

// Env is a connection to the running challenge.
type Env struct {
	in  *bufio.Reader
	out io.Writer
}

// Connect attaches to the platform over stdin/stdout.
func Connect() *Env {
	return &Env{in: bufio.NewReaderSize(os.Stdin, 1<<20), out: os.Stdout}
}

type reply struct {
	Type string          `json:"type"`
	Data json.RawMessage `json:"data"`
}

func (e *Env) send(msg map[string]any) error {
	line, err := json.Marshal(msg)
	if err != nil {
		return err
	}
	_, err = e.out.Write(append(line, '\n'))
	return err
}

func (e *Env) receive(want string) (json.RawMessage, error) {
	line, err := e.in.ReadBytes('\n')
	if err != nil {
		return nil, fmt.Errorf("platform closed the connection: %w", err)
	}
	var r reply
	if err := json.Unmarshal(line, &r); err != nil {
		return nil, fmt.Errorf("invalid reply: %w", err)
	}
	if r.Type != want {
		return nil, fmt.Errorf("unexpected reply %q, want %q", r.Type, want)
	}
	return r.Data, nil
}

// Observe reads the current observation into v.
func (e *Env) Observe(v any) error {
	if err := e.send(map[string]any{"type": "observe"}); err != nil {
		return err
	}
	data, err := e.receive("observation")
	if err != nil {
		return err
	}
	return json.Unmarshal(data, v)
}

// Act sends an action (any JSON-serializable value) and returns the result.
func (e *Env) Act(action any) (Step, error) {
	if err := e.send(map[string]any{"type": "act", "action": action}); err != nil {
		return Step{}, err
	}
	data, err := e.receive("step")
	if err != nil {
		return Step{}, err
	}
	var step Step
	if err := json.Unmarshal(data, &step); err != nil {
		return Step{}, fmt.Errorf("invalid step: %w", err)
	}
	return step, nil
}

// Logf writes a message to the platform's output panel.
func (e *Env) Logf(format string, args ...any) {
	_ = e.send(map[string]any{"type": "log", "text": fmt.Sprintf(format, args...)})
}
