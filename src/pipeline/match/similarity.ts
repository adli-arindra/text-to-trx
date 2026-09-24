export function levenshteinDistance(a: string, b: string): number {
  const s = a.toLowerCase();
  const t = b.toLowerCase();

  if (s === t) return 0;
  if (s.length === 0) return t.length;
  if (t.length === 0) return s.length;

  let prev = Array.from({ length: t.length + 1 }, (_, i) => i);
  let curr = new Array<number>(t.length + 1).fill(0);

  for (let i = 1; i <= s.length; i++) {
    curr[0] = i;
    for (let j = 1; j <= t.length; j++) {
      const cost = s[i - 1] === t[j - 1] ? 0 : 1;
      curr[j] = Math.min(curr[j - 1]! + 1, prev[j]! + 1, prev[j - 1]! + cost);
    }
    [prev, curr] = [curr, prev];
  }

  return prev[t.length]!;
}

export function levenshteinSimilarity(a: string, b: string): number {
  const s = a.trim().toLowerCase();
  const t = b.trim().toLowerCase();
  if (s === t) return 1;
  const maxLen = Math.max(s.length, t.length);
  if (maxLen === 0) return 1;
  return 1 - levenshteinDistance(s, t) / maxLen;
}

function tokenize(text: string): string[] {
  return text.trim().toLowerCase().split(/\s+/).filter(Boolean);
}

const TOKEN_MATCH_THRESHOLD = 0.75;

export function tokenSimilarity(a: string, b: string): number {
  const tokensA = tokenize(a);
  const tokensB = tokenize(b);
  if (tokensA.length === 0 || tokensB.length === 0) return 0;

  const remaining = [...tokensB];
  let matched = 0;

  for (const tokenA of tokensA) {
    let bestIdx = -1;
    let bestScore = 0;
    for (let i = 0; i < remaining.length; i++) {
      const score = levenshteinSimilarity(tokenA, remaining[i]!);
      if (score > bestScore) {
        bestScore = score;
        bestIdx = i;
      }
    }
    if (bestScore >= TOKEN_MATCH_THRESHOLD) {
      matched += 1;
      remaining.splice(bestIdx, 1);
    }
  }

  return matched / Math.max(tokensA.length, tokensB.length);
}

export function similarity(a: string, b: string): number {
  const s = a.trim().toLowerCase();
  const t = b.trim().toLowerCase();
  if (!s || !t) return 0;
  if (s === t) return 1;
  return Math.max(levenshteinSimilarity(s, t), tokenSimilarity(s, t));
}
