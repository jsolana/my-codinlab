import { describe, expect, it } from 'vitest';
import type { Challenge } from '@/core/challenges/types';
import { mazeChallenge } from './maze';
import { pathfindingChallenge } from './pathfinding';
import { sortingChallenge } from './sorting';

/** Drives a challenge exactly like a running program would: raw JSON in, steps out. */
function play(challenge: Challenge) {
  const { environment } = challenge;
  let state = environment.reset();
  return {
    get state() {
      return state;
    },
    act(raw: unknown) {
      const parsed = environment.parseAction(raw);
      if (!parsed.ok) return { parseError: parsed.error } as const;
      const result = environment.step(state, parsed.action);
      state = result.state;
      return result;
    },
    observe: () => environment.observe(state) as Record<string, unknown>,
    completed: () => environment.isCompleted(state),
  };
}

describe('maze', () => {
  it('rejects malformed actions and walls without changing position', () => {
    const game = play(mazeChallenge);
    expect(game.act({ move: 'JUMP' })).toHaveProperty('parseError');
    const before = game.observe().position;
    const result = game.act({ move: 'UP' });
    expect('error' in result && result.error).toMatch(/Blocked/);
    expect(game.observe().position).toEqual(before);
  });

  it('is solvable by BFS using only observe/act', () => {
    const game = play(mazeChallenge);
    const obs = game.observe() as { grid: string[]; position: { x: number; y: number }; goal: { x: number; y: number } };
    const moves = { UP: [0, -1], DOWN: [0, 1], LEFT: [-1, 0], RIGHT: [1, 0] } as const;
    const key = (x: number, y: number) => `${x},${y}`;
    const came = new Map<string, { from: string; move: keyof typeof moves } | null>([[key(obs.position.x, obs.position.y), null]]);
    const queue = [obs.position];
    for (let head = 0; head < queue.length; head++) {
      const cur = queue[head]!;
      for (const [move, [dx, dy]] of Object.entries(moves) as [keyof typeof moves, readonly [number, number]][]) {
        const next = { x: cur.x + dx, y: cur.y + dy };
        if (obs.grid[next.y]![next.x] === '#' || came.has(key(next.x, next.y))) continue;
        came.set(key(next.x, next.y), { from: key(cur.x, cur.y), move });
        queue.push(next);
      }
    }
    const path: string[] = [];
    for (let at = key(obs.goal.x, obs.goal.y); came.get(at); at = came.get(at)!.from) path.unshift(came.get(at)!.move);
    expect(path.length).toBeGreaterThan(0);
    path.forEach((move) => game.act({ move }));
    expect(game.completed()).toBe(true);
  });
});

describe('sorting', () => {
  it('hides values and answers compare through info', () => {
    const game = play(sortingChallenge);
    expect(game.observe()).not.toHaveProperty('values');
    const result = game.act({ type: 'compare', i: 0, j: 1 });
    expect('info' in result && result.info).toEqual({ result: 1 }); // 7 > 3
  });

  it('refuses to finish unsorted, accepts once sorted', () => {
    const game = play(sortingChallenge);
    expect('error' in game.act({ type: 'finish' }) && true).toBe(true);
    expect(game.completed()).toBe(false);
    const length = game.observe().length as number;
    for (let i = 1; i < length; i++) {
      for (let j = i; j > 0; j--) {
        const cmp = game.act({ type: 'compare', i: j - 1, j }) as { info: { result: number } };
        if (cmp.info.result <= 0) break;
        game.act({ type: 'swap', i: j - 1, j });
      }
    }
    game.act({ type: 'finish' });
    expect(game.completed()).toBe(true);
  });

  it('reports out-of-range indices as errors', () => {
    const result = play(sortingChallenge).act({ type: 'swap', i: 0, j: 99 });
    expect('error' in result && result.error).toMatch(/out of range/);
  });
});

describe('pathfinding', () => {
  const cell = (x: number, y: number) => ({ x, y });

  it('enforces explore/visit rules', () => {
    const game = play(pathfindingChallenge);
    expect('error' in game.act({ type: 'explore', cell: cell(1, 0) }) && true).toBe(true); // nothing visited yet
    game.act({ type: 'visit', cell: cell(0, 0) });
    expect('error' in game.act({ type: 'explore', cell: cell(3, 0) }) && true).toBe(true); // obstacle
    expect('error' in game.act({ type: 'explore', cell: cell(1, 0) }) && false).toBe(false);
    expect(game.observe().discovered).toHaveLength(2);
  });

  it('rejects non-shortest paths and accepts BFS paths', () => {
    const game = play(pathfindingChallenge);
    const obs = game.observe() as { grid: string[]; start: { x: number; y: number }; end: { x: number; y: number } };
    const key = (c: { x: number; y: number }) => `${c.x},${c.y}`;
    const parent = new Map<string, { x: number; y: number }>();
    const seen = new Set([key(obs.start)]);
    const queue = [obs.start];
    for (let head = 0; head < queue.length; head++) {
      const cur = queue[head]!;
      game.act({ type: 'visit', cell: cur });
      for (const [dx, dy] of [[0, -1], [0, 1], [-1, 0], [1, 0]] as const) {
        const next = cell(cur.x + dx, cur.y + dy);
        if (obs.grid[next.y]?.[next.x] === undefined || obs.grid[next.y]![next.x] === '#' || seen.has(key(next))) continue;
        seen.add(key(next));
        parent.set(key(next), cur);
        game.act({ type: 'explore', cell: next });
        queue.push(next);
      }
    }
    const path = [obs.end];
    while (key(path[0]!) !== key(obs.start)) path.unshift(parent.get(key(path[0]!))!);

    expect('error' in game.act({ type: 'finish' }) && true).toBe(true); // no path yet
    const detour = game.act({ type: 'set_path', cells: [obs.start, ...path.slice(0, 0)] });
    expect('error' in detour && detour.error).toMatch(/must end/);

    expect('error' in game.act({ type: 'set_path', cells: path }) && false).toBe(false);
    game.act({ type: 'finish' });
    expect(game.completed()).toBe(true);
  });
});
