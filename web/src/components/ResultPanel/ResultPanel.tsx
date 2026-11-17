import { useEffect, useRef } from 'react';
import type { LogLine, RunOutcome } from '@/core/execution/AgentRun';
import styles from './ResultPanel.module.css';

export type RunStatus = { phase: 'idle' } | { phase: 'running' } | { phase: 'finished'; outcome: RunOutcome };

const OUTCOME_LABEL: Record<RunOutcome, string> = {
  completed: 'Challenge completed',
  incomplete: 'Finished — challenge not solved',
  compile_error: 'Compilation failed',
  stopped: 'Stopped',
  timeout: 'Timed out',
  error: 'Execution error',
};

function statusView(status: RunStatus): { label: string; tone: string } {
  if (status.phase === 'idle') return { label: 'Ready', tone: '' };
  if (status.phase === 'running') return { label: 'Running…', tone: styles.running! };
  const ok = status.outcome === 'completed';
  return { label: OUTCOME_LABEL[status.outcome], tone: ok ? styles.success! : styles.failure! };
}

const LINE_CLASS: Record<LogLine['kind'], string | undefined> = {
  stdout: styles.stdout,
  stderr: styles.stderr,
  info: styles.info,
  error: styles.error,
  success: styles.successLine,
};

export function ResultPanel({ status, logs, steps }: { status: RunStatus; logs: readonly LogLine[]; steps: number }) {
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => {
    // Block body on purpose: effects must not return scrollIntoView()'s value.
    // Scroll the log container only (scrollIntoView would also scroll the page).
    const log = end.current?.parentElement;
    if (log) log.scrollTop = log.scrollHeight;
  }, [logs.length]);
  const view = statusView(status);

  return (
    <section className={styles.panel} aria-label="Results">
      <div className={styles.header}>
        <span className={`${styles.status} ${view.tone}`} role="status">
          {view.label}
        </span>
        <span>{steps} actions</span>
      </div>
      <pre className={styles.log}>
        {logs.length === 0 && <span className={styles.empty}>Run your program to see its output here.</span>}
        {logs.map((line, index) => (
          <div key={index} className={LINE_CLASS[line.kind]}>
            {line.text}
          </div>
        ))}
        <div ref={end} />
      </pre>
    </section>
  );
}
