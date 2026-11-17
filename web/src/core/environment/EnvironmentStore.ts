import type { Challenge, StepResult } from '@/core/challenges/types';

export type Listener = () => void;

/**
 * Holds the immutable state of ONE environment instance and notifies React
 * (via useSyncExternalStore) on every transition.
 */
export class EnvironmentStore {
  private state: unknown;
  private steps = 0;
  private readonly listeners = new Set<Listener>();

  constructor(private readonly challenge: Challenge) {
    this.state = challenge.environment.reset();
  }

  readonly subscribe = (listener: Listener): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  readonly getState = (): unknown => this.state;
  readonly getSteps = (): number => this.steps;

  isCompleted(): boolean {
    return this.challenge.environment.isCompleted(this.state);
  }

  observe(): unknown {
    return this.challenge.environment.observe(this.state);
  }

  /** Applies an already-parsed action and publishes the new state. */
  step(action: unknown): StepResult<unknown> {
    const result = this.challenge.environment.step(this.state, action);
    this.state = result.state;
    this.steps += 1;
    this.emit();
    return result;
  }

  reset(): void {
    this.state = this.challenge.environment.reset();
    this.steps = 0;
    this.emit();
  }

  private emit(): void {
    this.listeners.forEach((listener) => listener());
  }
}
