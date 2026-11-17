import { describe, expect, it } from 'vitest';
import { EnvironmentStore } from '@/core/environment/EnvironmentStore';
import { mazeChallenge } from '@/challenges/maze';
import { AgentRun, type LogLine, type RunOutcome } from './AgentRun';
import type { ExecutionAdapter, ExecutionEvent, ExecutionEventHandler } from './ExecutionAdapter';

/** A fake backend that replays a scripted "program" against the real AgentRun. */
function fakeAdapter(script: (emit: ExecutionEventHandler, replies: Map<string, (data: unknown) => void>) => Promise<void>) {
  const replies = new Map<string, (data: unknown) => void>();
  const adapter: ExecutionAdapter = {
    listLanguages: async () => ['go'],
    start: async (_request, onEvent) => {
      void script(onEvent, replies);
      return {
        reply: async (id, data) => replies.get(id)?.(data),
        stop: async () => onEvent({ type: 'finished', reason: 'stopped', exitCode: -1 }),
      };
    },
  };
  return adapter;
}

const request = (emit: ExecutionEventHandler, replies: Map<string, (d: unknown) => void>, id: string, kind: 'observe' | 'act', action?: unknown) =>
  new Promise<unknown>((resolve) => {
    replies.set(id, resolve);
    emit({ type: 'request', id, kind, action } as ExecutionEvent);
  });

async function runScript(script: Parameters<typeof fakeAdapter>[0]) {
  const store = new EnvironmentStore(mazeChallenge);
  const logs: LogLine[] = [];
  const run = new AgentRun({
    challenge: mazeChallenge,
    store,
    adapter: fakeAdapter(script),
    request: { language: 'go', source: '' },
    observer: { onLog: (line) => logs.push(line), onFinished: () => undefined },
    pacingMs: 0,
    stopGraceMs: 0,
  });
  await run.start();
  const outcome: RunOutcome = await run.result;
  return { outcome, logs, store };
}

describe('AgentRun', () => {
  it('answers observe from the environment and applies valid actions', async () => {
    let observation: { position: { x: number; y: number } } | undefined;
    const { store, outcome } = await runScript(async (emit, replies) => {
      emit({ type: 'started' });
      observation = (await request(emit, replies, '1', 'observe')) as typeof observation;
      const step = (await request(emit, replies, '2', 'act', { move: 'DOWN' })) as { observation: { position: { x: number; y: number } } };
      expect(step.observation.position).toEqual({ x: 1, y: 2 });
      emit({ type: 'finished', reason: 'exited', exitCode: 0 });
    });
    expect(observation?.position).toEqual({ x: 1, y: 1 });
    expect(store.getSteps()).toBe(1);
    expect(outcome).toBe('incomplete');
  });

  it('turns invalid actions into error replies without touching state', async () => {
    const { store, logs } = await runScript(async (emit, replies) => {
      const step = (await request(emit, replies, '1', 'act', { move: 'FLY' })) as { error: string };
      expect(step.error).toMatch(/Invalid action/);
      emit({ type: 'finished', reason: 'exited', exitCode: 0 });
    });
    expect(store.getSteps()).toBe(0);
    expect(logs.some((l) => l.kind === 'error')).toBe(true);
  });

  it('reports compile errors', async () => {
    const { outcome, logs } = await runScript(async (emit) => {
      emit({ type: 'compile_error', output: 'main.go:1: boom' });
    });
    expect(outcome).toBe('compile_error');
    expect(logs[0]?.text).toContain('boom');
  });

  it('reports a timeout', async () => {
    const { outcome } = await runScript(async (emit) => emit({ type: 'finished', reason: 'timeout', exitCode: -1 }));
    expect(outcome).toBe('timeout');
  });
});
