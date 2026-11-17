import type { Environment, ParseResult, StepResult } from '@/core/challenges/types';

export type Direction = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';
export interface Point {
  x: number;
  y: number;
}
export interface MazeAction {
  move: Direction;
}
export interface MazeState {
  grid: readonly string[]; // '#' wall, '.' floor
  position: Point;
  goal: Point;
  steps: number;
  blockedAt: Point | null;
}
export interface MazeObservation {
  grid: readonly string[];
  position: Point;
  goal: Point;
  steps: number;
}

export const MAZE_GRID: readonly string[] = [
  '###############',
  '#S..#.....#...#',
  '#.#.#.###.#.#.#',
  '#.#...#...#.#.#',
  '#.#####.###.#.#',
  '#.....#.....#.#',
  '#####.#####.#.#',
  '#.....#...#.#.#',
  '#.#####.#.#.#.#',
  '#.......#...#G#',
  '###############',
];

const DELTAS: Record<Direction, Point> = {
  UP: { x: 0, y: -1 },
  DOWN: { x: 0, y: 1 },
  LEFT: { x: -1, y: 0 },
  RIGHT: { x: 1, y: 0 },
};

const DIRECTIONS = Object.keys(DELTAS) as Direction[];

function findCell(grid: readonly string[], marker: string): Point {
  for (let y = 0; y < grid.length; y++) {
    const x = grid[y]!.indexOf(marker);
    if (x !== -1) return { x, y };
  }
  throw new Error(`Marker ${marker} not found in maze`);
}

function isFloor(grid: readonly string[], { x, y }: Point): boolean {
  const cell = grid[y]?.[x];
  return cell !== undefined && cell !== '#';
}

function reachedGoal({ position, goal }: MazeState): boolean {
  return position.x === goal.x && position.y === goal.y;
}

export const mazeEnvironment: Environment<MazeState, MazeAction, MazeObservation> = {
  reset() {
    return {
      grid: MAZE_GRID.map((row) => row.replace('S', '.').replace('G', '.')),
      position: findCell(MAZE_GRID, 'S'),
      goal: findCell(MAZE_GRID, 'G'),
      steps: 0,
      blockedAt: null,
    };
  },

  observe({ grid, position, goal, steps }) {
    return { grid, position, goal, steps };
  },

  parseAction(raw: unknown): ParseResult<MazeAction> {
    const move = (raw as { move?: unknown } | null)?.move;
    if (typeof move === 'string' && (DIRECTIONS as string[]).includes(move)) {
      return { ok: true, action: { move: move as Direction } };
    }
    return { ok: false, error: `Invalid action. Expected {"move": ${DIRECTIONS.join(' | ')}}.` };
  },

  step(state, action): StepResult<MazeState> {
    if (reachedGoal(state)) {
      return { state, reward: 0, done: true, error: 'The goal was already reached.' };
    }
    const delta = DELTAS[action.move];
    const target = { x: state.position.x + delta.x, y: state.position.y + delta.y };

    if (!isFloor(state.grid, target)) {
      return {
        state: { ...state, steps: state.steps + 1, blockedAt: target },
        reward: -1,
        done: false,
        error: `Blocked: there is a wall ${action.move} of (${state.position.x}, ${state.position.y}).`,
      };
    }
    const next: MazeState = { ...state, position: target, steps: state.steps + 1, blockedAt: null };
    const reached = reachedGoal(next);
    return {
      state: next,
      reward: reached ? 100 : -0.1,
      done: reached,
      message: reached ? `Goal reached in ${next.steps} steps!` : undefined,
    };
  },

  isCompleted: reachedGoal,
};
