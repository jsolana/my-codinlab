// Package sandbox abstracts how a command is isolated and executed.
package sandbox

import (
	"context"
	"io"
)

// Spec describes a command to run inside a sandbox.
type Spec struct {
	// Dir is the host directory holding the program files. It is the working
	// directory of the command (mounted for container sandboxes).
	Dir  string
	Argv []string
	Env  []string
}

// Process is a running sandboxed command.
type Process interface {
	Stdin() io.WriteCloser
	Stdout() io.Reader
	Stderr() io.Reader
	// Wait blocks until the command exits and returns its exit code.
	Wait() (exitCode int, err error)
	// Kill terminates the command. It is safe to call more than once.
	Kill()
}

// Sandbox starts commands in an isolated environment.
type Sandbox interface {
	Name() string
	Start(ctx context.Context, spec Spec) (Process, error)
}
