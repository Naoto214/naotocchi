// Run every repository test entry unchanged; limit file concurrency only.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
const cwd = fileURLToPath(new URL('../../../', import.meta.url));
const { scripts } = JSON.parse(
  readFileSync(new URL('../../../package.json', import.meta.url)),
);
const command = scripts.test.replaceAll(
  'node --test ',
  'node --test --test-concurrency=2 ',
);
console.log('COMMAND:', command);
const result = spawnSync('/bin/bash', ['-c', command], {
  cwd,
  stdio: 'inherit',
});
console.log('REGRESSION_EXIT:', result.status);
process.exit(result.status ?? 1);
