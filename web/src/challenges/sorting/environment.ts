import type { Environment, ParseResult, StepResult } from '@/core/challenges/types';

export interface Bar {
  id: number; // stable identity so the renderer can animate swaps
  value: number;
}
export type SortingAction =
  | { type: 'compare'; i: number; j: number }
  | { type: 'swap'; i: number; j: number }
  | { type: 'finish' };

export interface SortingState {
  bars: readonly Bar[];
  comparing: readonly [number, number] | null;
  swapped: readonly [number, number] | null;
  comparisons: number;
  swaps: number;
  finished: boolean;
}
/** Values are hidden on purpose: the agent can only learn order via `compare`. */
export interface SortingObservation {
  length: number;
  comparisons: number;
  swaps: number;
}

const INITIAL_VALUES = [7, 3, 11, 1, 14, 5, 9, 2, 13, 6, 10, 4, 12, 8];

function isSorted(bars: readonly Bar[]): boolean {
  return bars.every((bar, index) => index === 0 || bars[index - 1]!.value <= bar.value);
}

const isIndex = (value: unknown): value is number => typeof value === 'number' && Number.isInteger(value);

export const sortingEnvironment: Environment<SortingState, SortingAction, SortingObservation> = {
  reset() {
    return {
      bars: INITIAL_VALUES.map((value, id) => ({ id, value })),
      comparing: null,
      swapped: null,
      comparisons: 0,
      swaps: 0,
      finished: false,
    };
  },

  observe: ({ bars, comparisons, swaps }) => ({ length: bars.length, comparisons, swaps }),

  parseAction(raw: unknown): ParseResult<SortingAction> {
    const action = raw as { type?: unknown; i?: unknown; j?: unknown } | null;
    if (action?.type === 'finish') return { ok: true, action: { type: 'finish' } };
    if ((action?.type === 'compare' || action?.type === 'swap') && isIndex(action.i) && isIndex(action.j)) {
      return { ok: true, action: { type: action.type, i: action.i, j: action.j } };
    }
    return {
      ok: false,
      error: 'Invalid action. Expected {"type":"compare"|"swap","i":n,"j":n} or {"type":"finish"}.',
    };
  },

  step(state, action): StepResult<SortingState> {
    if (state.finished) return { state, reward: 0, done: true, error: 'Already finished.' };

    if (action.type === 'finish') {
      if (!isSorted(state.bars)) {
        return { state, reward: -5, done: false, error: 'The collection is not sorted yet.' };
      }
      return {
        state: { ...state, finished: true, comparing: null, swapped: null },
        reward: 100,
        done: true,
        message: `Sorted with ${state.comparisons} comparisons and ${state.swaps} swaps.`,
      };
    }

    const { i, j } = action;
    const inRange = (n: number) => n >= 0 && n < state.bars.length;
    if (!inRange(i) || !inRange(j)) {
      return { state, reward: -1, done: false, error: `Indices out of range (0..${state.bars.length - 1}).` };
    }

    if (action.type === 'compare') {
      const diff = state.bars[i]!.value - state.bars[j]!.value;
      return {
        state: { ...state, comparing: [i, j], swapped: null, comparisons: state.comparisons + 1 },
        reward: -0.01,
        done: false,
        info: { result: Math.sign(diff) }, // -1: i<j, 0: equal, 1: i>j
      };
    }

    const bars = [...state.bars];
    [bars[i], bars[j]] = [bars[j]!, bars[i]!];
    return {
      state: { ...state, bars, comparing: null, swapped: [i, j], swaps: state.swaps + 1 },
      reward: -0.02,
      done: false,
    };
  },

  isCompleted: (state) => state.finished,
};
