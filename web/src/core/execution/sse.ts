export interface SseMessage {
  event: string;
  data: string;
}

/** Parses a Server-Sent Events byte stream (fetch-based: works in browsers and Node). */
export async function* readSse(response: Response, signal: AbortSignal): AsyncGenerator<SseMessage> {
  if (!response.body) throw new Error('Response has no body');
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  const abort = () => void reader.cancel();
  signal.addEventListener('abort', abort);
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) return;
      buffer += decoder.decode(value, { stream: true });
      let boundary = buffer.indexOf('\n\n');
      while (boundary !== -1) {
        const message = parseBlock(buffer.slice(0, boundary));
        buffer = buffer.slice(boundary + 2);
        if (message) yield message;
        boundary = buffer.indexOf('\n\n');
      }
    }
  } finally {
    signal.removeEventListener('abort', abort);
  }
}

export function parseBlock(block: string): SseMessage | null {
  let event = 'message';
  const data: string[] = [];
  for (const line of block.split('\n')) {
    if (line.startsWith('event:')) event = line.slice(6).trim();
    else if (line.startsWith('data:')) data.push(line.slice(5).trimStart());
  }
  return data.length > 0 ? { event, data: data.join('\n') } : null;
}
