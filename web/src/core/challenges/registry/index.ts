import { mazeChallenge } from '@/challenges/maze';
import { pathfindingChallenge } from '@/challenges/pathfinding';
import { sortingChallenge } from '@/challenges/sorting';
import type { Challenge } from '../types';

/** The single place to touch when adding a challenge. */
export const challengeRegistry: readonly Challenge[] = [
  mazeChallenge,
  sortingChallenge,
  pathfindingChallenge,
];

export function getChallenge(id: string): Challenge | undefined {
  return challengeRegistry.find((challenge) => challenge.id === id);
}
