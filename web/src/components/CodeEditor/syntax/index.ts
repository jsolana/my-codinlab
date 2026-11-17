import { tokenizeGo } from './go';
import type { Token, Tokenizer } from './types';

/** Add a language's highlighter here; unknown languages render as plain text. */
const tokenizers: Record<string, Tokenizer> = {
  go: tokenizeGo,
};

export function tokenize(language: string, code: string): Token[] {
  const tokenizer = tokenizers[language];
  return tokenizer ? tokenizer(code) : [{ text: code, kind: 'plain' }];
}

export type { Token, TokenKind } from './types';
