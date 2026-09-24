import { describe, expect, it } from 'vitest';
import { matchAccount } from '../../src/pipeline/match/accounts';
import type { AccountDefinition } from '../../src/types';

const accounts: AccountDefinition[] = [
  { id: 'visa', name: 'Visa Platinum', aliases: ['visa', 'credit card'] },
  { id: 'checking', name: 'Checking' },
  { id: 'savings', name: 'Savings' },
];

describe('matchAccount', () => {
  it('returns null for an empty candidate', () => {
    expect(matchAccount('', accounts)).toBeNull();
  });

  it('returns null when there are no accounts', () => {
    expect(matchAccount('visa', [])).toBeNull();
  });

  it('matches an exact account name', () => {
    const result = matchAccount('savings', accounts);
    expect(result).toEqual({ account: { id: 'savings', name: 'Savings' }, confidence: 1 });
  });

  it('matches via an alias', () => {
    const result = matchAccount('credit card', accounts);
    expect(result?.account).toEqual({ id: 'visa', name: 'Visa Platinum' });
  });

  it('matches an account name with a typo', () => {
    const result = matchAccount('checkin', accounts);
    expect(result?.account).toEqual({ id: 'checking', name: 'Checking' });
    expect(result?.confidence).toBeGreaterThan(0.5);
  });

  it('returns null for a candidate unrelated to any account', () => {
    expect(matchAccount('zzz completely unrelated', accounts)).toBeNull();
  });
});
