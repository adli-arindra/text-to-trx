import { describe, expect, it } from 'vitest';
import { createTypeRegistry } from '../../src/registry/types';
import { en } from '../../src/lang/en';

describe('createTypeRegistry', () => {
  it('registers the default types with keywords from the language pack', () => {
    const registry = createTypeRegistry({ language: en });

    expect(registry.has('expense')).toBe(true);
    expect(registry.has('income')).toBe(true);
    expect(registry.has('transfer')).toBe(true);
    expect(registry.keywordsFor('expense')).toContain('spent');
    expect(registry.list()).toHaveLength(3);
  });

  it('respects a restricted list of types', () => {
    const registry = createTypeRegistry({ language: en, types: ['expense'] });

    expect(registry.has('expense')).toBe(true);
    expect(registry.has('income')).toBe(false);
    expect(registry.list()).toHaveLength(1);
  });

  it('allows registering a custom type with its own keywords', () => {
    const registry = createTypeRegistry({
      language: en,
      customTypes: [{ id: 'refund', keywords: ['refunded', 'got a refund'] }],
    });

    expect(registry.has('refund')).toBe(true);
    expect(registry.keywordsFor('refund')).toEqual(['refunded', 'got a refund']);
  });

  it('returns an empty keyword list for an unknown type', () => {
    const registry = createTypeRegistry({ language: en });

    expect(registry.keywordsFor('unknown')).toEqual([]);
  });
});
