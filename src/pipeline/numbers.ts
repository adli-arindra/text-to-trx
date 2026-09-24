import type { LanguagePack } from '../lang/types';

export interface AmountParseResult {
  value: number;
  ambiguous?: number[];
}

export interface NumberMatch {
  start: number;
  end: number;
  raw: string;
  value: number;
  hasCurrencyMarker: boolean;
  ambiguous?: number[];
}

export interface ConvertNumbersResult {
  text: string;
  matches: NumberMatch[];
}

const DIGIT_RE = /^\$?(\d{1,3}(?:,\d{3})*|\d+)(\.\d+)?([km])?$/i;
const DIGIT_ONLY_RE = /^\$?(\d+(?:,\d{3})*)(\.\d+)?$/;

function tokenizeWords(raw: string): string[] {
  return raw
    .trim()
    .toLowerCase()
    .split(/[\s-]+/)
    .filter(Boolean);
}

export function parseNumberWords(tokens: string[], language: LanguagePack): number | null {
  const { units, tens, scales, decimalWords, joinWords } = language.numbers;

  const decimalIdx = tokens.findIndex((t) => decimalWords.includes(t));
  if (decimalIdx !== -1) {
    if (decimalIdx === 0 || decimalIdx === tokens.length - 1) return null;
    const intPart = parseNumberWords(tokens.slice(0, decimalIdx), language);
    if (intPart === null) return null;
    let fracDigits = '';
    for (const t of tokens.slice(decimalIdx + 1)) {
      const digit = units[t];
      if (digit === undefined || digit > 9) return null;
      fracDigits += String(digit);
    }
    if (!fracDigits) return null;
    return Number(`${intPart}.${fracDigits}`);
  }

  if (tokens.length === 2) {
    const unit = units[tokens[0] as string];
    const ten = tens[tokens[1] as string];
    if (unit !== undefined && unit >= 1 && unit <= 9 && ten !== undefined) {
      return null;
    }
  }

  let total = 0;
  let current = 0;
  let matched = false;

  for (const token of tokens) {
    if (joinWords.includes(token)) continue;

    if (token === 'a' || token === 'an') {
      current += 1;
      matched = true;
      continue;
    }
    if (units[token] !== undefined) {
      current += units[token];
      matched = true;
      continue;
    }
    if (tens[token] !== undefined) {
      current += tens[token];
      matched = true;
      continue;
    }
    if (scales[token] !== undefined) {
      const scale = scales[token];
      current = (current === 0 ? 1 : current) * scale;
      if (scale >= 1000) {
        total += current;
        current = 0;
      }
      matched = true;
      continue;
    }
    return null;
  }

  if (!matched) return null;
  return total + current;
}

export function parseAmount(raw: string, language: LanguagePack): AmountParseResult | null {
  const trimmed = raw.trim().toLowerCase();
  if (!trimmed) return null;

  if (!/\s/.test(trimmed)) {
    const m = trimmed.match(DIGIT_RE);
    if (m) {
      const value = applyShorthandSuffix(Number(m[1]!.replace(/,/g, '') + (m[2] ?? '')), m[3]);
      if (!Number.isNaN(value)) return { value };
    }
  }

  const tokens = tokenizeWords(trimmed);
  const first = tokens[0];

  if (tokens.length >= 2 && first !== undefined) {
    const digitOnly = first.match(DIGIT_ONLY_RE);
    if (digitOnly) {
      const base = Number(digitOnly[1]!.replace(/,/g, '') + (digitOnly[2] ?? ''));
      let rest = tokens.slice(1);
      let value = base;
      const scale = rest[0] !== undefined ? language.numbers.scales[rest[0]] : undefined;
      if (scale !== undefined) {
        value = base * scale;
        rest = rest.slice(1);
      }
      if (rest.every((t) => language.currencyMarkers.includes(t)) && !Number.isNaN(value)) {
        return { value };
      }
    }

    const { units, tens } = language.numbers;
    const second = tokens[1];
    if (tokens.length === 2 && second !== undefined) {
      const unit = units[first];
      const ten = tens[second];
      if (unit !== undefined && unit >= 1 && unit <= 9 && ten !== undefined) {
        const fraction = Number(`${unit}.${ten}`);
        const whole = unit * 100 + ten;
        return { value: fraction, ambiguous: [fraction, whole] };
      }
    }
  }

  const parsed = parseNumberWords(tokens, language);
  if (parsed !== null) return { value: parsed };

  return null;
}

function applyShorthandSuffix(value: number, suffix: string | undefined): number {
  if (suffix?.toLowerCase() === 'k') return value * 1000;
  if (suffix?.toLowerCase() === 'm') return value * 1_000_000;
  return value;
}

function isWordNumberToken(token: string, language: LanguagePack): boolean {
  const { units, tens, scales, decimalWords } = language.numbers;
  return (
    units[token] !== undefined ||
    tens[token] !== undefined ||
    scales[token] !== undefined ||
    decimalWords.includes(token) ||
    token === 'a' ||
    token === 'an'
  );
}

interface TextToken {
  text: string;
  start: number;
  end: number;
}

function tokenizeText(text: string): TextToken[] {
  const tokens: TextToken[] = [];
  const regex = /\S+/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(text))) {
    tokens.push({ text: match[0], start: match.index, end: match.index + match[0].length });
  }
  return tokens;
}

export function convertNumbers(text: string, language: LanguagePack): ConvertNumbersResult {
  const tokens = tokenizeText(text);
  const matches: NumberMatch[] = [];
  let outText = '';
  let cursor = 0;
  let i = 0;

  while (i < tokens.length) {
    const token = tokens[i];
    if (!token) break;
    const lower = token.text.toLowerCase();

    let windowEnd = -1;

    if (!/\s/.test(lower) && DIGIT_RE.test(lower)) {
      windowEnd = i + 1;
      const next = tokens[windowEnd]?.text.toLowerCase();
      if (next !== undefined && language.numbers.scales[next] !== undefined) {
        windowEnd += 1;
      }
    } else if (lower !== 'a' && lower !== 'an' && isWordNumberToken(lower, language)) {
      windowEnd = i + 1;
      while (windowEnd < tokens.length) {
        const t = tokens[windowEnd]?.text.toLowerCase();
        if (t === undefined) break;
        const isJoin = language.numbers.joinWords.includes(t);

        if (!isJoin && !isWordNumberToken(t, language)) break;

        if (isJoin) {
          const after = tokens[windowEnd + 1]?.text.toLowerCase();
          const afterContinues =
            after !== undefined &&
            isWordNumberToken(after, language) &&
            !language.numbers.joinWords.includes(after);
          if (!afterContinues) break;
        }
        windowEnd += 1;
      }
    }

    if (windowEnd > i) {
      const raw = tokens
        .slice(i, windowEnd)
        .map((t) => t.text.toLowerCase())
        .join(' ');
      const parsed = parseAmount(raw, language);
      if (parsed) {
        let hasCurrencyMarker = lower.startsWith('$');
        const after = tokens[windowEnd]?.text.toLowerCase();
        if (after !== undefined && language.currencyMarkers.includes(after)) {
          hasCurrencyMarker = true;
        }

        outText += text.slice(cursor, token.start);
        const replacement = String(parsed.value);
        const matchStart = outText.length;
        outText += replacement;
        matches.push({
          start: matchStart,
          end: matchStart + replacement.length,
          raw,
          value: parsed.value,
          hasCurrencyMarker,
          ...(parsed.ambiguous ? { ambiguous: parsed.ambiguous } : {}),
        });
        cursor = tokens[windowEnd - 1]?.end ?? cursor;
        i = windowEnd;
        continue;
      }
    }

    i += 1;
  }

  outText += text.slice(cursor);
  return { text: outText, matches };
}
