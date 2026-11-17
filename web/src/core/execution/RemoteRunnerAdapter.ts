import type {
  ExecutionAdapter,
  ExecutionEvent,
  ExecutionEventHandler,
  ExecutionSession,
  RunRequest,
} from './ExecutionAdapter';
import { readSse } from './sse';

const EVENT_TYPES = new Set(['started', 'request', 'log', 'compile_error', 'error', 'finished']);

/** Talks to the Go runner over REST + Server-Sent Events. */
export class RemoteRunnerAdapter implements ExecutionAdapter {
  constructor(private readonly baseUrl = '/api') {}

  async listLanguages(): Promise<string[]> {
    const response = await fetch(`${this.baseUrl}/runtimes`);
    if (!response.ok) throw new Error(`Runner unavailable (${response.status})`);
    const body = (await response.json()) as { languages: string[] };
    return body.languages;
  }

  async start(request: RunRequest, onEvent: ExecutionEventHandler): Promise<ExecutionSession> {
    const response = await fetch(`${this.baseUrl}/sessions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });
    if (!response.ok) throw new Error(await errorMessage(response));
    const { id } = (await response.json()) as { id: string };

    const abort = new AbortController();
    void this.pump(id, onEvent, abort);

    return {
      reply: async (requestId, data) => {
        const res = await fetch(`${this.baseUrl}/sessions/${id}/replies`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ requestId, data }),
        });
        if (!res.ok) throw new Error(await errorMessage(res));
      },
      stop: async () => {
        await fetch(`${this.baseUrl}/sessions/${id}`, { method: 'DELETE' });
      },
    };
  }

  private async pump(id: string, onEvent: ExecutionEventHandler, abort: AbortController): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/sessions/${id}/events`, { signal: abort.signal });
      if (!response.ok) throw new Error(await errorMessage(response));
      for await (const message of readSse(response, abort.signal)) {
        if (!EVENT_TYPES.has(message.event)) continue;
        const payload = JSON.parse(message.data) as Record<string, unknown>;
        onEvent({ ...payload, type: message.event } as ExecutionEvent);
      }
    } catch (error) {
      if (!abort.signal.aborted) {
        onEvent({ type: 'error', message: error instanceof Error ? error.message : String(error) });
      }
    }
  }
}

async function errorMessage(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as { error?: string };
    return body.error ?? `Request failed (${response.status})`;
  } catch {
    return `Request failed (${response.status})`;
  }
}
