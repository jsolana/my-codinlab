package protocol

import (
	"encoding/json"
	"testing"
)

func TestDecodeLine(t *testing.T) {
	tests := []struct {
		name   string
		line   string
		wantOK bool
		want   string
	}{
		{"observe", `{"type":"observe"}`, true, TypeObserve},
		{"act", `{"type":"act","action":{"move":"UP"}}`, true, TypeAct},
		{"log", `{"type":"log","text":"hi"}`, true, TypeLog},
		{"plain text", `hello world`, false, ""},
		{"unknown type", `{"type":"other"}`, false, ""},
		{"json without type", `{"a":1}`, false, ""},
	}
	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			msg, ok := DecodeLine([]byte(tc.line))
			if ok != tc.wantOK || msg.Type != tc.want {
				t.Fatalf("got (%q,%v), want (%q,%v)", msg.Type, ok, tc.want, tc.wantOK)
			}
		})
	}
}

func TestEncodeReply(t *testing.T) {
	out, err := EncodeReply(TypeStep, json.RawMessage(`{"done":true}`))
	if err != nil {
		t.Fatal(err)
	}
	if string(out) != "{\"type\":\"step\",\"data\":{\"done\":true}}\n" {
		t.Fatalf("unexpected output %q", out)
	}
}
