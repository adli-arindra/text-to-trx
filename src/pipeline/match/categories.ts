import type { CategoryDefinition, CategoryRef } from '../../types';
import { similarity } from './similarity';

export interface CategoryMatch {
  category: CategoryRef;
  confidence: number;
}

const MIN_CONFIDENCE = 0.5;

export function matchCategory(
  candidate: string,
  categories: CategoryDefinition[]
): CategoryMatch | null {
  if (!candidate.trim() || categories.length === 0) return null;

  let best: { category: CategoryDefinition; score: number } | null = null;

  for (const category of categories) {
    const names = [category.name, ...(category.aliases ?? [])];
    for (const name of names) {
      const score = similarity(candidate, name);
      if (score < MIN_CONFIDENCE) continue;
      if (!best || score > best.score) {
        best = { category, score };
      }
    }
  }

  if (!best) return null;

  return {
    category: { id: best.category.id, name: best.category.name },
    confidence: best.score,
  };
}
