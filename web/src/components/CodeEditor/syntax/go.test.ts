import { describe, expect, it } from 'vitest';
import { tokenize } from './index';

describe('go tokenizer', () => {
  const code = 'func main() {\n\t// hi "x"\n\tx := 42 + len("a")\n}';
  const tokens = tokenize('go', code);

  it('is lossless', () => {
    expect(tokens.map((t) => t.text).join('')).toBe(code);
  });
  it('classifies tokens', () => {
    const kinds = Object.fromEntries(tokens.map((t) => [t.text, t.kind]));
    expect(kinds['func']).toBe('keyword');
    expect(kinds['main']).toBe('function');
    expect(kinds['// hi "x"']).toBe('comment');
    expect(kinds['42']).toBe('number');
    expect(kinds['"a"']).toBe('string');
  });
  it('falls back to plain text for unknown languages', () => {
    expect(tokenize('cobol', 'x')).toEqual([{ text: 'x', kind: 'plain' }]);
  });
});
