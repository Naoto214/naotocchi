#!/usr/bin/env node
// BGM 配置 VERSION 2 (2026-11-09) の 点検と MIDI 書き出し。
//   node prototypes/bgm-placement-v2-20261109/tools/check-v2.cjs          … 点検のみ
//   node prototypes/bgm-placement-v2-20261109/tools/check-v2.cjs --midi   … midi/ に 追加曲の .mid を 書き出す
// (1) 追加曲: 拍数・長さ 45〜90秒・強拍の 和音外音・これまでの 全曲との 旋律の 一致 (8音 以上で 失敗)
// (2) 配置表: 全場面の 分類が A〜E/無音、候補の 曲 id が すべて 実在、ミニゲーム 100本・クイック 50種が もれなく 入る
// (3) 曲の 採用状況: 本人が 明示した とおり (2026-11-09 確定)。採用しなかった 別案は 削除せず alt で 保存。
//     A の 行は 採用曲だけ、C の 行は 採用曲を ふくむ
// (4) 元の 音源・譜面・MIDI と ゲーム本体が 変わっていない (PR #531 の ブランチと git で くらべる)
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const dir = path.resolve(__dirname, '..');
const repo = path.resolve(dir, '../..');
const V1 = require(path.join(repo, 'prototypes/main-theme-20261108/songs.js'));
const V2 = require(path.join(repo, 'prototypes/main-theme-v2-20261108/songs-v2.js'));
const V3 = require(path.join(repo, 'prototypes/main-theme-v3-morning-20261108/songs-v3.js'));
const EX = require(path.join(repo, 'prototypes/bgm-survey-20261108/existing-bgm.js'));
const NB = require(path.join(repo, 'prototypes/bgm-survey-20261108/songs-bgm.js'));
const AD = require(path.join(dir, 'songs-add.js'));
const PL = require(path.join(dir, 'placement.js'));
const name = (m) => ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'][m % 12] + (Math.floor(m / 12) - 1);
let failures = 0;
const fail = (m) => { console.log('FAIL ' + m); failures++; };

// (1) 追加曲
const shape = (song) => { const n = V1.flatten(song).notes; return n.slice(1).map((x, i) => `${x.midi - n[i].midi}:${Math.round(n[i].dur * 1000)}`); };
function longestCommon(a, b) { let best = 0; const dp = new Array(b.length + 1).fill(0); for (let i = 1; i <= a.length; i++) { let prev = 0; for (let j = 1; j <= b.length; j++) { const tmp = dp[j]; dp[j] = a[i - 1] === b[j - 1] ? prev + 1 : 0; if (dp[j] > best) best = dp[j]; prev = tmp; } } return best + 1; }
const refs = [...V1.SONGS.map((s) => ['V1-' + s.id, s]), ...V2.SONGS.filter((s) => s.group === 'new').map((s) => ['V2-' + s.id, s]), ...V3.SONGS.filter((s) => s.group === 'morning').map((s) => ['V3-' + s.id, s]), ...EX.EXISTING.map((s) => [s.id, s]), ...NB.NEW_SONGS.map((s) => ['531-' + s.id, s])];
for (const song of AD.ADD_SONGS) {
  let flat; try { flat = V1.flatten(song); } catch (err) { fail(`${song.id}: ${err.message}`); continue; }
  const mids = flat.notes.map((n) => n.midi), secs = flat.beats * 60 / song.bpm;
  console.log(`${song.id.padEnd(9)} ${song.key} ${song.meter}/4 ♩=${song.bpm} total=${(secs * song.repeats).toFixed(1)}s range=${name(Math.min(...mids))}-${name(Math.max(...mids))} notes/s=${(mids.length / secs).toFixed(2)}`);
  if (secs * song.repeats < 45 || secs * song.repeats > 90) fail(`${song.id}: length`);
  const warn = [];
  for (let bar = 0; bar < song.bars.length; bar++) for (const sb of (song.meter === 4 ? [0, 2] : [0])) {
    const beat = bar * song.meter + sb, note = flat.notes.find((n) => n.beat <= beat + 1e-6 && n.beat + n.dur > beat + 1e-6), ch = flat.chords.find((c) => c.beat <= beat + 1e-6 && c.beat + c.dur > beat + 1e-6);
    if (note && ch && !ch.chord.pcs.includes(note.midi % 12)) warn.push(`bar${bar + 1}.${sb + 1} ${name(note.midi)}/${ch.chord.name}`);
  }
  if (warn.length) console.log(`          strong-beat non-chord tones: ${warn.join(', ')}`);
  const sim = refs.concat(AD.ADD_SONGS.filter((s) => s !== song).map((s) => ['add-' + s.id, s])).map(([id, s]) => ({ id, n: longestCommon(shape(song), shape(s)) })).sort((a, b) => b.n - a.n);
  console.log(`          longest shared melodic run (notes): ${sim.slice(0, 3).map((x) => `${x.id}=${x.n}`).join(' ')}`);
  if (sim[0].n >= 8) fail(`${song.id}: too similar to ${sim[0].id}`);
}

// (2)(3) 配置表と 採用状況
const CLASSES = new Set(['A', 'B', 'C', 'D', 'E', '無音']);
const songIds = new Set(Object.keys(PL.SONG_STATUS));
for (const row of PL.SCENES) {
  if (!CLASSES.has(row.cls)) fail(`scene ${row.id}: class ${row.cls}`);
  for (const c of row.candidates || []) if (!songIds.has(c)) fail(`scene ${row.id}: unknown candidate ${c}`);
  for (const k of ['area', 'scene', 'current', 'keepExisting', 'reuse', 'needNew', 'length', 'timeOfDay', 'status']) if (row[k] == null) fail(`scene ${row.id}: missing ${k}`);
}
const counted = PL.SCENES.reduce((n, r) => n + (r.minigames || 0), 0), quick = PL.SCENES.reduce((n, r) => n + (r.quick || 0), 0);
console.log(`placement: ${PL.SCENES.length} rows, minigames covered ${counted}/100, quick ${quick}/50`);
if (counted !== 100) fail('minigame count ' + counted);
if (quick !== 50) fail('quick count ' + quick);
const mg = JSON.parse(fs.readFileSync(path.join(repo, 'docs/bgm-survey-20261108/data/minigames.json'), 'utf8')).games;
const listed = PL.SCENES.flatMap((r) => r.gameIds || []);
const missing = mg.filter((g) => !listed.includes(g.id)).map((g) => g.id), dup = listed.filter((id, i) => listed.indexOf(id) !== i);
if (missing.length) fail('minigames without a row: ' + missing.join(','));
if (dup.length) fail('minigames in two rows: ' + dup.join(','));
for (const u of PL.USES) for (const c of u.candidates) if (!songIds.has(c)) fail(`use ${u.id}: unknown ${c}`);
const explicit = { 'poyo-1': 'adopted', 'koro-1': 'adopted', 'card-2': 'adopted', 'game-1': 'adopted', 'explore-1': 'adopted', 'poyo-2': 'alt', 'koro-2': 'alt', 'card-1': 'alt', 'game-2': 'alt', 'explore-2': 'alt', 'home-morning': 'adopted', 'home-day': 'adopted', 'home-evening': 'adopted', 'home-night': 'adopted', 'event-2': 'adopted', 'event-1': 'hold', 'bgm-night': 'rejected', 'bgm-movie': 'rejected', 'bgm-puzzle': 'rejected', 'bgm-sports': 'rejected', 'bgm-game': 'undecided', 'bgm-race': 'undecided', 'bgm-farewell': 'undecided', 'bgm-home': 'migrating' };
for (const [id, st] of Object.entries(explicit)) if ((PL.SONG_STATUS[id] || {}).status !== st) fail(`status ${id} should be ${st}`);
for (const s of NB.NEW_SONGS) if (!explicit[s.id]) fail(`#531 ${s.id} has no explicit owner decision recorded`);
for (const id of Object.keys(explicit)) if (!PL.SONGS[id]) fail(`song data for ${id} must be kept`);
const isAdopted = (c) => (PL.SONG_STATUS[c] || {}).status === 'adopted';
for (const r of PL.SCENES) {
  if (r.cls === 'A' && !(r.candidates || []).every(isAdopted)) fail(`scene ${r.id}: class A must list adopted songs only`);
  if (r.cls === 'A' && !(r.candidates || []).length) fail(`scene ${r.id}: class A without a song`);
  if (r.cls === 'C' && !(r.candidates || []).some(isAdopted)) fail(`scene ${r.id}: class C must be covered by an adopted song`);
}
for (const u of PL.USES) if (u.candidates.every(isAdopted)) fail(`use ${u.id}: only adopted songs (no need to re-select)`);
const byStatus = {}; for (const [id, v] of Object.entries(PL.SONG_STATUS)) (byStatus[v.status] = byStatus[v.status] || []).push(id);
console.log('song status:', Object.entries(byStatus).map(([k, v]) => `${k}=${v.length}`).join(' '));
const byClass = {}; for (const r of PL.SCENES) byClass[r.cls] = (byClass[r.cls] || 0) + 1;
console.log('scene classes:', JSON.stringify(byClass));

// (4) 元の ファイル
const base = process.env.PLACEMENT_BASE || 'origin/claude/bgm-survey-compose-20261108';
try {
  const diff = execFileSync('git', ['diff', '--name-only', base, '--', 'audio.js', 'script.js', 'games.js', 'quick.js', 'index.html', 'prototypes/main-theme-20261108', 'prototypes/main-theme-v2-20261108', 'prototypes/main-theme-v3-morning-20261108', 'prototypes/main-theme-favorites-20261108', 'prototypes/bgm-survey-20261108', 'docs/bgm-survey-20261108', 'prototypes/life-sugoroku', 'prototypes/card-game', 'prototypes/naopoyo'], { cwd: repo, encoding: 'utf8' }).trim();
  if (diff) fail('protected files changed:\n' + diff); else console.log(`originals unchanged vs ${base}`);
} catch (err) { console.log(`(git compare skipped: ${base} not available)`); }
try { execFileSync('node', [path.join(repo, 'prototypes/bgm-survey-20261108/tools/check-bgm.cjs')], { cwd: repo, stdio: 'pipe' }); console.log('#531 check (existing 8 = audio.js): ok'); } catch (err) { fail('#531 check failed'); }

// ---- MIDI ----
const u32 = (n) => [(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255];
function vlq(n) { const b = [n & 0x7f]; while ((n >>= 7)) b.unshift((n & 0x7f) | 0x80); return b; }
const text = (s) => { const b = [...Buffer.from(s, 'utf8')]; return [0xff, 0x03, ...vlq(b.length), ...b]; };
function track(events) { events.sort((a, b) => a.t - b.t || a.o - b.o); let last = 0; const out = []; for (const e of events) { out.push(...vlq(e.t - last), ...e.d); last = e.t; } out.push(0, 0xff, 0x2f, 0); return [0x4d, 0x54, 0x72, 0x6b, ...u32(out.length), ...out]; }
function voicing(chord) { return chord.pcs.map((pc) => { let m = 48 + pc; while (m < 53) m += 12; while (m > 65) m -= 12; return m; }).sort((a, b) => a - b); }
function songToMidi(song) {
  const PPQ = 480, flat = V1.flatten(song), us = Math.round(60e6 / song.bpm);
  const meta = [{ t: 0, o: 0, d: text(`${song.label} ${song.title}`) }, { t: 0, o: 0, d: [0xff, 0x51, 3, (us >> 16) & 255, (us >> 8) & 255, us & 255] }, { t: 0, o: 0, d: [0xff, 0x58, 4, song.meter, 2, 24, 8] }];
  const mel = [{ t: 0, o: 0, d: text('Melody') }, { t: 0, o: 0, d: [0xc0, 0] }], ch = [{ t: 0, o: 0, d: text('Chords') }, { t: 0, o: 0, d: [0xc1, 0] }], bs = [{ t: 0, o: 0, d: text('Bass') }, { t: 0, o: 0, d: [0xc2, 32] }];
  const note = (arr, chn, m, beat, dur, vel) => { const a = Math.round(beat * PPQ), b = Math.round((beat + dur) * PPQ) - 4; arr.push({ t: a, o: 1, d: [0x90 | chn, m, vel] }, { t: b, o: 0, d: [0x80 | chn, m, 0] }); };
  for (const n of flat.notes) note(mel, 0, n.midi, n.beat, n.dur, 96);
  for (const c of flat.chords) { note(bs, 2, 36 + c.chord.bass + (c.chord.bass < 4 ? 12 : 0), c.beat, c.dur, 80); voicing(c.chord).forEach((m) => note(ch, 1, m, c.beat, c.dur, 64)); }
  const tracks = [meta, mel, ch, bs].map(track);
  return Buffer.from([0x4d, 0x54, 0x68, 0x64, 0, 0, 0, 6, 0, 1, 0, tracks.length, (PPQ >> 8) & 255, PPQ & 255, ...tracks.flat()]);
}
if (process.argv.includes('--midi')) {
  const out = path.join(dir, 'midi'); fs.mkdirSync(out, { recursive: true });
  for (const song of AD.ADD_SONGS) { const f = path.join(out, `naotocchi-bgm-${song.id}.mid`); fs.writeFileSync(f, songToMidi(song)); console.log('wrote', path.relative(repo, f)); }
}
if (failures) { console.error(`${failures} failure(s)`); process.exit(1); }
