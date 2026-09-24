import { describe, expect, it } from 'vitest';
import { extractTypeKeyword } from '../../src/pipeline/extract/typeKeywords';
import { createTypeRegistry } from '../../src/registry/types';
import { en } from '../../src/lang/en';

const registry = createTypeRegistry({ language: en });

describe('extractTypeKeyword', () => {
  it('returns null when no keyword is present', () => {
    expect(extractTypeKeyword('lunch 12', registry)).toBeNull();
  });

  it('matches an expense keyword', () => {
    expect(extractTypeKeyword('spent 12 on lunch', registry)).toEqual({
      type: 'expense',
      keyword: 'spent',
    });
  });

  it('matches a multi-word income keyword', () => {
    expect(extractTypeKeyword('got paid 3k salary', registry)).toEqual({
      type: 'income',
      keyword: 'got paid',
    });
  });

  it('matches a transfer keyword', () => {
    expect(extractTypeKeyword('transferred 200 from checking to savings', registry)).toEqual({
      type: 'transfer',
      keyword: 'transferred',
    });
  });

  it('is case-insensitive', () => {
    expect(extractTypeKeyword('SPENT 12 on lunch', registry)).toEqual({
      type: 'expense',
      keyword: 'spent',
    });
  });

  it('prefers the earliest keyword when more than one is present', () => {
    expect(extractTypeKeyword('bought lunch, earned nothing', registry)).toEqual({
      type: 'expense',
      keyword: 'bought',
    });
  });

  it('respects a restricted type registry', () => {
    const expenseOnly = createTypeRegistry({ language: en, types: ['expense'] });
    expect(extractTypeKeyword('received 3k salary', expenseOnly)).toBeNull();
  });

  it('matches keywords registered for a custom type', () => {
    const withRefund = createTypeRegistry({
      language: en,
      customTypes: [{ id: 'refund', keywords: ['refunded', 'got a refund'] }],
    });
    expect(extractTypeKeyword('refunded 20 for the jacket', withRefund)).toEqual({
      type: 'refund',
      keyword: 'refunded',
    });
  });
});
