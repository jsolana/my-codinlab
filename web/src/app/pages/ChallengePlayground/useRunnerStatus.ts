import { useEffect, useState } from 'react';
import type { ExecutionAdapter } from '@/core/execution/ExecutionAdapter';

export type RunnerStatus = { state: 'checking' } | { state: 'offline' } | { state: 'online'; languages: string[] };

export function useRunnerStatus(adapter: ExecutionAdapter): RunnerStatus {
  const [status, setStatus] = useState<RunnerStatus>({ state: 'checking' });
  useEffect(() => {
    let cancelled = false;
    adapter
      .listLanguages()
      .then((languages) => !cancelled && setStatus({ state: 'online', languages }))
      .catch(() => !cancelled && setStatus({ state: 'offline' }));
    return () => {
      cancelled = true;
    };
  }, [adapter]);
  return status;
}
