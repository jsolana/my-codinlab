import { useMemo, useState } from 'react';
import type { Challenge } from '@/core/challenges/types';
import { useEnvironment } from '@/core/environment/useEnvironment';
import { useExecutionAdapter } from '@/core/execution/ExecutionContext';
import { AppShell } from '@/app/AppShell';
import { navigate, paths } from '@/app/routing/router';
import { Button } from '@/components/Button';
import { DifficultyBadge } from '@/components/Badges';
import { CodeEditor } from '@/components/CodeEditor/CodeEditor';
import { InstructionsPanel } from '@/components/InstructionsPanel/InstructionsPanel';
import { LanguageSelector } from '@/components/LanguageSelector/LanguageSelector';
import { ResultPanel } from '@/components/ResultPanel/ResultPanel';
import { ArrowLeftIcon, PlayIcon, ResetIcon, StopIcon } from '@/components/icons';
import { useAgentRunner } from './useAgentRunner';
import { useRunnerStatus } from './useRunnerStatus';
import styles from './ChallengePlayground.module.css';

const SPEEDS = [
  { label: 'Slow', ms: 400 },
  { label: 'Normal', ms: 140 },
  { label: 'Fast', ms: 30 },
] as const;

/** Mount with `key={challenge.id}` so every challenge gets a fresh instance. */
export function ChallengePlayground({ challenge }: { challenge: Challenge }) {
  const adapter = useExecutionAdapter();
  const { store, state, completed } = useEnvironment(challenge);
  const runner = useRunnerStatus(adapter);

  const [language, setLanguage] = useState(challenge.languages[0]!.id);
  const [pacingMs, setPacingMs] = useState<number>(SPEEDS[1].ms);
  const [codeByLanguage, setCodeByLanguage] = useState<Record<string, string>>(() =>
    Object.fromEntries(challenge.languages.map((l) => [l.id, l.template])),
  );

  const { status, logs, run, stop, reset, running } = useAgentRunner({ challenge, store, adapter, pacingMs });

  const code = codeByLanguage[language] ?? '';
  const runnerSupportsLanguage = runner.state === 'online' && runner.languages.includes(language);
  const notice = useMemo(() => {
    if (runner.state === 'offline') return 'Runner offline. Start it with: cd runner && go run ./cmd/runner';
    if (runner.state === 'online' && !runnerSupportsLanguage) return `The runner does not support ${language}.`;
    return null;
  }, [runner, runnerSupportsLanguage, language]);

  const { Renderer } = challenge;

  return (
    <AppShell
      actions={
        <div className={styles.title}>
          <Button variant="ghost" onClick={() => navigate(paths.preview(challenge.id))}>
            <ArrowLeftIcon /> Back
          </Button>
          <span>{challenge.metadata.name}</span>
          <DifficultyBadge difficulty={challenge.metadata.difficulty} />
        </div>
      }
    >
      <div className={styles.layout}>
        <div className={styles.left}>
          <div className={styles.stage} data-completed={completed}>
            <div className={styles.stageInner}>
              <Renderer state={state} />
            </div>
          </div>
          <InstructionsPanel instructions={challenge.instructions} />
        </div>

        <section className={styles.side} aria-label="Code editor">
          <div className={styles.toolbar}>
            <LanguageSelector
              languages={challenge.languages}
              value={language}
              onChange={setLanguage}
              disabled={running}
            />
            <span className={styles.spacer} />
            <select
              className={styles.speed}
              aria-label="Animation speed"
              value={pacingMs}
              onChange={(event) => setPacingMs(Number(event.target.value))}
            >
              {SPEEDS.map((speed) => (
                <option key={speed.label} value={speed.ms}>
                  {speed.label}
                </option>
              ))}
            </select>
            <Button onClick={() => void reset()} aria-label="Reset challenge">
              <ResetIcon /> Reset
            </Button>
            {running ? (
              <Button variant="primary" onClick={() => void stop()}>
                <StopIcon /> Stop
              </Button>
            ) : (
              <Button variant="primary" disabled={!runnerSupportsLanguage} onClick={() => void run(language, code)}>
                <PlayIcon /> Run
              </Button>
            )}
          </div>
          {notice && <div className={styles.notice}>{notice}</div>}
          <CodeEditor
            language={language}
            value={code}
            readOnly={running}
            onChange={(value) => setCodeByLanguage((prev) => ({ ...prev, [language]: value }))}
          />
          <div className={styles.results}>
            <ResultPanel status={status} logs={logs} steps={store.getSteps()} />
          </div>
        </section>
      </div>
    </AppShell>
  );
}
