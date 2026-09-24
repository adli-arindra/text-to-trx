import type { LanguagePack } from '../lang/types';

export interface NormalizeResult {
  text: string;
  map: number[];
}

interface Token {
  text: string;
  start: number;
  end: number;
}

function tokenize(text: string): Token[] {
  const tokens: Token[] = [];
  const regex = /\S+/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(text))) {
    tokens.push({ text: match[0], start: match.index, end: match.index + match[0].length });
  }
  return tokens;
}

export function normalize(text: string, language: LanguagePack): NormalizeResult {
  const tokens = tokenize(text);

  const singleFillers = new Set(
    language.fillers.filter((f) => !f.includes(' ')).map((f) => f.toLowerCase())
  );
  const phraseFillers = language.fillers
    .filter((f) => f.includes(' '))
    .map((f) => f.toLowerCase().split(/\s+/));

  const isFiller = new Array<boolean>(tokens.length).fill(false);

  for (let i = 0; i < tokens.length; i++) {
    if (singleFillers.has(tokens[i]!.text.toLowerCase())) {
      isFiller[i] = true;
    }
  }

  for (const phrase of phraseFillers) {
    for (let i = 0; i + phrase.length <= tokens.length; i++) {
      let matches = true;
      for (let j = 0; j < phrase.length; j++) {
        if (tokens[i + j]!.text.toLowerCase() !== phrase[j]) {
          matches = false;
          break;
        }
      }
      if (matches) {
        for (let j = 0; j < phrase.length; j++) isFiller[i + j] = true;
      }
    }
  }

  let outText = '';
  const map: number[] = [];
  let isFirstKept = true;

  for (let i = 0; i < tokens.length; i++) {
    if (isFiller[i]) continue;
    const token = tokens[i]!;

    if (!isFirstKept) {
      outText += ' ';
      map.push(Math.max(0, token.start - 1));
    }

    const lower = token.text.toLowerCase();
    for (let k = 0; k < lower.length; k++) {
      outText += lower[k];
      map.push(token.start + k);
    }
    isFirstKept = false;
  }

  return { text: outText, map };
}
