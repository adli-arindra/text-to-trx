import { describe, expect, it } from 'vitest';
import { matchName } from '../../src/pipeline/match/names';
import type { KnownName } from '../../src/types';

const knownNames: KnownName[] = [
  { name: 'Coffee', categoryId: 'food', count: 12 },
  { name: 'Uber', categoryId: 'transport', count: 40 },
  { name: 'Uber', categoryId: 'food', count: 3 },
  { name: 'Netflix', categoryId: 'subscriptions', count: 8 },
];

describe('matchName', () => {
  it('returns null for an empty candidate', () => {
    expect(matchName('', knownNames)).toBeNull();
  });

  it('returns null when there are no known names', () => {
    expect(matchName('coffee', [])).toBeNull();
  });

  it('matches an exact name with high confidence', () => {
    const result = matchName('coffee', knownNames);
    expect(result).toEqual({ name: 'Coffee', categoryId: 'food', confidence: 1 });
  });

  it('matches a name with a typo', () => {
    const result = matchName('cofee', knownNames);
    expect(result?.name).toBe('Coffee');
    expect(result?.confidence).toBeGreaterThan(0.5);
  });

  it('picks the highest-count category when a name has conflicting categories', () => {
    const result = matchName('uber', knownNames);
    expect(result).toEqual({ name: 'Uber', categoryId: 'transport', confidence: 1 });
  });

  it('returns null for a candidate unrelated to any known name', () => {
    expect(matchName('zzz completely unrelated', knownNames)).toBeNull();
  });
});
