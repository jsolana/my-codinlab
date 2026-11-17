/**
 * End-to-end: compiles and runs the reference Go solutions on the REAL runner.
 * Enabled with:  RUNNER_URL=http://127.0.0.1:8787 npm test
 */
import { describe, expect, it } from 'vitest';
import { EnvironmentStore } from '@/core/environment/EnvironmentStore';
import { AgentRun, type LogLine } from '@/core/execution/AgentRun';
import { RemoteRunnerAdapter } from '@/core/execution/RemoteRunnerAdapter';
import type { Challenge } from '@/core/challenges/types';
import { mazeChallenge } from './maze';
import { mazeGoSolution } from './maze/solutions/go';
import { pathfindingChallenge } from './pathfinding';
import { pathfindingGoSolution } from './pathfinding/solutions/go';
import { sortingChallenge } from './sorting';
import { sortingGoSolution } from './sorting/solutions/go';

const runnerUrl = process.env.RUNNER_URL;

const cases: [string, Challenge, string][] = [
  ['maze', mazeChallenge, mazeGoSolution],
  ['sorting', sortingChallenge, sortingGoSolution],
  ['pathfinding', pathfindingChallenge, pathfindingGoSolution],
];

describe.skipIf(!runnerUrl)('reference solutions on the real runner', () => {
  it.each(cases)('%s is solved by its Go solution', async (_name, challenge, source) => {
    const store = new EnvironmentStore(challenge);
    const logs: LogLine[] = [];
    const run = new AgentRun({
      challenge,
      store,
      adapter: new RemoteRunnerAdapter(`${runnerUrl}/api`),
      request: { language: 'go', source },
      observer: { onLog: (line) => logs.push(line), onFinished: () => undefined },
      pacingMs: 0,
      stopGraceMs: 200,
    });
    await run.start();
    const outcome = await run.result;
    expect(outcome, logs.map((l) => l.text).join('\n')).toBe('completed');
    expect(store.isCompleted()).toBe(true);
  }, 120_000);

  it('templates compile and run without crashing', async () => {
    for (const challenge of [mazeChallenge, sortingChallenge, pathfindingChallenge]) {
      const store = new EnvironmentStore(challenge);
      const logs: LogLine[] = [];
      const run = new AgentRun({
        challenge,
        store,
        adapter: new RemoteRunnerAdapter(`${runnerUrl}/api`),
        request: { language: 'go', source: challenge.languages[0]!.template },
        observer: { onLog: (line) => logs.push(line), onFinished: () => undefined },
        pacingMs: 0,
        stopGraceMs: 200,
      });
      await run.start();
      const outcome = await run.result;
      expect(['incomplete', 'completed'], logs.map((l) => l.text).join('\n')).toContain(outcome);
    }
  }, 180_000);
});
