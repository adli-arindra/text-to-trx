import type { DateWords, LanguagePack } from '../../lang/types';
import type { Field } from '../../types';

export interface DateExtraction {
  field: Field<string>;
  matchedText: string | null;
}

function escapePhrase(phrase: string): string {
  return phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s+');
}

function phraseGroup(phrases: string[]): string {
  return [...phrases]
    .sort((a, b) => b.length - a.length)
    .map(escapePhrase)
    .join('|');
}

function ordinalSuffixAlternation(ordinalSuffix: RegExp): string {
  const match = /\(([^()]+)\)\s*$/.exec(ordinalSuffix.source);
  return match ? match[1]! : '';
}

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

function formatDate(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function addDays(date: Date, days: number): Date {
  const d = startOfDay(date);
  d.setDate(d.getDate() + days);
  return d;
}

function mostRecentWeekday(targetWeekday: number, referenceDate: Date): Date {
  const ref = startOfDay(referenceDate);
  let diff = (ref.getDay() - targetWeekday + 7) % 7;
  if (diff === 0) diff = 7;
  return addDays(ref, -diff);
}

function resolveOrdinalDay(day: number, referenceDate: Date): Date {
  const ref = startOfDay(referenceDate);
  const candidate = new Date(ref.getFullYear(), ref.getMonth(), day);
  if (candidate.getTime() > ref.getTime()) {
    return new Date(ref.getFullYear(), ref.getMonth() - 1, day);
  }
  return candidate;
}

function resolveMonthDay(
  monthIndex: number,
  day: number,
  referenceDate: Date
): { date: Date; movedBack: boolean } {
  const ref = startOfDay(referenceDate);
  const candidate = new Date(ref.getFullYear(), monthIndex, day);
  if (candidate.getTime() > ref.getTime()) {
    return { date: new Date(ref.getFullYear() - 1, monthIndex, day), movedBack: true };
  }
  return { date: candidate, movedBack: false };
}

function matchMonthDay(
  lower: string,
  dates: DateWords,
  referenceDate: Date
): DateExtraction | null {
  const monthNames = Object.keys(dates.months)
    .sort((a, b) => b.length - a.length)
    .join('|');
  const suffixAlt = ordinalSuffixAlternation(dates.ordinalSuffix);
  const dayPattern = suffixAlt ? `(\\d{1,2})(?:${suffixAlt})?` : `(\\d{1,2})`;
  const re = new RegExp(`\\b(${monthNames})\\.?\\s+${dayPattern}\\b`, 'i');
  const match = re.exec(lower);
  if (!match) return null;

  const monthIndex = dates.months[match[1]!.toLowerCase()];
  if (monthIndex === undefined) return null;

  const day = Number(match[2]);
  const { date, movedBack } = resolveMonthDay(monthIndex, day, referenceDate);
  return {
    field: { value: formatDate(date), confidence: movedBack ? 0.6 : 0.85 },
    matchedText: match[0],
  };
}

function matchOrdinalDay(
  lower: string,
  dates: DateWords,
  referenceDate: Date
): DateExtraction | null {
  const match = dates.ordinalSuffix.exec(lower);
  if (!match) return null;

  const day = Number(match[1]);
  const date = resolveOrdinalDay(day, referenceDate);
  return { field: { value: formatDate(date), confidence: 0.75 }, matchedText: match[0] };
}

function matchDaysAgo(lower: string, dates: DateWords, referenceDate: Date): DateExtraction | null {
  const match = dates.daysAgo.exec(lower);
  if (!match) return null;

  const n = Number(match[1]);
  const date = addDays(referenceDate, -n);
  return { field: { value: formatDate(date), confidence: 0.9 }, matchedText: match[0] };
}

function matchPhraseList(
  lower: string,
  phrases: string[],
  resolve: (referenceDate: Date) => Date,
  referenceDate: Date,
  confidence: number
): DateExtraction | null {
  if (phrases.length === 0) return null;
  const re = new RegExp(`\\b(?:${phraseGroup(phrases)})\\b`, 'i');
  const match = re.exec(lower);
  if (!match) return null;

  return {
    field: { value: formatDate(resolve(referenceDate)), confidence },
    matchedText: match[0],
  };
}

function matchLastWeekday(
  lower: string,
  dates: DateWords,
  referenceDate: Date
): DateExtraction | null {
  if (dates.weekdays.length === 0 || dates.lastWord.length === 0) return null;

  const weekdayGroup = phraseGroup(dates.weekdays);
  const lastWordGroup = phraseGroup(dates.lastWord);
  const re = new RegExp(`\\b(?:${lastWordGroup})\\s+(${weekdayGroup})\\b`, 'i');
  const match = re.exec(lower);
  if (!match) return null;

  const targetWeekday = dates.weekdays.indexOf(match[1]!.toLowerCase());
  if (targetWeekday === -1) return null;

  const date = mostRecentWeekday(targetWeekday, referenceDate);
  return { field: { value: formatDate(date), confidence: 0.85 }, matchedText: match[0] };
}

function matchWeekday(lower: string, dates: DateWords, referenceDate: Date): DateExtraction | null {
  if (dates.weekdays.length === 0) return null;

  const weekdayGroup = phraseGroup(dates.weekdays);
  const re = new RegExp(`\\b(${weekdayGroup})\\b`, 'i');
  const match = re.exec(lower);
  if (!match) return null;

  const targetWeekday = dates.weekdays.indexOf(match[1]!.toLowerCase());
  if (targetWeekday === -1) return null;

  const date = mostRecentWeekday(targetWeekday, referenceDate);
  return { field: { value: formatDate(date), confidence: 0.7 }, matchedText: match[0] };
}

export function extractDate(
  text: string,
  language: LanguagePack,
  referenceDate: Date
): DateExtraction {
  const { dates } = language;
  const lower = text.toLowerCase();

  const matchers: Array<() => DateExtraction | null> = [
    () => matchMonthDay(lower, dates, referenceDate),
    () => matchOrdinalDay(lower, dates, referenceDate),
    () => matchDaysAgo(lower, dates, referenceDate),
    () =>
      matchPhraseList(
        lower,
        dates.dayBeforeYesterday,
        (ref) => addDays(ref, -2),
        referenceDate,
        0.9
      ),
    () => matchLastWeekday(lower, dates, referenceDate),
    () => matchWeekday(lower, dates, referenceDate),
    () => matchPhraseList(lower, dates.yesterday, (ref) => addDays(ref, -1), referenceDate, 0.9),
    () => matchPhraseList(lower, dates.today, (ref) => startOfDay(ref), referenceDate, 0.9),
  ];

  for (const matcher of matchers) {
    const result = matcher();
    if (result) return result;
  }

  return {
    field: { value: formatDate(startOfDay(referenceDate)), confidence: 0.5 },
    matchedText: null,
  };
}
