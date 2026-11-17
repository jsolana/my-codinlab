import type { ChallengeInstructions } from '@/core/challenges/types';

export const pathfindingInstructions: ChallengeInstructions = {
  objective: 'Find the SHORTEST path from the start (blue) to the end (amber), avoiding obstacles.',
  rules: [
    'Traversal is explicit: visit a cell, explore its neighbors, repeat (BFS/DFS/A*).',
    'explore(cell) discovers a free cell that is adjacent to a visited cell.',
    'visit(cell) visits a cell that was already explored. The start cell is explored from the beginning.',
    'set_path(cells) declares the path from start to end. Every cell must have been explored.',
    'finish succeeds only if the declared path is the shortest one.',
  ],
  constraints: ['Movement is 4-directional (no diagonals).', 'Invalid actions are rejected and cost reward.'],
  api: [
    'observe → { grid, start, end, discovered, visited, path } (cells are {x,y})',
    'act    → {"type":"explore","cell":{"x":1,"y":0}} | {"type":"visit","cell":{...}}',
    '         {"type":"set_path","cells":[{...},...]} | {"type":"finish"}',
    'step   → { observation, reward, done, message, error }',
  ],
};
