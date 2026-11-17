// Package runtime describes how source code of one language is prepared,
// built and launched. Adding a language means adding a Runtime.
package runtime

import (
	"fmt"
	"sort"
)

// Plan is what a Runtime returns for one submission.
type Plan struct {
	// Build is an optional compile step. Empty means interpreted language.
	Build []string
	// Run starts the user program.
	Run []string
	// Env holds extra environment variables for both steps.
	Env []string
}

// Runtime prepares and plans execution for one language.
type Runtime interface {
	ID() string
	// Prepare writes the source and any SDK files into dir.
	Prepare(dir, source string) (Plan, error)
}

// Registry holds the available runtimes.
type Registry struct {
	runtimes map[string]Runtime
}

func NewRegistry(runtimes ...Runtime) *Registry {
	registry := &Registry{runtimes: make(map[string]Runtime, len(runtimes))}
	for _, rt := range runtimes {
		registry.runtimes[rt.ID()] = rt
	}
	return registry
}

func (r *Registry) Get(id string) (Runtime, error) {
	rt, ok := r.runtimes[id]
	if !ok {
		return nil, fmt.Errorf("unsupported language %q", id)
	}
	return rt, nil
}

// IDs returns the sorted language identifiers.
func (r *Registry) IDs() []string {
	ids := make([]string, 0, len(r.runtimes))
	for id := range r.runtimes {
		ids = append(ids, id)
	}
	sort.Strings(ids)
	return ids
}
