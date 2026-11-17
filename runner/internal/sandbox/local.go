package sandbox

import (
	"context"
	"errors"
	"os"
	"os/exec"
)

// Local runs commands as plain child processes with a scrubbed environment.
// It provides NO isolation: use it only with trusted code on a dev machine.
type Local struct{}

func (Local) Name() string { return "local" }

func (Local) Start(ctx context.Context, spec Spec) (Process, error) {
	if len(spec.Argv) == 0 {
		return nil, errors.New("empty command")
	}
	cmd := exec.CommandContext(ctx, spec.Argv[0], spec.Argv[1:]...)
	cmd.Dir = spec.Dir
	cmd.Env = append(baseEnv(), spec.Env...)
	return startCmd(cmd, nil)
}

// baseEnv keeps only what toolchains need, dropping the host's other variables.
func baseEnv() []string {
	keep := []string{"PATH", "HOME", "GOPATH", "GOCACHE", "GOROOT", "TMPDIR", "USER"}
	env := make([]string, 0, len(keep))
	for _, key := range keep {
		if value, ok := os.LookupEnv(key); ok {
			env = append(env, key+"="+value)
		}
	}
	return env
}
