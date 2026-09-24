import { describe, expect, it } from 'vitest';
import { en } from '../../src/lang/en';

describe('en language pack', () => {
  it('has the expected language code', () => {
    expect(en.code).toBe('en');
  });

  it('defines number words for units, tens and scales', () => {
    expect(en.numbers.units.seven).toBe(7);
    expect(en.numbers.tens.fifty).toBe(50);
    expect(en.numbers.scales.thousand).toBe(1000);
    expect(en.numbers.scales.k).toBe(1000);
  });

  it('defines type keywords for the default transaction types', () => {
    expect(en.typeKeywords.expense).toContain('spent');
    expect(en.typeKeywords.income).toContain('received');
    expect(en.typeKeywords.transfer).toContain('transferred');
  });

  it('defines date phrases used for relative dates', () => {
    expect(en.dates.yesterday).toContain('yesterday');
    expect(en.dates.months.sept).toBe(8);
    expect('3 days ago').toMatch(en.dates.daysAgo);
    expect('5th').toMatch(en.dates.ordinalSuffix);
  });
});
