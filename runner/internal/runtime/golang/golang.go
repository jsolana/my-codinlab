// Package golang is the Go language runtime.
package golang

import (
	"embed"
	"fmt"
	"os"
	"path/filepath"

	"github.com/jsolana/my-codinlab/runner/internal/runtime"
)

//go:embed sdk/codinlab/codinlab.go
var sdkFS embed.FS

const goMod = "module usercode\n\ngo 1.21\n"

// Runtime compiles user code together with the embedded codinlab SDK.
type Runtime struct{}

func New() Runtime { return Runtime{} }

func (Runtime) ID() string { return "go" }

func (Runtime) Prepare(dir, source string) (runtime.Plan, error) {
	sdk, err := sdkFS.ReadFile("sdk/codinlab/codinlab.go")
	if err != nil {
		return runtime.Plan{}, fmt.Errorf("read sdk: %w", err)
	}
	sdkDir := filepath.Join(dir, "codinlab")
	if err := os.MkdirAll(sdkDir, 0o755); err != nil {
		return runtime.Plan{}, err
	}
	files := map[string][]byte{
		filepath.Join(dir, "go.mod"):         []byte(goMod),
		filepath.Join(dir, "main.go"):        []byte(source),
		filepath.Join(sdkDir, "codinlab.go"): sdk,
	}
	for path, content := range files {
		if err := os.WriteFile(path, content, 0o644); err != nil {
			return runtime.Plan{}, err
		}
	}
	return runtime.Plan{
		Build: []string{"go", "build", "-o", "program", "."},
		Run:   []string{"./program"},
		Env:   []string{"GOFLAGS=-buildvcs=false", "GOTOOLCHAIN=local", "CGO_ENABLED=0"},
	}, nil
}
