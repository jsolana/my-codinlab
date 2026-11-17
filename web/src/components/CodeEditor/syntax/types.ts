export type TokenKind = 'plain' | 'keyword' | 'type' | 'string' | 'comment' | 'number' | 'function';

export interface Token {
  text: string;
  kind: TokenKind;
}

/** Turns source code into tokens. Concatenating `text` must reproduce the input. */
export type Tokenizer = (code: string) => Token[];
