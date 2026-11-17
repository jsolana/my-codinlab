import { useCallback, useEffect, useRef, useState } from 'react';
import type { Challenge } from '@/core/challenges/types';
import type { EnvironmentStore } from '@/core/environment/EnvironmentStore';
import { AgentRun, type LogLine } from '@/core/execution/AgentRun';
import type { ExecutionAdapter } from '@/core/execution/ExecutionAdapter';
import type { RunStatus } from '@/components/ResultPanel/ResultPanel';

interface Options {
  challenge: Challenge;
  store: EnvironmentStore;
  adapter: ExecutionAdapter;
  pacingMs: number;
}

export function useAgentRunner({ challenge, store, adapter, pacingMs }: Options) {
  const [status, setStatus] = useState<RunStatus>({ phase: 'idle' });
  const [logs, setLogs] = useState<LogLine[]>([]);
  const current = useRef<AgentRun | null>(null);

  const stop = useCallback(async () => {
    await current.current?.stop();
  }, []);

  const run = useCallback(
    async (language: string, source: string) => {
      await current.current?.stop();
      store.reset();
      setLogs([]);
      setStatus({ phase: 'running' });

      const agentRun = new AgentRun({
        challenge,
        store,
        adapter,
        request: { language, source },
        pacingMs,
        observer: {
          onLog: (line) => {
            if (current.current === agentRun) setLogs((prev) => [...prev, line]);
          },
          onFinished: (outcome) => {
            if (current.current !== agentRun) return;
            setStatus({ phase: 'finished', outcome });
            if (outcome === 'completed') {
              setLogs((prev) => [...prev, { kind: 'success', text: 'Challenge completed!' }]);
            }
          },
        },
      });
      current.current = agentRun;
      await agentRun.start();
    },
    [challenge, store, adapter, pacingMs],
  );

  const reset = useCallback(async () => {
    const previous = current.current;
    current.current = null;
    await previous?.stop();
    store.reset();
    setLogs([]);
    setStatus({ phase: 'idle' });
  }, [store]);

  // Leaving the playground must never leave a program running.
  useEffect(() => () => void current.current?.stop(), []);

  return { status, logs, run, stop, reset, running: status.phase === 'running' };
}
