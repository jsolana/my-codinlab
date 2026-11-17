import { describe, expect, it } from 'vitest';
import { challengeRegistry, getChallenge } from './index';

describe('challenge registry', () => {
  it('has unique ids and resolves them', () => {
    const ids = challengeRegistry.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(getChallenge(id)?.id).toBe(id);
    expect(getChallenge('nope')).toBeUndefined();
  });

  it('gives every challenge at least one language with a template', () => {
    for (const challenge of challengeRegistry) {
      expect(challenge.languages.length).toBeGreaterThan(0);
      for (const language of challenge.languages) expect(language.template.trim()).not.toBe('');
    }
  });

  it('starts from a fresh, independent state each reset()', () => {
    for (const challenge of challengeRegistry) {
      const a = challenge.environment.reset();
      const b = challenge.environment.reset();
      expect(a).toEqual(b);
      expect(a).not.toBe(b);
      expect(challenge.environment.isCompleted(a)).toBe(false);
    }
  });
});
