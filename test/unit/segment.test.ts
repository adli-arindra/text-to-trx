import { describe, expect, it } from 'vitest';
import { normalize } from '../../src/pipeline/normalize';
import { convertNumbers } from '../../src/pipeline/numbers';
import { segment } from '../../src/pipeline/segment';
import { en } from '../../src/lang/en';

function run(input: string) {
  const normalized = normalize(input, en);
  const numbers = convertNumbers(normalized.text, en);
  return segment(numbers.text, numbers.matches, en);
}

describe('segment', () => {
  it('returns a single segment for text with one amount', () => {
    const segments = run('spent 12 on lunch');
    expect(segments).toHaveLength(1);
    expect(segments[0].text).toBe('spent 12 on lunch');
    expect(segments[0].amounts).toHaveLength(1);
  });

  it('returns a single segment for text with no amount', () => {
    const segments = run('spent money on lunch');
    expect(segments).toHaveLength(1);
    expect(segments[0].amounts).toHaveLength(0);
  });

  it('splits on "and" between two amounts', () => {
    const segments = run('spent 10 on coffee and 20 on lunch');
    expect(segments).toHaveLength(2);
    expect(segments[0].text).toBe('spent 10 on coffee');
    expect(segments[1].text).toBe('20 on lunch');
    expect(segments[0].amounts.map((a) => a.value)).toEqual([10]);
    expect(segments[1].amounts.map((a) => a.value)).toEqual([20]);
  });

  it('splits on a comma between two amounts', () => {
    const segments = run('coffee 4.50, sandwich 8');
    expect(segments).toHaveLength(2);
    expect(segments.map((s) => s.amounts.length)).toEqual([1, 1]);
  });

  it('keeps "and" inside a number phrase from splitting a segment', () => {
    const segments = run('got paid one hundred and twenty today');
    expect(segments).toHaveLength(1);
    expect(segments[0].amounts).toHaveLength(1);
    expect(segments[0].amounts[0].value).toBe(120);
  });

  it('handles three amounts in one sentence', () => {
    const segments = run('spent 10 on coffee and 20 on lunch and 5 on a snack');
    expect(segments).toHaveLength(3);
    expect(segments.map((s) => s.amounts[0]?.value)).toEqual([10, 20, 5]);
  });

  it('keeps amounts together in one segment when no connector separates them', () => {
    const segments = run('bought 3 coffees for 12');
    expect(segments).toHaveLength(1);
    expect(segments[0].amounts.map((a) => a.value)).toEqual([3, 12]);
  });
});
