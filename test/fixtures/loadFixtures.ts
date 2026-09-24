import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { ParseContext } from '../../src/types';

const here = path.dirname(fileURLToPath(import.meta.url));
const FIXTURES_DIR = path.join(here, 'en');
const CONTEXTS_DIR = path.join(here, 'contexts');

export interface ExpectedTransaction {
  type?: string;
  amount?: number;
  name?: string | null;
  category?: string | null;
  account?: string | null;
  toAccount?: string | null;
  date?: string;
}

export interface Fixture {
  id: string;
  input: string;
  referenceDate: string;
  context: string;
  expected: ExpectedTransaction[];
  tags: string[];
}

export function loadContext(name: string): ParseContext {
  const filePath = path.join(CONTEXTS_DIR, `${name}.json`);
  return JSON.parse(readFileSync(filePath, 'utf8')) as ParseContext;
}

export function loadFixtures(): Fixture[] {
  const files = readdirSync(FIXTURES_DIR)
    .filter((f) => f.endsWith('.json'))
    .sort();

  const fixtures: Fixture[] = [];
  for (const file of files) {
    const content = JSON.parse(readFileSync(path.join(FIXTURES_DIR, file), 'utf8')) as Fixture[];
    fixtures.push(...content);
  }
  return fixtures;
}

export function parseReferenceDate(value: string): Date {
  const [y, m, d] = value.split('-').map(Number);
  return new Date(y!, (m ?? 1) - 1, d ?? 1);
}
