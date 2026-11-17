// Command runner executes user programs and bridges them to the browser.
package main

import (
	"context"
	"errors"
	"flag"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/jsolana/my-codinlab/runner/internal/api"
	"github.com/jsolana/my-codinlab/runner/internal/runtime"
	"github.com/jsolana/my-codinlab/runner/internal/runtime/golang"
	"github.com/jsolana/my-codinlab/runner/internal/sandbox"
	"github.com/jsolana/my-codinlab/runner/internal/session"
)

func main() {
	if err := run(); err != nil {
		log.Fatal(err)
	}
}

func run() error {
	var (
		addr        = flag.String("addr", "127.0.0.1:8787", "listen address")
		sandboxKind = flag.String("sandbox", "local", "sandbox: local | docker")
		goImage     = flag.String("go-image", "golang:1.25", "docker image used for Go when --sandbox=docker")
		corsOrigin  = flag.String("cors-origin", "", "allowed CORS origin (empty disables CORS)")
		maxSessions = flag.Int("max-sessions", 8, "max concurrent sessions")
		totalTO     = flag.Duration("timeout", 2*time.Minute, "max duration of one session")
		stepTO      = flag.Duration("step-timeout", 10*time.Second, "max wait for the browser to answer one request")
	)
	flag.Parse()

	sb, err := newSandbox(*sandboxKind, *goImage)
	if err != nil {
		return err
	}

	manager := session.NewManager(session.ManagerConfig{
		Registry: runtime.NewRegistry(golang.New()),
		Sandbox:  sb,
		Limits: session.Limits{
			BuildTimeout: 60 * time.Second,
			TotalTimeout: *totalTO,
			StepTimeout:  *stepTO,
			MaxEvents:    20000,
			MaxLineBytes: 1 << 20,
		},
		MaxConcurrent: *maxSessions,
		Retention:     2 * time.Minute,
	})

	srv := &http.Server{
		Addr:              *addr,
		Handler:           api.Handler(manager, *corsOrigin),
		ReadHeaderTimeout: 5 * time.Second,
	}

	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()
	go func() {
		<-ctx.Done()
		shutdownCtx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
		defer cancel()
		_ = srv.Shutdown(shutdownCtx)
	}()

	log.Printf("runner listening on http://%s (sandbox=%s, languages=%v)", *addr, sb.Name(), manager.Languages())
	if err := srv.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
		return err
	}
	return nil
}

func newSandbox(kind, goImage string) (sandbox.Sandbox, error) {
	switch kind {
	case "local":
		return sandbox.Local{}, nil
	case "docker":
		return sandbox.Docker{Image: goImage}, nil
	default:
		return nil, fmt.Errorf("unknown sandbox %q", kind)
	}
}
