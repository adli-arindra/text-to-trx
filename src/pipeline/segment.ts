import type { LanguagePack } from '../lang/types';
import type { NumberMatch } from './numbers';

export interface Segment {
  text: string;
  start: number;
  end: number;
  amounts: NumberMatch[];
}

function buildConnectorRegex(language: LanguagePack): RegExp {
  const phrases = [...language.connectors].sort((a, b) => b.length - a.length);
  const escaped = phrases.map((p) =>
    p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s+')
  );
  return new RegExp(`\\b(?:${escaped.join('|')})\\b|[,.]`, 'i');
}

function trimSpan(text: string, start: number, end: number): { start: number; end: number } {
  let s = start;
  let e = end;
  while (s < e && /\s/.test(text[s]!)) s++;
  while (e > s && /\s/.test(text[e - 1]!)) e--;
  return { start: s, end: e };
}

export function segment(text: string, amounts: NumberMatch[], language: LanguagePack): Segment[] {
  const sorted = [...amounts].sort((a, b) => a.start - b.start);

  if (sorted.length === 0) {
    const { start, end } = trimSpan(text, 0, text.length);
    return [{ text: text.slice(start, end), start, end, amounts: [] }];
  }

  const connectorRe = buildConnectorRegex(language);
  const segments: Segment[] = [];
  let segStart = 0;
  let pending: NumberMatch[] = [];

  for (let i = 0; i < sorted.length; i++) {
    pending.push(sorted[i]!);
    if (i === sorted.length - 1) break;

    const gapStart = sorted[i]!.end;
    const gapEnd = sorted[i + 1]!.start;
    const match = connectorRe.exec(text.slice(gapStart, gapEnd));
    if (!match) continue;

    const cutLeft = gapStart + match.index;
    const cutRight = gapStart + match.index + match[0].length;
    const { start, end } = trimSpan(text, segStart, cutLeft);
    segments.push({ text: text.slice(start, end), start, end, amounts: pending });
    pending = [];
    segStart = cutRight;
  }

  const { start, end } = trimSpan(text, segStart, text.length);
  segments.push({ text: text.slice(start, end), start, end, amounts: pending });

  return segments;
}
