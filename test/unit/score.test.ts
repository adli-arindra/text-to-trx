import { describe, expect, it } from 'vitest';
import { buildAccountField, buildCategoryField, scoreField } from '../../src/pipeline/score';

describe('scoreField', () => {
  it('passes a field through unchanged when confidence meets the threshold', () => {
    const result = scoreField({ value: 12, confidence: 0.8 }, 'amount', 0.6);
    expect(result.field).toEqual({ value: 12, confidence: 0.8 });
    expect(result.warnings).toEqual([]);
  });

  it('nulls the value and warns when confidence is below the threshold', () => {
    const result = scoreField({ value: 12, confidence: 0.4 }, 'amount', 0.6);
    expect(result.field).toEqual({ value: null, confidence: 0.4 });
    expect(result.warnings).toEqual([{ code: 'LOW_CONFIDENCE', field: 'amount' }]);
  });

  it('leaves an already-null field alone without warning', () => {
    const result = scoreField({ value: null, confidence: 0 }, 'amount', 0.6);
    expect(result.field).toEqual({ value: null, confidence: 0 });
    expect(result.warnings).toEqual([]);
  });

  it('passes a field through when confidence exactly equals the threshold', () => {
    const result = scoreField({ value: 'lunch', confidence: 0.6 }, 'name', 0.6);
    expect(result.field.value).toBe('lunch');
    expect(result.warnings).toEqual([]);
  });
});

describe('buildCategoryField', () => {
  it('returns an unknown-category warning when nothing matched and there is a candidate', () => {
    const result = buildCategoryField(null, 'boba', 0.6);
    expect(result.field).toEqual({ value: null, confidence: 0 });
    expect(result.warnings).toEqual([{ code: 'UNKNOWN_CATEGORY', heardAs: 'boba' }]);
  });

  it('returns no warning when nothing matched and there was no candidate text', () => {
    const result = buildCategoryField(null, '', 0.6);
    expect(result.warnings).toEqual([]);
  });

  it('passes a confident match through', () => {
    const result = buildCategoryField(
      { category: { id: 'food', name: 'Food' }, confidence: 0.9 },
      'lunch',
      0.6
    );
    expect(result.field).toEqual({ value: { id: 'food', name: 'Food' }, confidence: 0.9 });
    expect(result.warnings).toEqual([]);
  });

  it('nulls a low-confidence match and warns LOW_CONFIDENCE instead of UNKNOWN_CATEGORY', () => {
    const result = buildCategoryField(
      { category: { id: 'food', name: 'Food' }, confidence: 0.5 },
      'fud',
      0.6
    );
    expect(result.field).toEqual({ value: null, confidence: 0.5 });
    expect(result.warnings).toEqual([{ code: 'LOW_CONFIDENCE', field: 'category' }]);
  });
});

describe('buildAccountField', () => {
  it('returns an unknown-account warning when nothing matched and there is a candidate', () => {
    const result = buildAccountField(null, 'crypto wallet', 0.6);
    expect(result.field).toEqual({ value: null, confidence: 0 });
    expect(result.warnings).toEqual([{ code: 'UNKNOWN_ACCOUNT', heardAs: 'crypto wallet' }]);
  });

  it('returns no warning when nothing matched and there was no candidate text', () => {
    const result = buildAccountField(null, '', 0.6);
    expect(result.warnings).toEqual([]);
  });

  it('passes a confident match through', () => {
    const result = buildAccountField(
      { account: { id: 'visa', name: 'Visa Platinum' }, confidence: 0.95 },
      'visa',
      0.6
    );
    expect(result.field).toEqual({
      value: { id: 'visa', name: 'Visa Platinum' },
      confidence: 0.95,
    });
    expect(result.warnings).toEqual([]);
  });

  it('nulls a low-confidence match and warns LOW_CONFIDENCE instead of UNKNOWN_ACCOUNT', () => {
    const result = buildAccountField(
      { account: { id: 'visa', name: 'Visa Platinum' }, confidence: 0.5 },
      'visaa',
      0.6
    );
    expect(result.field).toEqual({ value: null, confidence: 0.5 });
    expect(result.warnings).toEqual([{ code: 'LOW_CONFIDENCE', field: 'account' }]);
  });
});
