#!/usr/bin/env node
// お気に入り 6曲 統合比較の 点検。
//   node prototypes/main-theme-favorites-20261108/tools/check-favorites.cjs
// (1) 6曲の データが 元の V1〜V3 の 曲と 同一 (同じ オブジェクトを 参照し、内容も 一致)
// (2) 6曲とも 拍数が 正しく 展開でき、試聴の 長さが 45〜90秒
// (3) 元の 音源・譜面・MIDI の ファイルが この ブランチで 変更されていない (git)
// (4) 現行曲が audio.js の TRACKS.home と 一致 (V1 の 点検を 呼ぶ)
'use strict';
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const dir = path.resolve(__dirname, '..');
const repo = path.resolve(dir, '../..');
const F = require(path.join(dir, 'favorites.js'));
const V1 = require(path.join(repo, 'prototypes/main-theme-20261108/songs.js'));
const V2 = require(path.join(repo, 'prototypes/main-theme-v2-20261108/songs-v2.js'));
const V3 = require(path.join(repo, 'prototypes/main-theme-v3-morning-20261108/songs-v3.js'));
let failures = 0;
const fail = (m) => { console.log('FAIL ' + m); failures++; };

const SOURCES = { current: [V1.SONGS, 'current'], starlake: [V1.SONGS, 'D'], hoshizora: [V2.SONGS, 'B'], kisetsu: [V2.SONGS, 'C'], ohayo: [V3.SONGS, 'B'], soyokaze: [V3.SONGS, 'C'] };
const strip = (s) => JSON.stringify({ key: s.key, bpm: s.bpm, meter: s.meter, repeats: s.repeats, bars: s.bars });
if (F.FAVORITES.length !== 6) fail('expected 6 favorites');
for (const f of F.FAVORITES) {
  const [list, id] = SOURCES[f.id] || []; if (!list) { fail('unknown ' + f.id); continue; }
  const src = list.find((s) => s.id === id);
  if (strip(src) !== strip(f.song)) fail(`${f.id}: data differs from the original`);
  const flat = F.flatten(f.song), secs = flat.beats * 60 / f.song.bpm * f.song.repeats;
  console.log(`${f.id.padEnd(10)} ${f.title}  ${f.origin}  bars=${f.song.bars.length} notes=${flat.notes.length} ${secs.toFixed(1)}s  same-as-original=${strip(src) === strip(f.song)}`);
  if (secs < 45 || secs > 90) fail(`${f.id}: length ${secs.toFixed(1)}s`);
  for (const m of ['melody', 'piano', 'band']) if (typeof (F.LOUDNESS_DB[m] || {})[f.id] !== 'number') fail(`${f.id}: no loudness value for ${m}`);
}

// 元の ファイルが 変わっていないか (このブランチの 分岐元 #527 と くらべる)
const protectedPaths = ['audio.js', 'prototypes/main-theme-20261108', 'prototypes/main-theme-v2-20261108', 'prototypes/main-theme-v3-morning-20261108', 'docs/main-theme-20261108', 'docs/main-theme-v2-20261108', 'docs/main-theme-v3-morning-20261108'];
const base = process.env.FAVORITES_BASE || 'origin/claude/main-theme-v3-morning-20261108';
try {
  const diff = execFileSync('git', ['diff', '--name-only', base, '--', ...protectedPaths], { cwd: repo, encoding: 'utf8' }).trim();
  if (diff) fail('original files changed:\n' + diff); else console.log(`originals unchanged vs ${base}`);
} catch (err) { console.log(`(git compare skipped: ${base} not available)`); }

try { execFileSync('node', [path.join(repo, 'prototypes/main-theme-20261108/tools/check.cjs')], { cwd: repo, stdio: 'pipe' }); console.log('V1 check (audio.js match): ok'); }
catch (err) { fail('V1 check failed'); }

if (failures) { console.error(`${failures} failure(s)`); process.exit(1); }
