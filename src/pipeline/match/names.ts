import type { KnownName } from '../../types';
import { similarity } from './similarity';

export interface NameMatch {
  name: string;
  categoryId: string;
  confidence: number;
}

const MIN_CONFIDENCE = 0.5;

export function matchName(candidate: string, knownNames: KnownName[]): NameMatch | null {
  if (!candidate.trim() || knownNames.length === 0) return null;

  let best: { entry: KnownName; score: number } | null = null;

  for (const entry of knownNames) {
    const score = similarity(candidate, entry.name);
    if (score < MIN_CONFIDENCE) continue;
    if (!best || score > best.score || (score === best.score && entry.count > best.entry.count)) {
      best = { entry, score };
    }
  }

  if (!best) return null;

  const sameName = knownNames.filter(
    (n) => n.name.toLowerCase() === best!.entry.name.toLowerCase()
  );
  const top = sameName.reduce((a, b) => (b.count > a.count ? b : a));

  return { name: top.name, categoryId: top.categoryId, confidence: best.score };
}
