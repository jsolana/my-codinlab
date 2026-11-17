import type { Token, TokenKind, Tokenizer } from './types';

const KEYWORDS = new Set(
  'break case chan const continue default defer else fallthrough for func go goto if import interface map package range return select struct switch type var'.split(
    ' ',
  ),
);
const TYPES = new Set(
  'bool byte complex64 complex128 error float32 float64 int int8 int16 int32 int64 rune string uint uint8 uint16 uint32 uint64 uintptr any true false nil iota'.split(
    ' ',
  ),
);

// Order matters: comments and strings first so their content is never re-tokenized.
const PATTERN =
  /(\/\/[^\n]*|\/\*[\s\S]*?\*\/)|("(?:\\.|[^"\\\n])*"|`[^`]*`|'(?:\\.|[^'\\\n])*')|(\b\d[\d_]*(?:\.\d+)?\b)|([A-Za-z_]\w*)(\s*\()?/g;

export const tokenizeGo: Tokenizer = (code) => {
  const tokens: Token[] = [];
  let cursor = 0;
  const push = (text: string, kind: TokenKind) => {
    if (text) tokens.push({ text, kind });
  };

  for (const match of code.matchAll(PATTERN)) {
    const [full, comment, string, number, word, call] = match;
    const index = match.index ?? 0;
    push(code.slice(cursor, index), 'plain');
    if (comment) push(full, 'comment');
    else if (string) push(full, 'string');
    else if (number) push(full, 'number');
    else if (word) {
      const kind: TokenKind = KEYWORDS.has(word) ? 'keyword' : TYPES.has(word) ? 'type' : call ? 'function' : 'plain';
      push(word, kind);
      push(call ?? '', 'plain');
    }
    cursor = index + full.length;
  }
  push(code.slice(cursor), 'plain');
  return tokens;
};
