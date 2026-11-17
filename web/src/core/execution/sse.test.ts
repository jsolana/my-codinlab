import { describe, expect, it } from 'vitest';
import { parseBlock, readSse } from './sse';

describe('sse', () => {
  it('parses a block', () => {
    expect(parseBlock('id: 3\nevent: log\ndata: {"a":1}')).toEqual({ event: 'log', data: '{"a":1}' });
    expect(parseBlock(': keepalive')).toBeNull();
  });

  it('reassembles messages split across chunks', async () => {
    const encoder = new TextEncoder();
    const chunks = ['event: log\nda', 'ta: 1\n\nevent: fini', 'shed\ndata: 2\n\n'];
    const body = new ReadableStream<Uint8Array>({
      start(controller) {
        chunks.forEach((c) => controller.enqueue(encoder.encode(c)));
        controller.close();
      },
    });
    const received: string[] = [];
    for await (const m of readSse(new Response(body), new AbortController().signal)) received.push(`${m.event}:${m.data}`);
    expect(received).toEqual(['log:1', 'finished:2']);
  });
});
