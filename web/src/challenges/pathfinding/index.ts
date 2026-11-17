import { defineChallenge } from '@/core/challenges/types';
import {
  pathfindingEnvironment,
  type PathfindingAction,
  type PathfindingObservation,
  type PathfindingState,
} from './environment';
import { pathfindingInstructions } from './instructions';
import { PathfindingRenderer } from './Renderer';
import { pathfindingGoTemplate } from './templates/go';

export const pathfindingChallenge = defineChallenge<PathfindingState, PathfindingAction, PathfindingObservation>({
  id: 'pathfinding',
  metadata: {
    name: 'Pathfinding',
    summary: 'Traverse a grid graph and return the shortest path.',
    description:
      'Run a real graph traversal: explore and visit cells one by one, then declare the shortest path between two points. Every explored and visited cell is drawn as you go.',
    difficulty: 'Hard',
    concepts: ['Graphs', 'BFS', 'DFS', 'Traversal'],
    estimatedMinutes: 40,
  },
  instructions: pathfindingInstructions,
  languages: [{ id: 'go', label: 'Go', template: pathfindingGoTemplate }],
  environment: pathfindingEnvironment,
  Renderer: PathfindingRenderer,
});
