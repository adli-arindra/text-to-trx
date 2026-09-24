import { describe, expect, it } from 'vitest';
import {
  levenshteinDistance,
  levenshteinSimilarity,
  similarity,
  tokenSimilarity,
} from '../../src/pipeline/match/similarity';

describe('levenshteinDistance', () => {
  it('returns 0 for identical strings', () => {
    expect(levenshteinDistance('coffee', 'coffee')).toBe(0);
  });

  it('is case-insensitive', () => {
    expect(levenshteinDistance('Coffee', 'coffee')).toBe(0);
  });

  it('counts a single substitution', () => {
    expect(levenshteinDistance('coffee', 'toffee')).toBe(1);
  });

  it('counts insertions and deletions', () => {
    expect(levenshteinDistance('cat', 'cats')).toBe(1);
    expect(levenshteinDistance('cats', 'cat')).toBe(1);
  });

  it('handles empty strings', () => {
    expect(levenshteinDistance('', 'abc')).toBe(3);
    expect(levenshteinDistance('abc', '')).toBe(3);
  });
});

describe('levenshteinSimilarity', () => {
  it('returns 1 for identical strings', () => {
    expect(levenshteinSimilarity('lunch', 'lunch')).toBe(1);
  });

  it('returns a value between 0 and 1 for a typo', () => {
    const score = levenshteinSimilarity('grocery', 'grocary');
    expect(score).toBeGreaterThan(0.7);
    expect(score).toBeLessThan(1);
  });

  it('returns a low score for unrelated words', () => {
    expect(levenshteinSimilarity('coffee', 'zzzzzz')).toBeLessThan(0.2);
  });
});

describe('tokenSimilarity', () => {
  it('matches phrases with extra words', () => {
    const score = tokenSimilarity('debit card', 'my debit card');
    expect(score).toBeGreaterThan(0.6);
  });

  it('matches phrases regardless of token order', () => {
    expect(tokenSimilarity('card debit', 'debit card')).toBe(1);
  });

  it('tolerates a typo within one token', () => {
    const score = tokenSimilarity('visa platinum', 'visa platinim');
    expect(score).toBeGreaterThan(0.9);
  });

  it('returns 0 for completely different phrases', () => {
    expect(tokenSimilarity('coffee', 'savings account')).toBe(0);
  });
});

describe('similarity', () => {
  it('returns 1 for an exact match', () => {
    expect(similarity('Groceries', 'groceries')).toBe(1);
  });

  it('returns 0 when either input is empty', () => {
    expect(similarity('', 'groceries')).toBe(0);
    expect(similarity('groceries', '')).toBe(0);
  });

  it('favors the higher of the two underlying scores', () => {
    const score = similarity('visa card', 'visa');
    expect(score).toBeGreaterThanOrEqual(0.5);
  });
});
