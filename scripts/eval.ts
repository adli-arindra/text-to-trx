import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createParser } from '../src/parser';
import { en } from '../src/lang/en';
import { loadContext, loadFixtures, parseReferenceDate } from '../test/fixtures/loadFixtures';
import type { ParsedTransaction } from '../src/types';

const here = path.dirname(fileURLToPath(import.meta.url));
const BASELINE_PATH = path.join(here, '..', 'test', 'fixtures', 'baseline.json');
const EPSILON = 0.001;

const FIELD_NAMES = ['type', 'amount', 'name', 'category', 'account', 'toAccount', 'date'] as const;
type FieldName = (typeof FIELD_NAMES)[number];

const FIELD_ACCESSORS: Record<FieldName, (tx: ParsedTransaction) => unknown> = {
  type: (tx) => tx.type.value,
  amount: (tx) => tx.amount.value,
  name: (tx) => tx.name.value,
  category: (tx) => tx.category.value?.name ?? null,
  account: (tx) => tx.account.value?.name ?? null,
  toAccount: (tx) => tx.toAccount?.value?.name ?? null,
  date: (tx) => tx.date.value,
};

interface Tally {
  correct: number;
  total: number;
}

interface Report {
  fixtureCount: number;
  overall: number;
  transactionCount: number;
  fields: Record<string, number>;
  tags: Record<string, number>;
}

function record(tally: Tally, isCorrect: boolean): void {
  tally.total += 1;
  if (isCorrect) tally.correct += 1;
}

function ratio(t: Tally): number {
  return t.total === 0 ? 1 : t.correct / t.total;
}

function newTally(): Tally {
  return { correct: 0, total: 0 };
}

function main(): void {
  const parser = createParser({ language: en, currency: { code: 'USD', decimals: 2 } });
  const fixtures = loadFixtures();

  const fieldTallies: Record<FieldName, Tally> = {
    type: newTally(),
    amount: newTally(),
    name: newTally(),
    category: newTally(),
    account: newTally(),
    toAccount: newTally(),
    date: newTally(),
  };
  const tagTallies = new Map<string, Tally>();
  const countTally = newTally();

  for (const fixture of fixtures) {
    const context = loadContext(fixture.context);
    const result = parser.parse(fixture.input, context, {
      referenceDate: parseReferenceDate(fixture.referenceDate),
    });

    record(countTally, result.transactions.length === fixture.expected.length);

    const pairCount = Math.max(result.transactions.length, fixture.expected.length);
    for (let i = 0; i < pairCount; i++) {
      const expected = fixture.expected[i] as Record<string, unknown> | undefined;
      const actual = result.transactions[i];
      if (!expected) continue;

      for (const field of FIELD_NAMES) {
        if (!(field in expected)) continue;
        const isCorrect =
          actual !== undefined && FIELD_ACCESSORS[field](actual) === expected[field];
        record(fieldTallies[field], isCorrect);

        for (const tag of fixture.tags) {
          const tally = tagTallies.get(tag) ?? newTally();
          record(tally, isCorrect);
          tagTallies.set(tag, tally);
        }
      }
    }
  }

  const fields: Record<string, number> = {};
  let overallCorrect = 0;
  let overallTotal = 0;
  for (const field of FIELD_NAMES) {
    fields[field] = ratio(fieldTallies[field]);
    overallCorrect += fieldTallies[field].correct;
    overallTotal += fieldTallies[field].total;
  }

  const tags: Record<string, number> = {};
  for (const [tag, tally] of tagTallies) {
    tags[tag] = ratio(tally);
  }

  const report: Report = {
    fixtureCount: fixtures.length,
    overall: overallTotal === 0 ? 1 : overallCorrect / overallTotal,
    transactionCount: ratio(countTally),
    fields,
    tags,
  };

  printReport(report, fieldTallies);

  const updateBaseline = process.argv.includes('--update-baseline');

  if (updateBaseline || !existsSync(BASELINE_PATH)) {
    writeFileSync(BASELINE_PATH, JSON.stringify(report, null, 2) + '\n');
    console.log(`\nBaseline written to ${path.relative(process.cwd(), BASELINE_PATH)}`);
    return;
  }

  const baseline = JSON.parse(readFileSync(BASELINE_PATH, 'utf8')) as Report;
  const regressions = findRegressions(report, baseline);

  if (regressions.length > 0) {
    console.error('\nEval regressed against the recorded baseline:');
    for (const r of regressions) console.error(`  - ${r}`);
    console.error('\nIf this drop is expected, rerun with --update-baseline.');
    process.exit(1);
  }

  console.log('\nNo regression against baseline.');
}

function printReport(report: Report, fieldTallies: Record<FieldName, Tally>): void {
  console.log(`Fixtures: ${report.fixtureCount}`);
  console.log(`Transaction-count accuracy: ${(report.transactionCount * 100).toFixed(1)}%`);
  console.log(`Overall field accuracy: ${(report.overall * 100).toFixed(1)}%`);
  console.log('Per-field accuracy:');
  for (const field of FIELD_NAMES) {
    const tally = fieldTallies[field];
    console.log(
      `  ${field}: ${(report.fields[field]! * 100).toFixed(1)}% (${tally.correct}/${tally.total})`
    );
  }
  console.log('Per-tag accuracy:');
  for (const tag of [...Object.keys(report.tags)].sort()) {
    console.log(`  ${tag}: ${(report.tags[tag]! * 100).toFixed(1)}%`);
  }
}

function findRegressions(report: Report, baseline: Report): string[] {
  const regressions: string[] = [];

  if (report.overall < baseline.overall - EPSILON) {
    regressions.push(`overall accuracy dropped from ${baseline.overall} to ${report.overall}`);
  }
  if (report.transactionCount < baseline.transactionCount - EPSILON) {
    regressions.push(
      `transaction-count accuracy dropped from ${baseline.transactionCount} to ${report.transactionCount}`
    );
  }
  for (const field of FIELD_NAMES) {
    const before = baseline.fields[field] ?? 1;
    const after = report.fields[field] ?? 1;
    if (after < before - EPSILON) {
      regressions.push(`${field} accuracy dropped from ${before} to ${after}`);
    }
  }

  return regressions;
}

main();
