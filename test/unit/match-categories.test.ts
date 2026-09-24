import { describe, expect, it } from 'vitest';
import { matchCategory } from '../../src/pipeline/match/categories';
import type { CategoryDefinition } from '../../src/types';

const categories: CategoryDefinition[] = [
  { id: 'food', name: 'Food', type: 'expense', aliases: ['meal', 'eating out'] },
  { id: 'transport', name: 'Transport', type: 'expense' },
  { id: 'salary', name: 'Salary', type: 'income' },
];

describe('matchCategory', () => {
  it('returns null for an empty candidate', () => {
    expect(matchCategory('', categories)).toBeNull();
  });

  it('returns null when there are no categories', () => {
    expect(matchCategory('groceries', [])).toBeNull();
  });

  it('matches an exact category name', () => {
    const result = matchCategory('food', categories);
    expect(result).toEqual({ category: { id: 'food', name: 'Food' }, confidence: 1 });
  });

  it('matches via an alias', () => {
    const result = matchCategory('eating out', categories);
    expect(result?.category).toEqual({ id: 'food', name: 'Food' });
  });

  it('matches a category name with a typo', () => {
    const result = matchCategory('transpot', categories);
    expect(result?.category).toEqual({ id: 'transport', name: 'Transport' });
    expect(result?.confidence).toBeGreaterThan(0.5);
  });

  it('returns null for a candidate unrelated to any category', () => {
    expect(matchCategory('zzz completely unrelated', categories)).toBeNull();
  });
});
