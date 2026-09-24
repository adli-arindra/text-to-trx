import { describe, expect, it } from 'vitest';
import { parseNumberWords, parseAmount, convertNumbers } from '../../src/pipeline/numbers';
import { en } from '../../src/lang/en';

describe('parseNumberWords', () => {
  it('parses simple units and tens', () => {
    expect(parseNumberWords(['fifty'], en)).toBe(50);
    expect(parseNumberWords(['twenty', 'five'], en)).toBe(25);
    expect(parseNumberWords(['seven'], en)).toBe(7);
  });

  it('parses hundreds, including "and"', () => {
    expect(parseNumberWords(['one', 'hundred', 'and', 'twenty'], en)).toBe(120);
    expect(parseNumberWords(['a', 'hundred'], en)).toBe(100);
    expect(parseNumberWords(['twelve', 'hundred'], en)).toBe(1200);
  });

  it('parses thousands and millions, including shorthand words', () => {
    expect(parseNumberWords(['three', 'thousand'], en)).toBe(3000);
    expect(parseNumberWords(['two', 'million'], en)).toBe(2_000_000);
    expect(parseNumberWords(['twenty', 'k'], en)).toBe(20000);
    expect(parseNumberWords(['one', 'thousand', 'two', 'hundred'], en)).toBe(1200);
  });

  it('parses decimals via the decimal word', () => {
    expect(parseNumberWords(['two', 'point', 'five'], en)).toBe(2.5);
    expect(parseNumberWords(['one', 'point', 'two', 'five'], en)).toBe(1.25);
  });

  it('returns null for the ambiguous unit-then-ten pattern', () => {
    expect(parseNumberWords(['two', 'fifty'], en)).toBeNull();
  });

  it('returns null for non-number tokens', () => {
    expect(parseNumberWords(['lunch'], en)).toBeNull();
    expect(parseNumberWords([], en)).toBeNull();
  });
});

describe('parseAmount', () => {
  it('parses plain digits', () => {
    expect(parseAmount('50', en)).toEqual({ value: 50 });
    expect(parseAmount('12.50', en)).toEqual({ value: 12.5 });
  });

  it('parses thousands separators', () => {
    expect(parseAmount('1,200', en)).toEqual({ value: 1200 });
    expect(parseAmount('1,200.50', en)).toEqual({ value: 1200.5 });
  });

  it('parses currency markers', () => {
    expect(parseAmount('$50', en)).toEqual({ value: 50 });
    expect(parseAmount('50 dollars', en)).toEqual({ value: 50 });
    expect(parseAmount('50 bucks', en)).toEqual({ value: 50 });
    expect(parseAmount('50 usd', en)).toEqual({ value: 50 });
  });

  it('parses number words', () => {
    expect(parseAmount('fifty', en)).toEqual({ value: 50 });
    expect(parseAmount('twenty five', en)).toEqual({ value: 25 });
    expect(parseAmount('twenty-five', en)).toEqual({ value: 25 });
    expect(parseAmount('one hundred and twenty', en)).toEqual({ value: 120 });
    expect(parseAmount('a hundred', en)).toEqual({ value: 100 });
    expect(parseAmount('two point five', en)).toEqual({ value: 2.5 });
  });

  it('parses digit + word shorthand', () => {
    expect(parseAmount('50k', en)).toEqual({ value: 50000 });
    expect(parseAmount('1.5k', en)).toEqual({ value: 1500 });
    expect(parseAmount('2m', en)).toEqual({ value: 2_000_000 });
    expect(parseAmount('1.5 million', en)).toEqual({ value: 1_500_000 });
    expect(parseAmount('3 thousand', en)).toEqual({ value: 3000 });
    expect(parseAmount('two million', en)).toEqual({ value: 2_000_000 });
    expect(parseAmount('twenty k', en)).toEqual({ value: 20000 });
  });

  it('parses mixed digit, scale word and currency marker', () => {
    expect(parseAmount('1.5 million dollars', en)).toEqual({ value: 1_500_000 });
  });

  it('flags the "two fifty" style ambiguity', () => {
    expect(parseAmount('two fifty', en)).toEqual({ value: 2.5, ambiguous: [2.5, 250] });
  });

  it('returns null for non-amount text', () => {
    expect(parseAmount('lunch', en)).toBeNull();
    expect(parseAmount('', en)).toBeNull();
  });
});

describe('convertNumbers', () => {
  it('converts a spelled-out number to digits', () => {
    const result = convertNumbers('spent twenty five on lunch', en);
    expect(result.text).toBe('spent 25 on lunch');
    expect(result.matches).toHaveLength(1);
    expect(result.matches[0]).toMatchObject({ value: 25, raw: 'twenty five' });
  });

  it('does not treat "and" between transactions as part of a number', () => {
    const result = convertNumbers('spent 10 on coffee and 20 on lunch', en);
    expect(result.text).toBe('spent 10 on coffee and 20 on lunch');
    expect(result.matches).toHaveLength(2);
  });

  it('keeps "and" inside a number phrase intact', () => {
    const result = convertNumbers('got paid one hundred and twenty today', en);
    expect(result.text).toBe('got paid 120 today');
    expect(result.matches).toHaveLength(1);
    expect(result.matches[0].value).toBe(120);
  });

  it('tags a currency marker without consuming it from the text', () => {
    const result = convertNumbers('spent fifty dollars on gas', en);
    expect(result.text).toBe('spent 50 dollars on gas');
    expect(result.matches[0].hasCurrencyMarker).toBe(true);
  });

  it('tags a leading dollar sign', () => {
    const result = convertNumbers('spent $50 on gas', en);
    expect(result.text).toBe('spent 50 on gas');
    expect(result.matches[0].hasCurrencyMarker).toBe(true);
  });

  it('leaves plain digit amounts alone besides re-emitting them', () => {
    const result = convertNumbers('spent 12.50 on lunch', en);
    expect(result.text).toBe('spent 12.5 on lunch');
    expect(result.matches[0].value).toBe(12.5);
  });

  it('converts multiple amounts in one sentence', () => {
    const result = convertNumbers('coffee 4.50 and a sandwich 8', en);
    expect(result.matches.map((m) => m.value)).toEqual([4.5, 8]);
  });

  it('recognizes a digit amount with trailing punctuation attached', () => {
    const result = convertNumbers('coffee 4.50, sandwich 8', en);
    expect(result.matches.map((m) => m.value)).toEqual([4.5, 8]);
  });
});
