package session

import (
	"encoding/json"
	"sync"
)

// Event is something the browser observes about a session.
type Event struct {
	Type string          `json:"type"`
	Data json.RawMessage `json:"data"`
}

// eventLog is an append-only log that supports replay and blocking reads, so
// a client that connects late still sees every event.
type eventLog struct {
	mu     sync.Mutex
	events []Event
	closed bool
	wake   chan struct{}
}

func newEventLog() *eventLog {
	return &eventLog{wake: make(chan struct{})}
}

func (l *eventLog) append(eventType string, payload any) {
	data, err := json.Marshal(payload)
	if err != nil {
		data = json.RawMessage(`null`)
	}
	l.mu.Lock()
	defer l.mu.Unlock()
	if l.closed {
		return
	}
	l.events = append(l.events, Event{Type: eventType, Data: data})
	l.broadcast()
}

func (l *eventLog) close() {
	l.mu.Lock()
	defer l.mu.Unlock()
	if l.closed {
		return
	}
	l.closed = true
	l.broadcast()
}

// broadcast must be called with mu held.
func (l *eventLog) broadcast() {
	close(l.wake)
	l.wake = make(chan struct{})
}

// read returns events from index `from`, a channel that fires when more
// arrive, and whether the log is closed (no more events will ever come).
func (l *eventLog) read(from int) (events []Event, wake <-chan struct{}, closed bool) {
	l.mu.Lock()
	defer l.mu.Unlock()
	if from < len(l.events) {
		events = append(events, l.events[from:]...)
	}
	return events, l.wake, l.closed
}
