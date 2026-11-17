import type { ChallengeInstructions } from '@/core/challenges/types';

export const sortingInstructions: ChallengeInstructions = {
  objective: 'Sort the bars in ascending order, left to right, then call finish.',
  rules: [
    'The values are hidden. The only way to learn the order of two bars is to compare them.',
    'compare(i, j) answers -1 if bar i is smaller, 0 if equal, 1 if bar i is larger.',
    'swap(i, j) exchanges the two bars.',
    'finish is accepted only when the bars are sorted.',
  ],
  constraints: ['Indices are 0-based and must be within the collection length.'],
  api: [
    'observe → { length, comparisons, swaps }',
    'act    → {"type":"compare","i":0,"j":1} | {"type":"swap","i":0,"j":1} | {"type":"finish"}',
    'step   → compare answers in info: { "result": -1 | 0 | 1 }',
  ],
};
