import { useMemo, useSyncExternalStore } from 'react';
import type { Challenge } from '@/core/challenges/types';
import { EnvironmentStore } from './EnvironmentStore';

export interface EnvironmentView {
  store: EnvironmentStore;
  state: unknown;
  completed: boolean;
}

/** Creates a fresh environment per challenge instance (never shared). */
export function useEnvironment(challenge: Challenge): EnvironmentView {
  const store = useMemo(() => new EnvironmentStore(challenge), [challenge]);
  const state = useSyncExternalStore(store.subscribe, store.getState);
  return { store, state, completed: store.isCompleted() };
}
