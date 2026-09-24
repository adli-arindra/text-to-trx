import { describe, expect, it } from 'vitest';
import { normalize } from '../../src/pipeline/normalize';
import { en } from '../../src/lang/en';

function reconstruct(original: string, result: ReturnType<typeof normalize>): string {
  return Array.from(result.text)
    .map((_, i) => original[result.map[i]])
    .join('');
}

describe('normalize', () => {
  it('lowercases the text', () => {
    expect(normalize('Spent 12 On LUNCH', en).text).toBe('spent 12 on lunch');
  });

  it('collapses extra whitespace', () => {
    expect(normalize('spent   12   on lunch', en).text).toBe('spent 12 on lunch');
  });

  it('strips single-word fillers', () => {
    expect(normalize('um spent 12 on uh lunch', en).text).toBe('spent 12 on lunch');
  });

  it('strips multi-word fillers', () => {
    expect(normalize('you know i spent 12 on lunch', en).text).toBe('i spent 12 on lunch');
  });

  it('strips a filler at the start and end of the text', () => {
    expect(normalize('like spent 12 on lunch um', en).text).toBe('spent 12 on lunch');
  });

  it('keeps a position map back to the original text', () => {
    const original = 'Spent  12 on LUNCH';
    const result = normalize(original, en);
    expect(result.map).toHaveLength(result.text.length);
    for (let i = 0; i < result.text.length; i++) {
      const originalChar = original[result.map[i]];
      if (result.text[i] !== ' ') {
        expect(originalChar.toLowerCase()).toBe(result.text[i]);
      }
    }
  });

  it('maps a filler-free span back to itself', () => {
    const original = 'spent 12 on lunch';
    const result = normalize(original, en);
    expect(reconstruct(original, result)).toBe('spent 12 on lunch');
  });
});
