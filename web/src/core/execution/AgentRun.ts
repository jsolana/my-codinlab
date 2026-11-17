import type { Challenge } from '@/core/challenges/types';
import type { EnvironmentStore } from '@/core/environment/EnvironmentStore';
import type {
  ExecutionAdapter,
  ExecutionEvent,
  ExecutionSession,
  RunRequest,
} from './ExecutionAdapter';

export type RunOutcome =
  | 'completed' // the challenge was solved
  | 'incomplete' // program ended but the challenge is not solved
  | 'compile_error'
  | 'stopped'
  | 'timeout'
  | 'error';

export interface LogLine {
  kind: 'stdout' | 'stderr' | 'info' | 'error' | 'success';
  text: string;
}

export interface RunObserver {
  onLog(line: LogLine): void;
  onFinished(outcome: RunOutcome): void;
}

export interface AgentRunOptions {
  challenge: Challenge;
  store: EnvironmentStore;
  adapter: ExecutionAdapter;
  request: RunRequest;
  observer: RunObserver;
  /** Delay applied after each action so animations are visible. */
  pacingMs: number;
  /** Grace period before stopping the program once the episode is done. */
  stopGraceMs?: number;
}

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/**
 * Connects a running program to an environment: answers `observe`, applies
 * `act` through the challenge's own environment and reports the outcome.
 * Knows nothing about any specific challenge.
 */
export class AgentRun {
  private session: ExecutionSession | null = null;
  // Events can arrive before `adapter.start` resolves; wait for the session first.
  private resolveSession!: (session: ExecutionSession | null) => void;
  private readonly sessionReady = new Promise<ExecutionSession | null>((resolve) => (this.resolveSession = resolve));
  private queue: Promise<void> = Promise.resolve();
  private finished = false;
  private stopRequested = false;
  private episodeDone = false;
  private resolveDone!: (outcome: RunOutcome) => void;
  readonly result = new Promise<RunOutcome>((resolve) => (this.resolveDone = resolve));

  constructor(private readonly options: AgentRunOptions) {}

  async start(): Promise<void> {
    const { adapter, request } = this.options;
    try {
      this.session = await adapter.start(request, (event) => this.enqueue(event));
      this.resolveSession(this.session);
    } catch (error) {
      this.resolveSession(null);
      this.log('error', error instanceof Error ? error.message : String(error));
      this.finish('error');
    }
  }

  async stop(): Promise<void> {
    this.stopRequested = true;
    await this.session?.stop().catch(() => undefined);
  }

  // Events are processed strictly in order, even though handling is async.
  private enqueue(event: ExecutionEvent): void {
    this.queue = this.queue.then(() => this.handle(event)).catch((error: unknown) => {
      this.log('error', error instanceof Error ? error.message : String(error));
    });
  }

  private async handle(event: ExecutionEvent): Promise<void> {
    await this.sessionReady;
    switch (event.type) {
      case 'started':
        this.log('info', 'Program started.');
        return;
      case 'log':
        this.log(event.stream, event.text);
        return;
      case 'compile_error':
        this.log('error', event.output.trimEnd());
        this.finish('compile_error');
        return;
      case 'error':
        this.log('error', event.message);
        if (!this.finished) await this.session?.stop().catch(() => undefined);
        this.finish('error');
        return;
      case 'finished':
        this.finish(this.outcomeFor(event.reason));
        return;
      case 'request':
        await this.answer(event);
        return;
    }
  }

  private async answer(event: Extract<ExecutionEvent, { type: 'request' }>): Promise<void> {
    const { challenge, store, pacingMs } = this.options;
    const { environment } = challenge;
    if (!this.session || this.finished) return;

    if (event.kind === 'observe') {
      await this.session.reply(event.id, store.observe());
      return;
    }

    const parsed = environment.parseAction(event.action);
    if (!parsed.ok) {
      this.log('error', parsed.error);
      await this.session.reply(event.id, {
        observation: store.observe(),
        reward: 0,
        done: false,
        error: parsed.error,
      });
      return;
    }

    const result = store.step(parsed.action);
    if (result.error) this.log('error', result.error);
    else if (result.message) this.log('info', result.message);

    await sleep(pacingMs);
    await this.session.reply(event.id, {
      observation: store.observe(),
      reward: result.reward,
      done: result.done,
      message: result.message ?? '',
      error: result.error ?? '',
      info: result.info ?? null,
    });
    if (result.done && !this.episodeDone) {
      this.episodeDone = true;
      void this.stopAfterGrace();
    }
  }

  private async stopAfterGrace(): Promise<void> {
    await sleep(this.options.stopGraceMs ?? 600);
    if (!this.finished) await this.session?.stop().catch(() => undefined);
  }

  private outcomeFor(reason: Extract<ExecutionEvent, { type: 'finished' }>['reason']): RunOutcome {
    if (this.options.store.isCompleted()) return 'completed';
    if (reason === 'timeout') return 'timeout';
    if (reason === 'stopped' && this.stopRequested) return 'stopped';
    if (reason === 'error') return 'error';
    return 'incomplete';
  }

  private log(kind: LogLine['kind'], text: string): void {
    this.options.observer.onLog({ kind, text });
  }

  private finish(outcome: RunOutcome): void {
    if (this.finished) return;
    this.finished = true;
    this.options.observer.onFinished(outcome);
    this.resolveDone(outcome);
  }
}
