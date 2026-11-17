// Package protocol defines the JSON-lines messages exchanged between a user
// program and the runner. The runner never interprets challenge payloads: it
// only forwards them.
package protocol

import (
	"encoding/json"
	"fmt"
)

// Messages sent by the user program (through its SDK).
const (
	TypeObserve = "observe"
	TypeAct     = "act"
	TypeLog     = "log"
)

// Messages sent back to the user program.
const (
	TypeObservation = "observation"
	TypeStep        = "step"
)

// FromProgram is a message emitted by the user program on stdout.
type FromProgram struct {
	Type   string          `json:"type"`
	Action json.RawMessage `json:"action,omitempty"`
	Text   string          `json:"text,omitempty"`
}

// ToProgram is a message written to the user program's stdin.
type ToProgram struct {
	Type string          `json:"type"`
	Data json.RawMessage `json:"data"`
}

// DecodeLine parses one stdout line. ok is false when the line is not a valid
// protocol message (plain program output, which callers treat as a log).
func DecodeLine(line []byte) (msg FromProgram, ok bool) {
	if err := json.Unmarshal(line, &msg); err != nil {
		return FromProgram{}, false
	}
	switch msg.Type {
	case TypeObserve, TypeAct, TypeLog:
		return msg, true
	default:
		return FromProgram{}, false
	}
}

// EncodeReply serializes a reply followed by a newline.
func EncodeReply(replyType string, data json.RawMessage) ([]byte, error) {
	if len(data) == 0 {
		data = json.RawMessage("null")
	}
	out, err := json.Marshal(ToProgram{Type: replyType, Data: data})
	if err != nil {
		return nil, fmt.Errorf("encode reply: %w", err)
	}
	return append(out, '\n'), nil
}
