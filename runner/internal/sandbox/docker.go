package sandbox

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"errors"
	"os/exec"
)

// Docker runs every command in an ephemeral, network-less container.
type Docker struct {
	Image string
}

func (Docker) Name() string { return "docker" }

func (d Docker) Start(ctx context.Context, spec Spec) (Process, error) {
	if len(spec.Argv) == 0 {
		return nil, errors.New("empty command")
	}
	name, err := containerName()
	if err != nil {
		return nil, err
	}
	args := []string{
		"run", "--rm", "-i", "--name", name,
		"--network", "none",
		"--memory", "256m", "--cpus", "1", "--pids-limit", "128",
		"--cap-drop", "ALL", "--security-opt", "no-new-privileges",
		"--read-only", "--tmpfs", "/tmp:exec,size=256m",
		"-v", spec.Dir + ":/work", "-w", "/work",
		"-e", "HOME=/tmp", "-e", "GOCACHE=/tmp/gocache",
	}
	for _, kv := range spec.Env {
		args = append(args, "-e", kv)
	}
	args = append(args, d.Image)
	args = append(args, spec.Argv...)

	cmd := exec.CommandContext(ctx, "docker", args...)
	return startCmd(cmd, func() {
		_ = exec.Command("docker", "rm", "-f", name).Run()
	})
}

func containerName() (string, error) {
	buf := make([]byte, 6)
	if _, err := rand.Read(buf); err != nil {
		return "", err
	}
	return "codinlab-" + hex.EncodeToString(buf), nil
}
