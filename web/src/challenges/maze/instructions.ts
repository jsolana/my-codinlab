import type { ChallengeInstructions } from '@/core/challenges/types';

export const mazeInstructions: ChallengeInstructions = {
  objective: 'Guide the runner from the start cell to the goal (green diamond).',
  rules: [
    'The runner moves one cell per action: UP, DOWN, LEFT or RIGHT.',
    'Walls block movement. Walking into one costs a step and changes nothing else.',
    'The challenge is solved the moment the runner stands on the goal.',
  ],
  constraints: ['The maze is fixed, but your program should read it from the observation.'],
  api: [
    'observe → { grid: string[], position: {x,y}, goal: {x,y}, steps }. "#" is a wall, "." is floor.',
    'act    → {"move": "UP" | "DOWN" | "LEFT" | "RIGHT"}',
    'step   → { observation, reward, done, message, error }',
  ],
};
