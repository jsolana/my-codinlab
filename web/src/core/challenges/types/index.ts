import type { ComponentType } from 'react';

export type Difficulty = 'Easy' | 'Medium' | 'Hard';

export interface ChallengeMetadata {
  name: string;
  summary: string;
  description: string;
  difficulty: Difficulty;
  concepts: string[];
  estimatedMinutes: number;
}

export interface ChallengeInstructions {
  objective: string;
  rules: string[];
  constraints: string[];
  /** Describes what `observe` returns and which actions exist, per challenge. */
  api: string[];
}

export interface LanguageDefinition {
  /** Matches a runtime id served by the runner (e.g. "go"). */
  id: string;
  label: string;
  template: string;
}

/** Outcome of applying one action. Invalid actions are values, not exceptions. */
export interface StepResult<S> {
  state: S;
  reward: number;
  done: boolean;
  message?: string;
  error?: string;
  /** Challenge-specific extra data returned to the agent (e.g. a comparison). */
  info?: unknown;
}

export type ParseResult<A> = { ok: true; action: A } | { ok: false; error: string };

/**
 * Gymnasium-like environment. All functions are pure: they never mutate the
 * state they receive, so React can always detect changes.
 */
export interface Environment<S, A, O> {
  reset(): S;
  /** What the running program is allowed to see. */
  observe(state: S): O;
  /** Validates untrusted JSON coming from the user program. */
  parseAction(raw: unknown): ParseResult<A>;
  step(state: S, action: A): StepResult<S>;
  isCompleted(state: S): boolean;
}

export interface ChallengeDefinition<S, A, O> {
  id: string;
  metadata: ChallengeMetadata;
  instructions: ChallengeInstructions;
  languages: LanguageDefinition[];
  environment: Environment<S, A, O>;
  /** Fully owns how the state is drawn. Must scale to its container. */
  Renderer: ComponentType<{ state: S }>;
}

/** Type-erased challenge: all the platform ever sees. */
export type Challenge = ChallengeDefinition<unknown, unknown, unknown>;

/**
 * Erases the generics of a concrete challenge. This is the single place where
 * the platform's type-erasure cast happens.
 */
export function defineChallenge<S, A, O>(definition: ChallengeDefinition<S, A, O>): Challenge {
  return definition as unknown as Challenge;
}
