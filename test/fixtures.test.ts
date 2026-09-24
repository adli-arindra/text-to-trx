import { describe, expect, it } from 'vitest';
import { createParser } from '../src/parser';
import { en } from '../src/lang/en';
import { loadContext, loadFixtures, parseReferenceDate } from './fixtures/loadFixtures';

const parser = createParser({ language: en, currency: { code: 'USD', decimals: 2 } });
const fixtures = loadFixtures();

describe('fixtures', () => {
  it('loads a substantial fixture set', () => {
    expect(fixtures.length).toBeGreaterThanOrEqual(50);
  });

  it.each(fixtures.map((f) => [f.id, f] as const))('parses %s without throwing', (_id, fixture) => {
    const context = loadContext(fixture.context);
    expect(() =>
      parser.parse(fixture.input, context, {
        referenceDate: parseReferenceDate(fixture.referenceDate),
      })
    ).not.toThrow();
  });

  const critical = fixtures.filter((f) => f.tags.includes('critical'));

  it.each(critical.map((f) => [f.id, f] as const))(
    'matches critical amounts for %s',
    (_id, fixture) => {
      const context = loadContext(fixture.context);
      const result = parser.parse(fixture.input, context, {
        referenceDate: parseReferenceDate(fixture.referenceDate),
      });

      const expectedAmounts = fixture.expected
        .filter((e) => 'amount' in e)
        .map((e) => e.amount ?? null);
      const actualAmounts = result.transactions
        .slice(0, expectedAmounts.length)
        .map((t) => t.amount.value);

      expect(actualAmounts).toEqual(expectedAmounts);
    }
  );
});
