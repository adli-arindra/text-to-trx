import type { LanguagePack } from '../../lang/types';
import type { Segment } from '../segment';
import type { AccountExtraction } from './account';
import type { TypeKeywordMatch } from './typeKeywords';

export interface NameExtractionInput {
  segment: Segment;
  language: LanguagePack;
  dateMatchedText: string | null;
  accounts: AccountExtraction;
  keywordMatch: TypeKeywordMatch | null;
}

function escapePhrase(phrase: string): string {
  return phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s+');
}

function removeFirstOccurrence(text: string, phrase: string): string {
  const re = new RegExp(`\\b${escapePhrase(phrase)}\\b`, 'i');
  return text.replace(re, ' ');
}

export function removeAmountSpans(segment: Segment): string {
  let text = segment.text;
  const spans = segment.amounts
    .map((a) => ({ start: a.start - segment.start, end: a.end - segment.start }))
    .sort((a, b) => b.start - a.start);

  for (const span of spans) {
    text = text.slice(0, span.start) + ' ' + text.slice(span.end);
  }
  return text;
}

function removeMarkerAndValue(text: string, markerPhrases: string[], value: string | null): string {
  if (value === null) return text;

  let result = text;
  for (const phrase of [...markerPhrases].sort((a, b) => b.length - a.length)) {
    const re = new RegExp(`\\b${escapePhrase(phrase)}\\b`, 'i');
    if (re.test(result)) {
      result = result.replace(re, ' ');
      break;
    }
  }

  return removeFirstOccurrence(result, value);
}

function stripStopwords(text: string, stopwords: string[]): string {
  const stopSet = new Set(stopwords.map((s) => s.toLowerCase()));
  return text
    .split(/\s+/)
    .filter((token) => token && /[a-z0-9]/i.test(token) && !stopSet.has(token.toLowerCase()))
    .join(' ');
}

export function extractName(input: NameExtractionInput): string {
  const { segment, language, dateMatchedText, accounts, keywordMatch } = input;

  let text = removeAmountSpans(segment);

  if (dateMatchedText) {
    text = removeFirstOccurrence(text, dateMatchedText);
  }
  if (keywordMatch) {
    text = removeFirstOccurrence(text, keywordMatch.keyword);
  }

  text = removeMarkerAndValue(text, language.accountPhrases.from, accounts.from);
  text = removeMarkerAndValue(text, language.accountPhrases.to, accounts.to);

  // "on" doubles as both an account-using marker and a plain preposition
  // ("spent 12 on lunch"), so removing it here would eat the name itself.
  if (accounts.usingMarker !== 'on') {
    text = removeMarkerAndValue(text, language.accountPhrases.using, accounts.using);
  }

  return stripStopwords(text, language.stopwords).trim().replace(/\s+/g, ' ');
}
