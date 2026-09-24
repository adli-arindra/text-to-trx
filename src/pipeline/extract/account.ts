import type { LanguagePack } from '../../lang/types';

export interface AccountExtraction {
  from: string | null;
  to: string | null;
  using: string | null;
  usingMarker: string | null;
}

type MarkerCategory = 'from' | 'to' | 'using';

interface Marker {
  index: number;
  end: number;
  category: MarkerCategory;
  text: string;
}

function escapePhrase(phrase: string): string {
  return phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s+');
}

function phraseGroup(phrases: string[]): string {
  return [...phrases]
    .sort((a, b) => b.length - a.length)
    .map(escapePhrase)
    .join('|');
}

function buildMarkerRegex(language: LanguagePack): RegExp {
  const from = phraseGroup(language.accountPhrases.from);
  const to = phraseGroup(language.accountPhrases.to);
  const using = phraseGroup(language.accountPhrases.using);
  return new RegExp(`\\b(?:(${from})|(${to})|(${using}))\\b`, 'gi');
}

function stripLeadingStopwords(phrase: string, stopwords: string[]): string {
  const tokens = phrase.split(/\s+/).filter(Boolean);
  while (tokens.length > 0 && stopwords.includes(tokens[0]!.toLowerCase())) {
    tokens.shift();
  }
  return tokens.join(' ');
}

export function extractAccounts(text: string, language: LanguagePack): AccountExtraction {
  const regex = buildMarkerRegex(language);
  const markers: Marker[] = [];
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text))) {
    const category: MarkerCategory =
      match[1] !== undefined ? 'from' : match[2] !== undefined ? 'to' : 'using';
    markers.push({
      index: match.index,
      end: match.index + match[0].length,
      category,
      text: match[0].toLowerCase(),
    });
  }

  const result: AccountExtraction = { from: null, to: null, using: null, usingMarker: null };

  for (let i = 0; i < markers.length; i++) {
    const marker = markers[i]!;

    if (marker.category === 'using') {
      const isWeakMarker = marker.text === 'on';
      const currentIsWeak = result.usingMarker === 'on';
      if (result.using !== null && !(currentIsWeak && !isWeakMarker)) continue;
    } else if (result[marker.category] !== null) {
      continue;
    }

    const spanEnd = markers[i + 1]?.index ?? text.length;
    const raw = text.slice(marker.end, spanEnd).replace(/[,.]/g, ' ').trim();
    const cleaned = stripLeadingStopwords(raw, language.stopwords);
    if (!cleaned) continue;

    if (marker.category === 'using') {
      result.using = cleaned;
      result.usingMarker = marker.text;
    } else {
      result[marker.category] = cleaned;
    }
  }

  return result;
}
