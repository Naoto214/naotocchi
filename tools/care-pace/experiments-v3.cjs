'use strict';
// お世話の頻度 監査 VERSION 3: 最終調整の 比較実験を まとめて うごかす。
//   node tools/care-pace/experiments-v3.cjs <実験名,...|all> <出力フォルダ>
// 実験は 子プロセスで 小分けに 実行する(simulate-v2.cjs の spawnJob)。
const fs = require('node:fs');
const path = require('node:path');
const { spawnJob, summarize, summarizeIdle } = require('./simulate-v2.cjs');

const CHUNK = 20;
function lives(plan, persona, n, optKey = 'base', override) {
  const rows = [];
  for (let f = 0; f < n; f += CHUNK) rows.push(...spawnJob(plan, `life:${persona}:${f}:${Math.min(CHUNK, n - f)}:${optKey}`, override));
  return summarize(rows);
}
function idle(plan, preset, n, override) {
  const rows = [];
  for (let f = 0; f < n; f += 100) rows.push(...spawnJob(plan, `idle:${preset}:${f}:${Math.min(100, n - f)}`, override));
  return summarizeIdle(rows);
}
function rescue(plan, override) {
  const out = {};
  for (const delay of [10, 20, 40, 60]) {
    const rows = spawnJob(plan, `rescue:${delay}:0:80`, override);
    const reached = rows.filter(x => x.reachedCritical);
    out[delay * 3 + 's'] = +(reached.filter(x => x.survived).length / Math.max(1, reached.length)).toFixed(2);
  }
  return out;
}

const IDLE_VARIANTS = {
  B2: ['B2', null],
  'V3(B2の放置設定)': ['V3', { fullPoopHappyPenalty: 0.5, poopSickGraceTicks: 40 }],
  V3: ['V3', null],
  'V3+(さらに緩める)': ['V3', { sicknessChance: 0.01, poopSickGraceTicks: 120 }],
};

const EXPERIMENTS = {
  energy() {
    const out = {};
    for (const e of [12, 10, 8, 6]) {
      out[e] = {};
      for (const persona of ['gamer', 'diligent', 'casual']) out[e][persona] = lives('V3', persona, 40, 'base', { minigameEnergy: e });
      process.stderr.write(`energy ${e} done\n`);
    }
    return out;
  },
  relations() {
    const out = {};
    for (const plan of ['B2', 'V3']) {
      out[plan] = {};
      for (const opt of ['c4p', 'c12p']) {
        out[plan][opt] = {};
        for (const persona of ['casual', 'keeper', 'affection', 'viewer', 'beginner']) out[plan][opt][persona] = lives(plan, persona, 40, opt);
        process.stderr.write(`relations ${plan} ${opt} done\n`);
      }
    }
    return out;
  },
  idle() {
    const out = {};
    for (const [name, [plan, ov]] of Object.entries(IDLE_VARIANTS)) {
      out[name] = {};
      for (const preset of ['healthy', 'normal', 'bad']) out[name][preset] = idle(plan, preset, 300, ov);
      process.stderr.write(`idle ${name} done\n`);
    }
    return out;
  },
  items() {
    const out = {};
    for (const item of ['none', 'bowtie', 'ribbon', 'poop1', 'scarf', 'sleepboost1', 'bond1', 'partner1', 'travel1']) {
      out[item] = {};
      const optKey = (item === 'bond1' || item === 'partner1' ? 'c4p+' : 'c4p+') + (item === 'none' ? 'base' : 'item-' + item);
      for (const persona of ['beginner', 'casual', 'diligent', 'viewer']) out[item][persona] = lives('V3', persona, 30, optKey);
      process.stderr.write(`items ${item} done\n`);
    }
    return out;
  },
  final(only) {
    const out = {};
    for (const plan of (only ? [only] : ['current', 'B2', 'V3'])) {
      out[plan] = { base: {}, c12p: {} };
      for (const persona of ['diligent', 'casual', 'gamer', 'minimal', 'follower', 'beginner', 'affection', 'viewer', 'keeper']) {
        out[plan].base[persona] = lives(plan, persona, 60, 'base');
        out[plan].c12p[persona] = lives(plan, persona, 60, 'c12p');
      }
      out[plan].rescue = rescue(plan);
      process.stderr.write(`final ${plan} done\n`);
    }
    return out;
  },
};

if (require.main === module) {
  const [names, outDir] = process.argv.slice(2);
  fs.mkdirSync(outDir, { recursive: true });
  for (const full of (names === 'all' ? Object.keys(EXPERIMENTS) : names.split(','))) {
    const [name, argv] = full.split(':');
    const t0 = Date.now();
    const result = EXPERIMENTS[name](argv);
    fs.writeFileSync(path.join(outDir, `v3-${full.replace(':', '-')}.json`), JSON.stringify({ name, seconds: (Date.now() - t0) / 1000, result }, null, 1));
    process.stderr.write(`== ${name} ${(Date.now() - t0) / 1000}s\n`);
  }
}
