import { describe, expect, it } from 'vitest';
import { normalize } from '../../src/pipeline/normalize';
import { convertNumbers } from '../../src/pipeline/numbers';
import { segment } from '../../src/pipeline/segment';
import { extractAmount } from '../../src/pipeline/extract/amount';
import { en } from '../../src/lang/en';

function runFirstSegment(input: string) {
  const normalized = normalize(input, en);
  const numbers = convertNumbers(normalized.text, en);
  const segments = segment(numbers.text, numbers.matches, en);
  return extractAmount(segments[0], en);
}

describe('extractAmount', () => {
  it('returns MISSING_AMOUNT when there is no amount', () => {
    const result = runFirstSegment('spent money on lunch');
    expect(result.field).toEqual({ value: null, confidence: 0 });
    expect(result.warnings).toEqual([{ code: 'MISSING_AMOUNT' }]);
  });

  it('picks the single amount in a segment with high confidence', () => {
    const result = runFirstSegment('spent 12 on lunch');
    expect(result.field.value).toBe(12);
    expect(result.field.confidence).toBeGreaterThan(0.8);
    expect(result.warnings).toEqual([]);
  });

  it('lowers confidence and warns for an ambiguous amount', () => {
    const result = runFirstSegment('two fifty for parking');
    expect(result.field.value).toBe(2.5);
    expect(result.field.confidence).toBeLessThanOrEqual(0.6);
    expect(result.warnings).toEqual([{ code: 'AMBIGUOUS_AMOUNT', candidates: [2.5, 250] }]);
  });

  it('prefers the number with a currency marker over a quantity number', () => {
    const result = runFirstSegment('bought 3 coffees for 12 dollars');
    expect(result.field.value).toBe(12);
    expect(result.warnings).toEqual([]);
  });

  it('prefers the number right after a price word when no currency marker is present', () => {
    const result = runFirstSegment('bought 3 coffees for 12');
    expect(result.field.value).toBe(12);
    expect(result.warnings).toEqual([]);
  });

  it('falls back to the last number and warns when there is no better signal', () => {
    const result = runFirstSegment('3 12 lunch');
    expect(result.field.value).toBe(12);
    expect(result.warnings).toEqual([{ code: 'MULTIPLE_AMOUNTS', candidates: [3, 12] }]);
  });
});
