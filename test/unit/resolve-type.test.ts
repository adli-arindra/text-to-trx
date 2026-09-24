import { describe, expect, it } from 'vitest';
import { resolveType } from '../../src/pipeline/resolveType';
import { createTypeRegistry } from '../../src/registry/types';
import { en } from '../../src/lang/en';
import type { Segment } from '../../src/pipeline/segment';

const registry = createTypeRegistry({ language: en });

function seg(text: string): Segment {
  return { text, start: 0, end: text.length, amounts: [] };
}

describe('resolveType', () => {
  it('uses the category type when a category matched', () => {
    const result = resolveType({
      segment: seg('20 on lunch'),
      categoryType: 'expense',
      language: en,
      registry,
    });
    expect(result.field.value).toBe('expense');
    expect(result.field.confidence).toBeGreaterThan(0.8);
    expect(result.warnings).toEqual([]);
    expect(result.isTransfer).toBe(false);
  });

  it('detects a transfer from two accounts even without a category', () => {
    const result = resolveType({
      segment: seg('transferred 200 from checking to savings'),
      categoryType: null,
      language: en,
      registry,
    });
    expect(result.field.value).toBe('transfer');
    expect(result.isTransfer).toBe(true);
  });

  it('detects a transfer from a transfer verb plus a destination account', () => {
    const result = resolveType({
      segment: seg('moved 50 bucks into my savings'),
      categoryType: null,
      language: en,
      registry,
    });
    expect(result.field.value).toBe('transfer');
    expect(result.isTransfer).toBe(true);
  });

  it('falls back to type keywords when there is no category and no transfer pattern', () => {
    const result = resolveType({
      segment: seg('spent 12 on lunch'),
      categoryType: null,
      language: en,
      registry,
    });
    expect(result.field.value).toBe('expense');
    expect(result.isTransfer).toBe(false);
  });

  it('keeps the category type but warns when keywords disagree', () => {
    const result = resolveType({
      segment: seg('got 20 back for lunch'),
      categoryType: 'expense',
      language: en,
      registry,
    });
    expect(result.field.value).toBe('expense');
    expect(result.field.confidence).toBeLessThanOrEqual(0.5);
    expect(result.warnings).toEqual([
      { code: 'TYPE_CONFLICT', fromCategory: 'expense', fromKeywords: 'income' },
    ]);
  });

  it('returns a null type when there is no category, transfer pattern, or keyword', () => {
    const result = resolveType({
      segment: seg('12 lunch'),
      categoryType: null,
      language: en,
      registry,
    });
    expect(result.field).toEqual({ value: null, confidence: 0 });
    expect(result.warnings).toEqual([]);
  });

  it('ignores a category type that is not registered', () => {
    const result = resolveType({
      segment: seg('spent 12 on lunch'),
      categoryType: 'unknown-type',
      language: en,
      registry,
    });
    expect(result.field.value).toBe('expense');
  });
});
