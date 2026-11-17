package sandbox

import (
	"errors"
	"io"
	"os/exec"
	"sync"
)

// cmdProcess adapts an *exec.Cmd to the Process interface.
type cmdProcess struct {
	cmd    *exec.Cmd
	stdin  io.WriteCloser
	stdout io.Reader
	stderr io.Reader
	onKill func()
	once   sync.Once
}

func startCmd(cmd *exec.Cmd, onKill func()) (*cmdProcess, error) {
	stdin, err := cmd.StdinPipe()
	if err != nil {
		return nil, err
	}
	stdout, err := cmd.StdoutPipe()
	if err != nil {
		return nil, err
	}
	stderr, err := cmd.StderrPipe()
	if err != nil {
		return nil, err
	}
	if err := cmd.Start(); err != nil {
		return nil, err
	}
	return &cmdProcess{cmd: cmd, stdin: stdin, stdout: stdout, stderr: stderr, onKill: onKill}, nil
}

func (p *cmdProcess) Stdin() io.WriteCloser { return p.stdin }
func (p *cmdProcess) Stdout() io.Reader     { return p.stdout }
func (p *cmdProcess) Stderr() io.Reader     { return p.stderr }

func (p *cmdProcess) Wait() (int, error) {
	err := p.cmd.Wait()
	if err == nil {
		return 0, nil
	}
	var exitErr *exec.ExitError
	if errors.As(err, &exitErr) {
		return exitErr.ExitCode(), nil
	}
	return -1, err
}

func (p *cmdProcess) Kill() {
	p.once.Do(func() {
		if p.onKill != nil {
			p.onKill()
		}
		if p.cmd.Process != nil {
			_ = p.cmd.Process.Kill()
		}
	})
}
