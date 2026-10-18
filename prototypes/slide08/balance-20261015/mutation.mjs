import {
  mkdtempSync,
  cpSync,
  readFileSync,
  writeFileSync,
  rmSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
const root = fileURLToPath(new URL('../', import.meta.url));
const mutants = [
  ['search.mjs', 'item penalty ignored', 'opts.itemPenalty *', '0 *'],
  [
    'search.mjs',
    'slide action restriction removed',
    "opts.actionSet === 'slides' ?",
    'false ?',
  ],
  [
    'search.mjs',
    'missing diagnostic path',
    'node?.path ?? best.path',
    'node?.path ?? []',
  ],
  [
    'balance-20261015/metrics.mjs',
    'egg net reduction wrong',
    'reduction=before-after',
    'reduction=before-after+(item?1:0)',
  ],
  [
    'balance-20261015/metrics.mjs',
    'large clear threshold wrong',
    'reduction>=4',
    'reduction>=5',
  ],
  [
    'balance-20261015/metrics.mjs',
    'long item streak threshold wrong',
    'streak>=3',
    'streak>=4',
  ],
  [
    'balance-20261015/metrics.mjs',
    'zero ratio misleading',
    'itemCount/path.length:null',
    'itemCount/path.length:0',
  ],
];
const baseline = spawnSync(
  process.execPath,
  ['--test', path.join(root, 'tests/balance.test.mjs')],
  { encoding: 'utf8', timeout: 15000 },
);
if (baseline.status !== 0 || baseline.error)
  throw Error('Baseline tests must pass before mutation');
const report = [];
for (const [file, name, from, to] of mutants) {
  const temp = mkdtempSync(path.join(tmpdir(), 'slide08-balance-mut-'));
  try {
    for (const f of ['engine.mjs', 'search.mjs', 'replay.mjs', 'metrics.mjs'])
      cpSync(path.join(root, f), path.join(temp, f));
    cpSync(path.join(root, 'tests'), path.join(temp, 'tests'), {
      recursive: true,
    });
    cpSync(
      path.join(root, 'balance-20261015/metrics.mjs'),
      path.join(temp, 'balance-metrics.mjs'),
    );
    const fs = await import('node:fs');
    fs.mkdirSync(path.join(temp, 'balance-20261015'));
    fs.mkdirSync(path.join(temp, 'results'));
    cpSync(
      path.join(root, 'results/proof-base-3.json'),
      path.join(temp, 'results/proof-base-3.json'),
    );
    cpSync(
      path.join(temp, 'balance-metrics.mjs'),
      path.join(temp, 'balance-20261015/metrics.mjs'),
    );
    const target = path.join(temp, file),
      source = readFileSync(target, 'utf8');
    const pattern = new RegExp(
      from
        .replace(/\s/g, '')
        .split('')
        .map((c) => c.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
        .join('\\s*'),
    );
    if (!pattern.test(source)) throw Error('Missing mutation ' + name);
    writeFileSync(target, source.replace(pattern, to));
    const result = spawnSync(
      process.execPath,
      [
        '--test',
        '--test-reporter=tap',
        path.join(temp, 'tests/balance.test.mjs'),
      ],
      { encoding: 'utf8', timeout: 15000 },
    );
    const assertionFailures = (
      result.stdout.match(/code: 'ERR_ASSERTION'/g) || []
    ).length;
    const killed =
      result.status === 1 &&
      !result.error &&
      assertionFailures > 0 &&
      !/SyntaxError|ERR_MODULE_NOT_FOUND/.test(result.stdout + result.stderr);
    if (!killed) throw Error('Surviving or timed-out mutant ' + name);
    report.push({ name, killed, exit: result.status, assertionFailures });
  } finally {
    rmSync(temp, { recursive: true, force: true });
  }
}
writeFileSync(
  new URL('./results/mutation.json', import.meta.url),
  JSON.stringify(report, null, 2),
);
console.log(`${report.length}/${report.length} balance mutants detected`);
