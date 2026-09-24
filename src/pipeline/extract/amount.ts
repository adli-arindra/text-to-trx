import type { LanguagePack } from '../../lang/types';
import type { Field, ParseWarning } from '../../types';
import type { NumberMatch } from '../numbers';
import type { Segment } from '../segment';

export interface AmountExtraction {
  field: Field<number>;
  warnings: ParseWarning[];
}

const NO_AMOUNT: AmountExtraction = {
  field: { value: null, confidence: 0 },
  warnings: [{ code: 'MISSING_AMOUNT' }],
};

function precedingWord(text: string, localStart: number): string | null {
  const before = text.slice(0, localStart).trimEnd();
  const match = /(\S+)\s*$/.exec(before);
  return match ? match[1]!.toLowerCase() : null;
}

function toExtraction(match: NumberMatch, confidence: number): AmountExtraction {
  const warnings: ParseWarning[] = [];
  if (match.ambiguous) {
    warnings.push({ code: 'AMBIGUOUS_AMOUNT', candidates: match.ambiguous });
  }
  return {
    field: {
      value: match.value,
      confidence: match.ambiguous ? Math.min(confidence, 0.6) : confidence,
    },
    warnings,
  };
}

export function extractAmount(segment: Segment, language: LanguagePack): AmountExtraction {
  const { amounts, text, start } = segment;

  if (amounts.length === 0) return NO_AMOUNT;
  if (amounts.length === 1) return toExtraction(amounts[0]!, 0.9);

  const marked = amounts.filter((a) => a.hasCurrencyMarker);
  if (marked.length > 0) {
    return toExtraction(marked[0]!, 0.9);
  }

  const priced = amounts.filter((a) => {
    const word = precedingWord(text, a.start - start);
    return word !== null && language.priceWords.includes(word);
  });
  if (priced.length > 0) {
    return toExtraction(priced[priced.length - 1]!, 0.85);
  }

  const last = amounts[amounts.length - 1]!;
  const extraction = toExtraction(last, 0.5);
  extraction.warnings.unshift({
    code: 'MULTIPLE_AMOUNTS',
    candidates: amounts.map((a) => a.value),
  });
  return extraction;
}
