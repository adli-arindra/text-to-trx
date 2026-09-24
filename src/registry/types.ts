import type { TransactionType } from '../types';
import type { LanguagePack } from '../lang/types';

export interface TransactionTypeDefinition {
  id: TransactionType;
  keywords: string[];
}

export interface TypeRegistry {
  list(): TransactionTypeDefinition[];
  has(id: TransactionType): boolean;
  keywordsFor(id: TransactionType): string[];
}

export interface CreateTypeRegistryOptions {
  language: LanguagePack;
  types?: TransactionType[];
  customTypes?: TransactionTypeDefinition[];
}

const DEFAULT_TYPES: TransactionType[] = ['expense', 'income', 'transfer'];

export function createTypeRegistry(options: CreateTypeRegistryOptions): TypeRegistry {
  const { language, types = DEFAULT_TYPES, customTypes = [] } = options;

  const definitions = new Map<TransactionType, TransactionTypeDefinition>();

  for (const id of types) {
    definitions.set(id, { id, keywords: language.typeKeywords[id] ?? [] });
  }
  for (const custom of customTypes) {
    definitions.set(custom.id, custom);
  }

  return {
    list(): TransactionTypeDefinition[] {
      return Array.from(definitions.values());
    },
    has(id: TransactionType): boolean {
      return definitions.has(id);
    },
    keywordsFor(id: TransactionType): string[] {
      return definitions.get(id)?.keywords ?? [];
    },
  };
}
