import type { TransactionType } from '../../types';
import type { TypeRegistry } from '../../registry/types';

export interface TypeKeywordMatch {
  type: TransactionType;
  keyword: string;
}

function escapeKeyword(keyword: string): string {
  return keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s+');
}

export function extractTypeKeyword(text: string, registry: TypeRegistry): TypeKeywordMatch | null {
  let best: { type: TransactionType; keyword: string; index: number } | null = null;

  for (const definition of registry.list()) {
    for (const keyword of definition.keywords) {
      const re = new RegExp(`\\b${escapeKeyword(keyword)}\\b`, 'i');
      const match = re.exec(text);
      if (!match) continue;

      if (
        !best ||
        match.index < best.index ||
        (match.index === best.index && keyword.length > best.keyword.length)
      ) {
        best = { type: definition.id, keyword, index: match.index };
      }
    }
  }

  return best ? { type: best.type, keyword: best.keyword } : null;
}
