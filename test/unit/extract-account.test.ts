import { describe, expect, it } from 'vitest';
import { extractAccounts } from '../../src/pipeline/extract/account';
import { en } from '../../src/lang/en';

describe('extractAccounts', () => {
  it('returns all nulls when no account phrase is present', () => {
    expect(extractAccounts('spent 12 for lunch', en)).toEqual({
      from: null,
      to: null,
      using: null,
      usingMarker: null,
    });
  });

  it('extracts a "from" account and strips a leading stopword', () => {
    const result = extractAccounts('spent 20 from my savings', en);
    expect(result.from).toBe('savings');
  });

  it('extracts a "using" account for a "with" phrase', () => {
    const result = extractAccounts('bought groceries with my visa', en);
    expect(result.using).toBe('visa');
    expect(result.usingMarker).toBe('with');
  });

  it('records "on" as the using marker so callers can treat it as ambiguous', () => {
    const result = extractAccounts('spent 12 on lunch', en);
    expect(result.using).toBe('lunch');
    expect(result.usingMarker).toBe('on');
  });

  it('extracts both "from" and "to" accounts for a transfer', () => {
    const result = extractAccounts('transferred 200 from checking to savings', en);
    expect(result.from).toBe('checking');
    expect(result.to).toBe('savings');
  });

  it('extracts a "to" account for an "into" phrase', () => {
    const result = extractAccounts('moved 50 bucks into my savings', en);
    expect(result.to).toBe('savings');
    expect(result.from).toBeNull();
  });

  it('keeps only the first occurrence of each marker category', () => {
    const result = extractAccounts('from checking from savings', en);
    expect(result.from).toBe('checking');
  });
});
