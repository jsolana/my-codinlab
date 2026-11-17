import { createContext, useContext, type ReactNode } from 'react';
import type { ExecutionAdapter } from './ExecutionAdapter';

const ExecutionContext = createContext<ExecutionAdapter | null>(null);

export function ExecutionProvider({ adapter, children }: { adapter: ExecutionAdapter; children: ReactNode }) {
  return <ExecutionContext.Provider value={adapter}>{children}</ExecutionContext.Provider>;
}

export function useExecutionAdapter(): ExecutionAdapter {
  const adapter = useContext(ExecutionContext);
  if (!adapter) throw new Error('ExecutionProvider is missing');
  return adapter;
}
