const {
  mkdtempSync,
  readFileSync,
  writeFileSync,
  cpSync,
  rmSync,
} = require('node:fs');
const { tmpdir } = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const root = path.resolve(__dirname, '..'),
  mutants = [
    ['species equality', 'b[k]===b[i]', 'stage(b[k])===stage(b[i])'],
    [
      'consume 6+',
      'for(const i of g)next[i]=0',
      'for(const i of g.slice(0,5))next[i]=0',
    ],
    ['growth cap', 'Math.min(4,g.length-1)', 'Math.min(3,g.length-1)'],
    ['death removed', 'death=old===8', 'death=false'],
    [
      'slide recompression',
      "a.type==='slide'?compress(next,n,dir):next",
      'next',
    ],
    [
      'items compressed',
      "a.type==='slide'?compress(next,n,dir):next",
      "compress(next,n,dir||'down')",
    ],
    ['single anchor', 'if(g.includes(priority))return priority;', ''],
    ['gauge cost', 'gauge-=c.single', 'gauge-=0'],
    ['egg consume', 'eggs[a.rank]--', 'eggs[a.rank]+=0'],
    ['cap ignored', 'Math.min(c.cap,gauge+gain)', 'gauge+gain'],
    ['egg landing reward', 'to===j', 'old===j'],
    ['overflow score', 'to-old+overflow', 'to-old'],
    ['all costs one move', 'moves:s.moves+1', 'moves:s.moves+2'],
    ['terminal protected', 'if(s.won||!a', 'if(false||!a'],
    [
      'initial random seed',
      'const c=config(options),random=rng(seed)',
      'const c=config(options),random=rng(1)',
    ],
  ];
const report = [];
for (const [name, from, to] of mutants) {
  const temp = mkdtempSync(path.join(tmpdir(), 'slide08-mut-'));
  try {
    cpSync(path.join(root, 'tests'), path.join(temp, 'tests'), {
      recursive: true,
    });
    let source = readFileSync(path.join(root, 'engine.mjs'), 'utf8');
    const pattern = new RegExp(
      from
        .replace(/\s/g, '')
        .split('')
        .map((c) => c.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
        .join('\\s*'),
    );
    if (!pattern.test(source)) throw Error('Mutation target missing ' + name);
    writeFileSync(path.join(temp, 'engine.mjs'), source.replace(pattern, to));
    const r = spawnSync(
      process.execPath,
      ['--test', path.join(temp, 'tests/engine.test.mjs')],
      { encoding: 'utf8', timeout: 10000 },
    );
    const killed = r.status !== 0 && !r.error;
    report.push({ name, killed, exit: r.status });
    if (!killed) throw Error('Surviving mutant ' + name);
  } finally {
    rmSync(temp, { recursive: true, force: true });
  }
}
writeFileSync(
  path.join(root, 'results/mutation.json'),
  JSON.stringify(report, null, 2),
);
console.log(
  `${report.length}/${report.length} mutants detected by engine contract tests`,
);
