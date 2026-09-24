import type { LanguagePack } from './lang/types';
import { normalize } from './pipeline/normalize';
import { convertNumbers } from './pipeline/numbers';
import { segment } from './pipeline/segment';
import type { Segment } from './pipeline/segment';
import { extractAmount } from './pipeline/extract/amount';
import { extractDate } from './pipeline/extract/date';
import { extractAccounts } from './pipeline/extract/account';
import { extractTypeKeyword } from './pipeline/extract/typeKeywords';
import { extractName, removeAmountSpans } from './pipeline/extract/name';
import { matchName } from './pipeline/match/names';
import { matchCategory } from './pipeline/match/categories';
import type { CategoryMatch } from './pipeline/match/categories';
import { matchAccount } from './pipeline/match/accounts';
import { resolveType } from './pipeline/resolveType';
import { buildAccountField, buildCategoryField, scoreField } from './pipeline/score';
import { createTypeRegistry } from './registry/types';
import type { TransactionTypeDefinition } from './registry/types';
import type {
  AccountRef,
  Field,
  ParsedTransaction,
  ParseContext,
  ParseOptions,
  ParseResult,
  ParseWarning,
  TransactionType,
} from './types';

export interface CreateParserOptions {
  language: LanguagePack;
  currency: { code: string; decimals: number };
  confidenceThreshold?: number;
  types?: TransactionType[];
  customTypes?: TransactionTypeDefinition[];
}

export interface Parser {
  parse(text: string, context: ParseContext, options: ParseOptions): ParseResult;
}

function capitalize(text: string): string {
  return text
    .split(' ')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function roundToDecimals(value: number, decimals: number): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

function removePhrase(text: string, phrase: string): string {
  const escaped = phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s+');
  return text.replace(new RegExp(`\\b${escaped}\\b`, 'i'), ' ');
}

function toOriginalIndex(index: number, numbersMap: number[], normalizeMap: number[]): number {
  if (numbersMap.length === 0 || normalizeMap.length === 0) return 0;
  const numbersIdx = numbersMap[Math.max(0, Math.min(index, numbersMap.length - 1))]!;
  return normalizeMap[Math.max(0, Math.min(numbersIdx, normalizeMap.length - 1))]!;
}

function toOriginalSpan(
  start: number,
  end: number,
  numbersMap: number[],
  normalizeMap: number[]
): { start: number; end: number } {
  const s = toOriginalIndex(start, numbersMap, normalizeMap);
  if (end <= start) return { start: s, end: s };
  const e = toOriginalIndex(end - 1, numbersMap, normalizeMap) + 1;
  return { start: s, end: e };
}

function buildSourceAccountField(
  candidate: string | null,
  context: ParseContext,
  threshold: number
): { field: Field<AccountRef>; warnings: ParseWarning[] } {
  if (candidate) {
    const match = matchAccount(candidate, context.accounts);
    return buildAccountField(match, candidate, threshold, 'account');
  }

  if (context.defaultAccountId) {
    const def = context.accounts.find((a) => a.id === context.defaultAccountId);
    if (def) {
      return { field: { value: { id: def.id, name: def.name }, confidence: 0.5 }, warnings: [] };
    }
  }

  return { field: { value: null, confidence: 0 }, warnings: [] };
}

export function createParser(options: CreateParserOptions): Parser {
  const { language, currency, confidenceThreshold = 0.6, types, customTypes } = options;
  const registry = createTypeRegistry({ language, types, customTypes });

  return {
    parse(text: string, context: ParseContext, parseOptions: ParseOptions): ParseResult {
      const normalized = normalize(text, language);
      const numbers = convertNumbers(normalized.text, language);
      const segments = segment(numbers.text, numbers.matches, language);

      const transactions: ParsedTransaction[] = [];
      const unparsed: string[] = [];
      let carriedDate: Field<string> | null = null;

      for (const seg of segments) {
        if (!seg.text.trim()) continue;

        const originalSpan = toOriginalSpan(seg.start, seg.end, numbers.map, normalized.map);
        const originalText = text.slice(originalSpan.start, originalSpan.end);

        const parsed = parseSegment(
          seg,
          language,
          context,
          registry,
          parseOptions.referenceDate,
          confidenceThreshold,
          currency,
          carriedDate
        );
        carriedDate = parsed.carriedDate;

        if (!parsed.transaction) {
          unparsed.push(originalText);
          continue;
        }

        transactions.push({
          ...parsed.transaction,
          source: { text: originalText, ...originalSpan },
        });
      }

      return { transactions, unparsed };
    },
  };
}

interface ParseSegmentResult {
  transaction: Omit<ParsedTransaction, 'source'> | null;
  carriedDate: Field<string> | null;
}

function parseSegment(
  seg: Segment,
  language: LanguagePack,
  context: ParseContext,
  registry: ReturnType<typeof createTypeRegistry>,
  referenceDate: Date,
  threshold: number,
  currency: { code: string; decimals: number },
  carriedDate: Field<string> | null
): ParseSegmentResult {
  const amountResult = extractAmount(seg, language);
  const dateResult = extractDate(seg.text, language, referenceDate);
  const dateField = dateResult.matchedText === null && carriedDate ? carriedDate : dateResult.field;
  const nextCarriedDate = dateResult.matchedText !== null ? dateResult.field : carriedDate;

  let textForAccounts = removeAmountSpans(seg);
  if (dateResult.matchedText) {
    textForAccounts = removePhrase(textForAccounts, dateResult.matchedText);
  }
  const accounts = extractAccounts(textForAccounts, language);
  const keywordMatch = extractTypeKeyword(seg.text, registry);
  const nameCandidate = extractName({
    segment: seg,
    language,
    dateMatchedText: dateResult.matchedText,
    accounts,
    keywordMatch,
  });

  const nameMatch = matchName(nameCandidate, context.knownNames);
  let categoryMatch: CategoryMatch | null = null;
  let nameField: Field<string>;

  if (nameMatch) {
    nameField = { value: nameMatch.name, confidence: nameMatch.confidence };
    const def = context.categories.find((c) => c.id === nameMatch.categoryId);
    if (def) {
      categoryMatch = {
        category: { id: def.id, name: def.name },
        confidence: nameMatch.confidence,
      };
    }
  } else {
    categoryMatch = matchCategory(nameCandidate, context.categories);
    nameField = nameCandidate.trim()
      ? { value: capitalize(nameCandidate), confidence: 0.6 }
      : { value: null, confidence: 0 };
  }

  const hasAmount = amountResult.field.value !== null;
  const hasSignal =
    hasAmount || keywordMatch !== null || nameMatch !== null || categoryMatch !== null;
  if (!hasSignal) return { transaction: null, carriedDate: nextCarriedDate };

  const categoryDef = categoryMatch
    ? context.categories.find((c) => c.id === categoryMatch!.category.id)
    : undefined;
  const categoryType = categoryDef ? categoryDef.type : null;

  const typeResult = resolveType({ segment: seg, categoryType, language, registry });

  const sourceCandidate = accounts.from ?? (accounts.usingMarker !== 'on' ? accounts.using : null);
  const accountBuilt = buildSourceAccountField(sourceCandidate, context, threshold);

  let toAccountField: Field<AccountRef> | undefined;
  let toAccountWarnings: ParseWarning[] = [];
  if (typeResult.isTransfer) {
    const toCandidate = accounts.to;
    if (toCandidate) {
      const toMatch = matchAccount(toCandidate, context.accounts);
      const built = buildAccountField(toMatch, toCandidate, threshold, 'toAccount');
      toAccountField = built.field;
      toAccountWarnings = built.warnings;
    } else {
      toAccountField = { value: null, confidence: 0 };
    }
  }

  const categoryBuilt = buildCategoryField(categoryMatch, nameCandidate, threshold);
  const nameScored = scoreField(nameField, 'name', threshold);
  const typeScored = scoreField(typeResult.field, 'type', threshold);
  const dateScored = scoreField(dateField, 'date', threshold);

  const roundedAmount =
    amountResult.field.value !== null
      ? {
          value: roundToDecimals(amountResult.field.value, currency.decimals),
          confidence: amountResult.field.confidence,
        }
      : amountResult.field;
  const amountScored = scoreField(roundedAmount, 'amount', threshold);

  const warnings: ParseWarning[] = [
    ...amountResult.warnings,
    ...amountScored.warnings,
    ...typeResult.warnings,
    ...typeScored.warnings,
    ...categoryBuilt.warnings,
    ...accountBuilt.warnings,
    ...toAccountWarnings,
    ...nameScored.warnings,
    ...dateScored.warnings,
  ];

  return {
    transaction: {
      type: typeScored.field,
      amount: amountScored.field,
      name: nameScored.field,
      category: categoryBuilt.field,
      account: accountBuilt.field,
      ...(toAccountField ? { toAccount: toAccountField } : {}),
      date: dateScored.field,
      warnings,
    },
    carriedDate: nextCarriedDate,
  };
}
