import type { AccountRef, CategoryRef, Field, ParseWarning } from '../types';
import type { AccountMatch } from './match/accounts';
import type { CategoryMatch } from './match/categories';

export interface ScoredField<T> {
  field: Field<T>;
  warnings: ParseWarning[];
}

export function scoreField<T>(
  field: Field<T>,
  fieldName: string,
  threshold: number
): ScoredField<T> {
  if (field.value === null || field.confidence >= threshold) {
    return { field, warnings: [] };
  }

  return {
    field: { value: null, confidence: field.confidence },
    warnings: [{ code: 'LOW_CONFIDENCE', field: fieldName }],
  };
}

export function buildCategoryField(
  match: CategoryMatch | null,
  heardAs: string,
  threshold: number
): ScoredField<CategoryRef> {
  if (!match) {
    return {
      field: { value: null, confidence: 0 },
      warnings: heardAs.trim() ? [{ code: 'UNKNOWN_CATEGORY', heardAs }] : [],
    };
  }

  return scoreField({ value: match.category, confidence: match.confidence }, 'category', threshold);
}

export function buildAccountField(
  match: AccountMatch | null,
  heardAs: string,
  threshold: number,
  fieldName: string = 'account'
): ScoredField<AccountRef> {
  if (!match) {
    return {
      field: { value: null, confidence: 0 },
      warnings: heardAs.trim() ? [{ code: 'UNKNOWN_ACCOUNT', heardAs }] : [],
    };
  }

  return scoreField({ value: match.account, confidence: match.confidence }, fieldName, threshold);
}
