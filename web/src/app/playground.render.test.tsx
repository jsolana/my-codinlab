// @vitest-environment jsdom
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { describe, expect, it, vi } from 'vitest';
import { ExecutionProvider } from '@/core/execution/ExecutionContext';
import type { ExecutionAdapter } from '@/core/execution/ExecutionAdapter';
import { challengeRegistry } from '@/core/challenges/registry';
import { ChallengePlayground } from './pages/ChallengePlayground/ChallengePlayground';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const ACTIONS: Record<string, unknown[]> = {
  'maze-runner': [{ move: 'DOWN' }, { move: 'UP' }, { move: 'UP' }, { move: 'LEFT' }],
  'sorting-visualizer': [{ type: 'compare', i: 0, j: 1 }, { type: 'swap', i: 0, j: 1 }, { type: 'finish' }],
  pathfinding: [
    { type: 'visit', cell: { x: 0, y: 0 } },
    { type: 'explore', cell: { x: 1, y: 0 } },
    { type: 'set_path', cells: [{ x: 0, y: 0 }, { x: 1, y: 0 }] },
  ],
};

const adapterFor = (id: string): ExecutionAdapter => ({
  listLanguages: async () => ['go'],
  start: async (_req, onEvent) => {
    const actions = ACTIONS[id] ?? [];
    let next = 0;
    const emitNext = () => {
      if (next < actions.length) onEvent({ type: 'request', id: String(next + 1), kind: 'act', action: actions[next++] });
      else onEvent({ type: 'log', stream: 'stdout', text: 'bye' });
    };
    queueMicrotask(() => {
      onEvent({ type: 'started' });
      onEvent({ type: 'request', id: '0', kind: 'observe' });
    });
    return { reply: async () => void setTimeout(emitNext, 0), stop: async () => undefined };
  },
});

describe('playground render', () => {
  it.each(challengeRegistry.map((c) => [c.id, c] as const))('%s renders and survives Run', async (_id, challenge) => {
    // React reports effect/render misuse through console.error (e.g. effects returning a non-function).
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const container = document.createElement('div');
    document.body.append(container);
    const root = createRoot(container);
    await act(async () => {
      root.render(
        <ExecutionProvider adapter={adapterFor(challenge.id)}>
          <ChallengePlayground challenge={challenge} />
        </ExecutionProvider>,
      );
    });
    expect(container.textContent).toContain(challenge.metadata.name);
    const run = [...container.querySelectorAll('button')].find((b) => b.textContent?.includes('Run'))!;
    await act(async () => run.click());
    expect(container.textContent).toContain(challenge.metadata.name);
    await act(async () => void (await new Promise((r) => setTimeout(r, 1500))));
    expect(container.textContent).toContain(challenge.metadata.name);
    expect(container.textContent).toContain('bye');
    await act(async () => root.unmount());
    expect(consoleError.mock.calls).toEqual([]);
    consoleError.mockRestore();
  });
});
