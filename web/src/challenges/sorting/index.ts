import { defineChallenge } from '@/core/challenges/types';
import {
  sortingEnvironment,
  type SortingAction,
  type SortingObservation,
  type SortingState,
} from './environment';
import { sortingInstructions } from './instructions';
import { SortingRenderer } from './Renderer';
import { sortingGoTemplate } from './templates/go';

export const sortingChallenge = defineChallenge<SortingState, SortingAction, SortingObservation>({
  id: 'sorting-visualizer',
  metadata: {
    name: 'Sorting Visualizer',
    summary: 'Sort hidden values using only compare and swap.',
    description:
      'You cannot see the values: you can only compare two positions and swap them. Implement a sorting algorithm on top of that oracle and watch every comparison and swap animate.',
    difficulty: 'Medium',
    concepts: ['Arrays', 'Sorting', 'Comparisons', 'Algorithms'],
    estimatedMinutes: 25,
  },
  instructions: sortingInstructions,
  languages: [{ id: 'go', label: 'Go', template: sortingGoTemplate }],
  environment: sortingEnvironment,
  Renderer: SortingRenderer,
});
