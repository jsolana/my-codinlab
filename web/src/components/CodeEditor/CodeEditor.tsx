import { useLayoutEffect, useMemo, useRef, type KeyboardEvent } from 'react';
import { tokenize } from './syntax';
import styles from './CodeEditor.module.css';

interface Props {
  value: string;
  language: string;
  onChange(value: string): void;
  readOnly?: boolean;
}

const INDENT = '\t';

/**
 * Lightweight code editor: a transparent textarea over a highlighted layer.
 * Swap this component for Monaco later without touching the playground.
 */
export function CodeEditor({ value, language, onChange, readOnly }: Props) {
  const textarea = useRef<HTMLTextAreaElement>(null);
  const pendingSelection = useRef<number | null>(null);

  const tokens = useMemo(() => tokenize(language, value), [language, value]);
  const lineCount = useMemo(() => value.split('\n').length, [value]);

  useLayoutEffect(() => {
    if (pendingSelection.current !== null && textarea.current) {
      textarea.current.selectionStart = textarea.current.selectionEnd = pendingSelection.current;
      pendingSelection.current = null;
    }
  });

  const insert = (text: string, start: number, end: number, caretOffset = text.length) => {
    pendingSelection.current = start + caretOffset;
    onChange(value.slice(0, start) + text + value.slice(end));
  };

  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    const { selectionStart: start, selectionEnd: end } = event.currentTarget;
    if (event.key === 'Tab' && !event.shiftKey) {
      event.preventDefault();
      insert(INDENT, start, end);
    } else if (event.key === 'Enter') {
      event.preventDefault();
      const lineStart = value.lastIndexOf('\n', start - 1) + 1;
      const line = value.slice(lineStart, start);
      const indent = /^[\t ]*/.exec(line)?.[0] ?? '';
      const extra = line.trimEnd().endsWith('{') ? INDENT : '';
      insert('\n' + indent + extra, start, end);
    }
  };

  return (
    <div className={styles.editor}>
      <div className={styles.scroller}>
        <div className={styles.content}>
          <div className={styles.gutter} aria-hidden="true">
            {Array.from({ length: lineCount }, (_, i) => (
              <div key={i}>{i + 1}</div>
            ))}
          </div>
          <div className={styles.code}>
            <pre className={styles.highlight} aria-hidden="true">
              {tokens.map((token, index) => (
                <span key={index} className={token.kind === 'plain' ? undefined : styles[token.kind]}>
                  {token.text}
                </span>
              ))}
              {'\n'}
            </pre>
            <textarea
              ref={textarea}
              className={styles.input}
              aria-label="Code editor"
              value={value}
              readOnly={readOnly}
              spellCheck={false}
              autoCapitalize="off"
              autoCorrect="off"
              wrap="off"
              onChange={(event) => onChange(event.target.value)}
              onKeyDown={onKeyDown}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
