// Package api exposes the session manager over HTTP (REST + Server-Sent Events).
package api

import (
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"strconv"

	"github.com/jsolana/my-codinlab/runner/internal/session"
)

const maxBodyBytes = 256 << 10

// Handler builds the HTTP routes. allowedOrigin enables CORS for that origin
// ("*" allows any, empty disables CORS).
func Handler(manager *session.Manager, allowedOrigin string) http.Handler {
	s := &server{manager: manager}
	mux := http.NewServeMux()
	mux.HandleFunc("GET /api/health", func(w http.ResponseWriter, _ *http.Request) {
		writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
	})
	mux.HandleFunc("GET /api/runtimes", s.runtimes)
	mux.HandleFunc("POST /api/sessions", s.create)
	mux.HandleFunc("GET /api/sessions/{id}/events", s.events)
	mux.HandleFunc("POST /api/sessions/{id}/replies", s.reply)
	mux.HandleFunc("DELETE /api/sessions/{id}", s.stop)
	return cors(allowedOrigin, mux)
}

type server struct {
	manager *session.Manager
}

func (s *server) runtimes(w http.ResponseWriter, _ *http.Request) {
	writeJSON(w, http.StatusOK, map[string]any{"languages": s.manager.Languages()})
}

type createRequest struct {
	Language string `json:"language"`
	Source   string `json:"source"`
}

func (s *server) create(w http.ResponseWriter, r *http.Request) {
	var req createRequest
	if !decodeBody(w, r, &req) {
		return
	}
	sess, err := s.manager.Create(req.Language, req.Source)
	switch {
	case errors.Is(err, session.ErrTooManySessions):
		writeError(w, http.StatusTooManyRequests, err.Error())
	case err != nil:
		writeError(w, http.StatusBadRequest, err.Error())
	default:
		writeJSON(w, http.StatusCreated, map[string]string{"id": sess.ID()})
	}
}

type replyRequest struct {
	RequestID string          `json:"requestId"`
	Data      json.RawMessage `json:"data"`
}

func (s *server) reply(w http.ResponseWriter, r *http.Request) {
	sess, ok := s.manager.Get(r.PathValue("id"))
	if !ok {
		writeError(w, http.StatusNotFound, "session not found")
		return
	}
	var req replyRequest
	if !decodeBody(w, r, &req) {
		return
	}
	if err := sess.Reply(req.RequestID, req.Data); err != nil {
		writeError(w, http.StatusConflict, err.Error())
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (s *server) stop(w http.ResponseWriter, r *http.Request) {
	sess, ok := s.manager.Get(r.PathValue("id"))
	if !ok {
		writeError(w, http.StatusNotFound, "session not found")
		return
	}
	sess.Stop()
	w.WriteHeader(http.StatusNoContent)
}

// events streams the session log as SSE. A client may reconnect with the
// Last-Event-ID header (or ?from=) to resume.
func (s *server) events(w http.ResponseWriter, r *http.Request) {
	sess, ok := s.manager.Get(r.PathValue("id"))
	if !ok {
		writeError(w, http.StatusNotFound, "session not found")
		return
	}
	flusher, ok := w.(http.Flusher)
	if !ok {
		writeError(w, http.StatusInternalServerError, "streaming unsupported")
		return
	}
	w.Header().Set("Content-Type", "text/event-stream")
	w.Header().Set("Cache-Control", "no-cache")
	w.Header().Set("Connection", "keep-alive")
	w.WriteHeader(http.StatusOK)
	flusher.Flush()

	index := startIndex(r)
	for {
		events, wake, closed := sess.Read(index)
		for _, ev := range events {
			fmt.Fprintf(w, "id: %d\nevent: %s\ndata: %s\n\n", index, ev.Type, ev.Data)
			index++
		}
		flusher.Flush()
		if closed && len(events) == 0 {
			return
		}
		if len(events) > 0 {
			continue
		}
		select {
		case <-wake:
		case <-r.Context().Done():
			return
		}
	}
}

func startIndex(r *http.Request) int {
	raw := r.URL.Query().Get("from")
	if raw == "" {
		return 0
	}
	n, err := strconv.Atoi(raw)
	if err != nil || n < 0 {
		return 0
	}
	return n
}

func decodeBody(w http.ResponseWriter, r *http.Request, dst any) bool {
	r.Body = http.MaxBytesReader(w, r.Body, maxBodyBytes)
	if err := json.NewDecoder(r.Body).Decode(dst); err != nil {
		writeError(w, http.StatusBadRequest, "invalid JSON body")
		return false
	}
	return true
}

func writeJSON(w http.ResponseWriter, status int, payload any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(payload)
}

func writeError(w http.ResponseWriter, status int, message string) {
	writeJSON(w, status, map[string]string{"error": message})
}

func cors(origin string, next http.Handler) http.Handler {
	if origin == "" {
		return next
	}
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", origin)
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}
		next.ServeHTTP(w, r)
	})
}
