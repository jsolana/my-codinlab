package session

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"errors"
	"sync"
	"time"

	"github.com/jsolana/my-codinlab/runner/internal/runtime"
	"github.com/jsolana/my-codinlab/runner/internal/sandbox"
)

// ErrTooManySessions is returned when the concurrency limit is reached.
var ErrTooManySessions = errors.New("too many concurrent sessions")

// Manager creates and tracks sessions.
type Manager struct {
	registry      *runtime.Registry
	sandbox       sandbox.Sandbox
	limits        Limits
	maxConcurrent int
	retention     time.Duration

	mu       sync.Mutex
	sessions map[string]*Session
	running  int
}

type ManagerConfig struct {
	Registry      *runtime.Registry
	Sandbox       sandbox.Sandbox
	Limits        Limits
	MaxConcurrent int
	// Retention is how long a finished session remains readable.
	Retention time.Duration
}

func NewManager(cfg ManagerConfig) *Manager {
	return &Manager{
		registry:      cfg.Registry,
		sandbox:       cfg.Sandbox,
		limits:        cfg.Limits,
		maxConcurrent: cfg.MaxConcurrent,
		retention:     cfg.Retention,
		sessions:      make(map[string]*Session),
	}
}

// Languages lists supported language ids.
func (m *Manager) Languages() []string { return m.registry.IDs() }

// Create starts a session for the given language and source.
func (m *Manager) Create(language, source string) (*Session, error) {
	rt, err := m.registry.Get(language)
	if err != nil {
		return nil, err
	}
	id, err := newID()
	if err != nil {
		return nil, err
	}

	m.mu.Lock()
	if m.running >= m.maxConcurrent {
		m.mu.Unlock()
		return nil, ErrTooManySessions
	}
	m.running++
	ctx, cancel := context.WithTimeout(context.Background(), m.limits.TotalTimeout)
	sess := newSession(id, rt, m.sandbox, m.limits, cancel)
	m.sessions[id] = sess
	m.mu.Unlock()

	go func() {
		sess.run(ctx, source)
		m.mu.Lock()
		m.running--
		m.mu.Unlock()
		time.AfterFunc(m.retention, func() { m.remove(id) })
	}()
	return sess, nil
}

func (m *Manager) Get(id string) (*Session, bool) {
	m.mu.Lock()
	defer m.mu.Unlock()
	sess, ok := m.sessions[id]
	return sess, ok
}

func (m *Manager) remove(id string) {
	m.mu.Lock()
	defer m.mu.Unlock()
	delete(m.sessions, id)
}

func newID() (string, error) {
	buf := make([]byte, 8)
	if _, err := rand.Read(buf); err != nil {
		return "", err
	}
	return hex.EncodeToString(buf), nil
}
