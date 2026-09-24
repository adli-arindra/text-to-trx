import { describe, expect, it } from 'vitest';
import { extractDate } from '../../src/pipeline/extract/date';
import { en } from '../../src/lang/en';

const referenceDate = new Date(2026, 8, 24); // Thursday, September 24 2026

describe('extractDate', () => {
  it('defaults to the reference date when no phrase is present', () => {
    const result = extractDate('spent 12 on lunch', en, referenceDate);
    expect(result.field).toEqual({ value: '2026-09-24', confidence: 0.7 });
    expect(result.matchedText).toBeNull();
  });

  it('resolves "today"', () => {
    const result = extractDate('spent 12 today', en, referenceDate);
    expect(result.field.value).toBe('2026-09-24');
  });

  it('resolves "yesterday"', () => {
    const result = extractDate('spent 12 yesterday', en, referenceDate);
    expect(result.field.value).toBe('2026-09-23');
  });

  it('resolves "the day before yesterday"', () => {
    const result = extractDate('spent 12 the day before yesterday', en, referenceDate);
    expect(result.field.value).toBe('2026-09-22');
  });

  it('resolves "N days ago"', () => {
    const result = extractDate('spent 12 3 days ago', en, referenceDate);
    expect(result.field.value).toBe('2026-09-21');
  });

  it('resolves "last monday" to the most recent past Monday', () => {
    const result = extractDate('spent 12 last monday', en, referenceDate);
    // referenceDate is Thursday Sep 24; the most recent Monday is Sep 21
    expect(result.field.value).toBe('2026-09-21');
  });

  it('resolves a bare weekday name to the most recent past occurrence', () => {
    const result = extractDate('spent 12 on monday', en, referenceDate);
    expect(result.field.value).toBe('2026-09-21');
  });

  it('resolves "on the 5th" within the current month when the day has passed', () => {
    const result = extractDate('spent 12 on the 5th', en, referenceDate);
    expect(result.field.value).toBe('2026-09-05');
  });

  it('resolves an ordinal day to last month when the day has not happened yet this month', () => {
    const result = extractDate('spent 12 on the 30th', en, referenceDate);
    expect(result.field.value).toBe('2026-08-30');
  });

  it('resolves a month and day in the past this year', () => {
    const result = extractDate('spent 12 on september 3', en, referenceDate);
    expect(result.field.value).toBe('2026-09-03');
    expect(result.field.confidence).toBeCloseTo(0.85);
  });

  it('resolves a month and day with an ordinal suffix', () => {
    const result = extractDate('spent 12 on sept 3rd', en, referenceDate);
    expect(result.field.value).toBe('2026-09-03');
  });

  it('moves a future month and day back one year and lowers confidence', () => {
    const result = extractDate('spent 12 on december 25', en, referenceDate);
    expect(result.field.value).toBe('2025-12-25');
    expect(result.field.confidence).toBeCloseTo(0.6);
  });
});
