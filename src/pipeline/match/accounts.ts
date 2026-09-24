import type { AccountDefinition, AccountRef } from '../../types';
import { similarity } from './similarity';

export interface AccountMatch {
  account: AccountRef;
  confidence: number;
}

const MIN_CONFIDENCE = 0.5;

export function matchAccount(
  candidate: string,
  accounts: AccountDefinition[]
): AccountMatch | null {
  if (!candidate.trim() || accounts.length === 0) return null;

  let best: { account: AccountDefinition; score: number } | null = null;

  for (const account of accounts) {
    const names = [account.name, ...(account.aliases ?? [])];
    for (const name of names) {
      const score = similarity(candidate, name);
      if (score < MIN_CONFIDENCE) continue;
      if (!best || score > best.score) {
        best = { account, score };
      }
    }
  }

  if (!best) return null;

  return {
    account: { id: best.account.id, name: best.account.name },
    confidence: best.score,
  };
}
