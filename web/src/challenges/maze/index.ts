import { defineChallenge } from '@/core/challenges/types';
import { mazeEnvironment, type MazeAction, type MazeObservation, type MazeState } from './environment';
import { mazeInstructions } from './instructions';
import { MazeRenderer } from './Renderer';
import { mazeGoTemplate } from './templates/go';

export const mazeChallenge = defineChallenge<MazeState, MazeAction, MazeObservation>({
  id: 'maze-runner',
  metadata: {
    name: 'Maze Runner',
    summary: 'Guide a runner through a maze to the goal.',
    description:
      'A classic grid maze. Read the map, plan a route and send one move at a time. A perfect first contact with coordinates, matrices and graph search.',
    difficulty: 'Easy',
    concepts: ['Matrices', 'Coordinates', 'Control flow', 'Search'],
    estimatedMinutes: 15,
  },
  instructions: mazeInstructions,
  languages: [{ id: 'go', label: 'Go', template: mazeGoTemplate }],
  environment: mazeEnvironment,
  Renderer: MazeRenderer,
});
