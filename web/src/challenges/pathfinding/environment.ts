import type { Environment, ParseResult, StepResult } from '@/core/challenges/types';

export interface Cell {
  x: number;
  y: number;
}
export type PathfindingAction =
  | { type: 'explore'; cell: Cell }
  | { type: 'visit'; cell: Cell }
  | { type: 'set_path'; cells: Cell[] }
  | { type: 'finish' };

export interface PathfindingState {
  grid: readonly string[]; // '#' obstacle, '.' free
  start: Cell;
  end: Cell;
  discovered: readonly Cell[]; // known cells (the "frontier" plus visited ones)
  visited: readonly Cell[];
  path: readonly Cell[];
  finished: boolean;
}
export type PathfindingObservation = Omit<PathfindingState, 'finished'>;

export const PATHFINDING_GRID: readonly string[] = [
  'S..#.....#.....',
  '.#.#.###.#.###.',
  '.#...#...#...#.',
  '.#####.#####.#.',
  '.....#.....#.#.',
  '.###.#####.#.#.',
  '.#...#...#...#.',
  '.#.###.#.#####.',
  '.#.....#......E',
];

const NEIGHBORS: readonly Cell[] = [
  { x: 0, y: -1 },
  { x: 0, y: 1 },
  { x: -1, y: 0 },
  { x: 1, y: 0 },
];

const key = ({ x, y }: Cell) => `${x},${y}`;
const sameCell = (a: Cell, b: Cell) => a.x === b.x && a.y === b.y;
const isAdjacent = (a: Cell, b: Cell) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y) === 1;
const contains = (cells: readonly Cell[], cell: Cell) => cells.some((c) => sameCell(c, cell));
const fmt = ({ x, y }: Cell) => `(${x}, ${y})`;

function isPassable(grid: readonly string[], { x, y }: Cell): boolean {
  const char = grid[y]?.[x];
  return char !== undefined && char !== '#';
}

function findCell(grid: readonly string[], marker: string): Cell {
  for (let y = 0; y < grid.length; y++) {
    const x = grid[y]!.indexOf(marker);
    if (x !== -1) return { x, y };
  }
  throw new Error(`Marker ${marker} not found in grid`);
}

/** Number of cells in the shortest path (BFS), or null when unreachable. */
export function shortestPathLength(grid: readonly string[], start: Cell, end: Cell): number | null {
  const distance = new Map<string, number>([[key(start), 1]]);
  const queue: Cell[] = [start];
  for (let head = 0; head < queue.length; head++) {
    const current = queue[head]!;
    if (sameCell(current, end)) return distance.get(key(current))!;
    for (const delta of NEIGHBORS) {
      const next = { x: current.x + delta.x, y: current.y + delta.y };
      if (!isPassable(grid, next) || distance.has(key(next))) continue;
      distance.set(key(next), distance.get(key(current))! + 1);
      queue.push(next);
    }
  }
  return null;
}

function parseCell(raw: unknown): Cell | null {
  const cell = raw as { x?: unknown; y?: unknown } | null;
  return Number.isInteger(cell?.x) && Number.isInteger(cell?.y) ? { x: cell!.x as number, y: cell!.y as number } : null;
}

function reject(state: PathfindingState, error: string): StepResult<PathfindingState> {
  return { state, reward: -1, done: false, error };
}

function validatePath(state: PathfindingState, cells: readonly Cell[]): string | null {
  const first = cells[0];
  const last = cells[cells.length - 1];
  if (!first || !last) return 'The path is empty.';
  if (!sameCell(first, state.start)) return `The path must start at ${fmt(state.start)}.`;
  if (!sameCell(last, state.end)) return `The path must end at ${fmt(state.end)}.`;
  for (let i = 0; i < cells.length; i++) {
    const cell = cells[i]!;
    if (!isPassable(state.grid, cell)) return `${fmt(cell)} is an obstacle or outside the grid.`;
    if (!contains(state.discovered, cell)) return `${fmt(cell)} was never explored.`;
    if (i > 0 && !isAdjacent(cells[i - 1]!, cell)) return `${fmt(cells[i - 1]!)} and ${fmt(cell)} are not adjacent.`;
  }
  return null;
}

export const pathfindingEnvironment: Environment<PathfindingState, PathfindingAction, PathfindingObservation> = {
  reset() {
    const start = findCell(PATHFINDING_GRID, 'S');
    return {
      grid: PATHFINDING_GRID.map((row) => row.replace('S', '.').replace('E', '.')),
      start,
      end: findCell(PATHFINDING_GRID, 'E'),
      discovered: [start],
      visited: [],
      path: [],
      finished: false,
    };
  },

  observe: ({ finished: _finished, ...observation }) => observation,

  parseAction(raw: unknown): ParseResult<PathfindingAction> {
    const action = raw as { type?: unknown; cell?: unknown; cells?: unknown } | null;
    switch (action?.type) {
      case 'finish':
        return { ok: true, action: { type: 'finish' } };
      case 'explore':
      case 'visit': {
        const cell = parseCell(action.cell);
        return cell
          ? { ok: true, action: { type: action.type, cell } }
          : { ok: false, error: `"${action.type}" needs {"cell": {"x": n, "y": n}}.` };
      }
      case 'set_path': {
        const cells = Array.isArray(action.cells) ? action.cells.map(parseCell) : null;
        return cells && cells.every((c): c is Cell => c !== null)
          ? { ok: true, action: { type: 'set_path', cells } }
          : { ok: false, error: '"set_path" needs {"cells": [{"x": n, "y": n}, ...]}.' };
      }
      default:
        return { ok: false, error: 'Unknown action. Use explore, visit, set_path or finish.' };
    }
  },

  step(state, action): StepResult<PathfindingState> {
    if (state.finished) return { state, reward: 0, done: true, error: 'Already finished.' };

    switch (action.type) {
      case 'explore': {
        const { cell } = action;
        if (!isPassable(state.grid, cell)) return reject(state, `${fmt(cell)} is an obstacle or outside the grid.`);
        if (contains(state.discovered, cell)) return reject(state, `${fmt(cell)} is already explored.`);
        if (!state.visited.some((v) => isAdjacent(v, cell))) {
          return reject(state, `${fmt(cell)} is not adjacent to any visited cell.`);
        }
        return { state: { ...state, discovered: [...state.discovered, cell] }, reward: -0.01, done: false };
      }
      case 'visit': {
        const { cell } = action;
        if (!contains(state.discovered, cell)) return reject(state, `${fmt(cell)} has not been explored yet.`);
        if (contains(state.visited, cell)) return reject(state, `${fmt(cell)} was already visited.`);
        return { state: { ...state, visited: [...state.visited, cell] }, reward: -0.01, done: false };
      }
      case 'set_path': {
        const error = validatePath(state, action.cells);
        if (error) return reject(state, error);
        return { state: { ...state, path: action.cells }, reward: 1, done: false, message: `Path set (${action.cells.length} cells).` };
      }
      case 'finish': {
        if (state.path.length === 0) return reject(state, 'Set a path before finishing.');
        const shortest = shortestPathLength(state.grid, state.start, state.end);
        if (shortest !== state.path.length) {
          return reject(state, `The path has ${state.path.length} cells but the shortest has ${shortest}.`);
        }
        return {
          state: { ...state, finished: true },
          reward: 100,
          done: true,
          message: `Shortest path found (${shortest} cells, ${state.visited.length} visited).`,
        };
      }
    }
  },

  isCompleted: (state) => state.finished,
};
