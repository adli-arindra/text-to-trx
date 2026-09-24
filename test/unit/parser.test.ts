import { describe, expect, it } from 'vitest';
import { createParser } from '../../src/parser';
import { en } from '../../src/lang/en';
import type { ParseContext } from '../../src/types';

const context: ParseContext = {
  categories: [
    { id: 'food', name: 'Food', type: 'expense', aliases: ['meal', 'eating out'] },
    { id: 'transport', name: 'Transport', type: 'expense' },
    { id: 'salary', name: 'Salary', type: 'income' },
  ],
  accounts: [
    { id: 'checking', name: 'Checking' },
    { id: 'savings', name: 'Savings' },
    { id: 'visa', name: 'Visa Platinum', aliases: ['visa', 'credit card'] },
  ],
  knownNames: [
    { name: 'Coffee', categoryId: 'food', count: 12 },
    { name: 'Uber', categoryId: 'transport', count: 40 },
  ],
};

function makeParser() {
  return createParser({ language: en, currency: { code: 'USD', decimals: 2 } });
}

describe('createParser', () => {
  it('parses a simple expense with a known category alias', () => {
    const parser = makeParser();
    const result = parser.parse('spent 12 on lunch', context, {
      referenceDate: new Date(2026, 8, 24),
    });

    expect(result.transactions).toHaveLength(1);
    const [tx] = result.transactions;
    expect(tx!.amount.value).toBe(12);
    expect(tx!.type.value).toBe('expense');
    expect(tx!.name.value).toBe('Lunch');
    expect(tx!.date.value).toBe('2026-09-24');
  });

  it('matches a known name and inherits its category', () => {
    const parser = makeParser();
    const result = parser.parse('spent 4.50 on coffee', context, {
      referenceDate: new Date(2026, 8, 24),
    });

    const [tx] = result.transactions;
    expect(tx!.name.value).toBe('Coffee');
    expect(tx!.category.value).toEqual({ id: 'food', name: 'Food' });
    expect(tx!.type.value).toBe('expense');
  });

  it('parses multiple transactions from one sentence', () => {
    const parser = makeParser();
    const result = parser.parse('spent 10 on coffee and 20 on uber', context, {
      referenceDate: new Date(2026, 8, 24),
    });

    expect(result.transactions).toHaveLength(2);
    expect(result.transactions.map((t) => t.amount.value)).toEqual([10, 20]);
    expect(result.transactions[1]!.category.value).toEqual({ id: 'transport', name: 'Transport' });
  });

  it('resolves a transfer between two accounts', () => {
    const parser = makeParser();
    const result = parser.parse('transferred 200 from checking to savings', context, {
      referenceDate: new Date(2026, 8, 24),
    });

    const [tx] = result.transactions;
    expect(tx!.type.value).toBe('transfer');
    expect(tx!.account.value).toEqual({ id: 'checking', name: 'Checking' });
    expect(tx!.toAccount?.value).toEqual({ id: 'savings', name: 'Savings' });
  });

  it('adds a MISSING_AMOUNT warning and keeps the transaction when a type keyword is present', () => {
    const parser = makeParser();
    const result = parser.parse('spent money on lunch', context, {
      referenceDate: new Date(2026, 8, 24),
    });

    expect(result.transactions).toHaveLength(1);
    expect(result.transactions[0]!.warnings).toContainEqual({ code: 'MISSING_AMOUNT' });
  });

  it('sends unrelated text with no signal to unparsed', () => {
    const parser = makeParser();
    const result = parser.parse('hello there', context, { referenceDate: new Date(2026, 8, 24) });

    expect(result.transactions).toHaveLength(0);
    expect(result.unparsed).toEqual(['hello there']);
  });

  it('flags an unknown category with a warning', () => {
    const parser = makeParser();
    const result = parser.parse('paid 40 for boba', context, {
      referenceDate: new Date(2026, 8, 24),
    });

    const [tx] = result.transactions;
    expect(tx!.category.value).toBeNull();
    expect(tx!.warnings).toContainEqual({ code: 'UNKNOWN_CATEGORY', heardAs: 'boba' });
  });

  it('falls back to the default account when none is mentioned', () => {
    const parser = createParser({ language: en, currency: { code: 'USD', decimals: 2 } });
    const result = parser.parse(
      'spent 12 on lunch',
      { ...context, defaultAccountId: 'visa' },
      {
        referenceDate: new Date(2026, 8, 24),
      }
    );

    const [tx] = result.transactions;
    expect(tx!.account.value).toEqual({ id: 'visa', name: 'Visa Platinum' });
  });

  it('rounds the amount to the configured currency decimals', () => {
    const parser = createParser({ language: en, currency: { code: 'USD', decimals: 0 } });
    const result = parser.parse('spent 12.75 on lunch', context, {
      referenceDate: new Date(2026, 8, 24),
    });

    expect(result.transactions[0]!.amount.value).toBe(13);
  });

  it('produces a source span pointing back to the original text', () => {
    const parser = makeParser();
    const input = 'yesterday i spent twelve on lunch';
    const result = parser.parse(input, context, { referenceDate: new Date(2026, 8, 24) });

    const [tx] = result.transactions;
    expect(tx!.source.text).toBe(input.slice(tx!.source.start, tx!.source.end));
  });
});
