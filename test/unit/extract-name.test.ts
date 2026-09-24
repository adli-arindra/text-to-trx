import { describe, expect, it } from 'vitest';
import { normalize } from '../../src/pipeline/normalize';
import { convertNumbers } from '../../src/pipeline/numbers';
import { segment } from '../../src/pipeline/segment';
import { extractAccounts } from '../../src/pipeline/extract/account';
import { extractTypeKeyword } from '../../src/pipeline/extract/typeKeywords';
import { extractName } from '../../src/pipeline/extract/name';
import { createTypeRegistry } from '../../src/registry/types';
import { en } from '../../src/lang/en';

const registry = createTypeRegistry({ language: en });

function candidateFor(input: string): string {
  const normalized = normalize(input, en);
  const numbers = convertNumbers(normalized.text, en);
  const segments = segment(numbers.text, numbers.matches, en);
  const seg = segments[0]!;
  const accounts = extractAccounts(seg.text, en);
  const keywordMatch = extractTypeKeyword(seg.text, registry);
  return extractName({ segment: seg, language: en, dateMatchedText: null, accounts, keywordMatch });
}

describe('extractName', () => {
  it('strips the amount and keyword, leaving the name', () => {
    expect(candidateFor('spent 12 on lunch')).toBe('lunch');
  });

  it('strips an income keyword and shorthand amount', () => {
    expect(candidateFor('got paid 3k salary')).toBe('salary');
  });

  it('strips a "from" account phrase entirely', () => {
    expect(candidateFor('spent 20 from savings')).toBe('');
  });

  it('strips both "from" and "to" account phrases for a transfer', () => {
    expect(candidateFor('transferred 200 from checking to savings')).toBe('');
  });

  it('returns an empty string when only the amount, keyword and stopwords are present', () => {
    expect(candidateFor('spent 20 on the')).toBe('');
  });
});
