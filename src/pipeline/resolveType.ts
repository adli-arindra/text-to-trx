import type { LanguagePack } from '../lang/types';
import type { TypeRegistry } from '../registry/types';
import type { Field, ParseWarning, TransactionType } from '../types';
import { extractAccounts } from './extract/account';
import { extractTypeKeyword } from './extract/typeKeywords';
import type { Segment } from './segment';

export interface ResolveTypeInput {
  segment: Segment;
  categoryType: TransactionType | null;
  language: LanguagePack;
  registry: TypeRegistry;
}

export interface ResolveTypeResult {
  field: Field<TransactionType>;
  isTransfer: boolean;
  warnings: ParseWarning[];
}

export function resolveType(input: ResolveTypeInput): ResolveTypeResult {
  const { segment, categoryType, language, registry } = input;

  const accounts = extractAccounts(segment.text, language);
  const keywordMatch = extractTypeKeyword(segment.text, registry);

  const hasTransferPattern =
    (accounts.from !== null && accounts.to !== null) ||
    (keywordMatch?.type === 'transfer' && accounts.to !== null);

  let type: TransactionType | null = null;
  let confidence = 0;
  const warnings: ParseWarning[] = [];

  if (categoryType !== null && registry.has(categoryType)) {
    type = categoryType;
    confidence = 0.85;
    if (keywordMatch && keywordMatch.type !== categoryType && registry.has(keywordMatch.type)) {
      warnings.push({
        code: 'TYPE_CONFLICT',
        fromCategory: categoryType,
        fromKeywords: keywordMatch.type,
      });
      confidence = 0.5;
    }
  } else if (hasTransferPattern && registry.has('transfer')) {
    type = 'transfer';
    confidence = 0.8;
  } else if (keywordMatch && registry.has(keywordMatch.type)) {
    type = keywordMatch.type;
    confidence = 0.7;
  }

  return {
    field: { value: type, confidence },
    isTransfer: type === 'transfer',
    warnings,
  };
}
