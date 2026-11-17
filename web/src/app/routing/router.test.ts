import { describe, expect, it } from 'vitest';
import { parseRoute } from './router';

describe('parseRoute', () => {
  it('maps the known routes', () => {
    expect(parseRoute('')).toEqual({ name: 'explorer' });
    expect(parseRoute('#/')).toEqual({ name: 'explorer' });
    expect(parseRoute('#/challenge/maze')).toEqual({ name: 'preview', id: 'maze' });
    expect(parseRoute('#/challenge/maze/play')).toEqual({ name: 'playground', id: 'maze' });
  });
  it('falls back to not-found', () => {
    expect(parseRoute('#/nope')).toEqual({ name: 'not-found' });
  });
});
