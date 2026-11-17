/**
 * Abstraction over "somewhere that can run user code and talk to it as an
 * agent". Implementations: remote runner (HTTP/SSE) today; Web Worker,
 * WASM or another API tomorrow.
 */

export interface RunRequest {
  language: string;
  source: string;
}

export type ExecutionEvent =
  | { type: 'started' }
  | { type: 'request'; id: string; kind: 'observe' | 'act'; action?: unknown }
  | { type: 'log'; stream: 'stdout' | 'stderr'; text: string }
  | { type: 'compile_error'; output: string }
  | { type: 'error'; message: string }
  | { type: 'finished'; reason: 'exited' | 'stopped' | 'timeout' | 'error'; exitCode: number };

export type ExecutionEventHandler = (event: ExecutionEvent) => void;

export interface ExecutionSession {
  /** Answers a pending `request` event. */
  reply(requestId: string, data: unknown): Promise<void>;
  stop(): Promise<void>;
}

export interface ExecutionAdapter {
  /** Language ids this backend can run. */
  listLanguages(): Promise<string[]>;
  start(request: RunRequest, onEvent: ExecutionEventHandler): Promise<ExecutionSession>;
}
