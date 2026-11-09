#!/usr/bin/env node
// BGM 完全設計 VERSION 3 (2026-11-09) の 点検と MIDI 書き出し。
//   node prototypes/bgm-complete-v3-20261109/tools/check-v3.cjs          … 点検のみ
//   node prototypes/bgm-complete-v3-20261109/tools/check-v3.cjs --midi   … midi/ に 新曲と 変奏の .mid を 書き出す
// (1) 新曲: 拍数・長さ（ループ曲 45〜90秒、ジングル 15秒 以内）・強拍の 和音外音・これまでの 全曲との 旋律の 一致（8音 以上で 失敗）
// (2) 変奏: 元の 採用曲と 音高・リズム・和音が 1つも ちがわない（テンポ・範囲・周回数だけ）
// (3) 採用 10曲: 本人が 決めた 10曲だけが「採用」。データは 元と 同一
// (4) 最終配置表: 曲が 実在、「採用」の 行は 採用曲だけ、ミニゲーム 100本を もれなく
// (5) 元の ファイル（音源・譜面・MIDI・ゲーム本体）が PR #533 の ブランチから 変わっていない
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const dir = path.resolve(__dirname, '..');
const repo = path.resolve(dir, '../..');
const V1 = require(path.join(repo, 'prototypes/main-theme-20261108/songs.js'));
const V2 = require(path.join(repo, 'prototypes/main-theme-v2-20261108/songs-v2.js'));
const V3m = require(path.join(repo, 'prototypes/main-theme-v3-morning-20261108/songs-v3.js'));
const EX = require(path.join(repo, 'prototypes/bgm-survey-20261108/existing-bgm.js'));
const NB = require(path.join(repo, 'prototypes/bgm-survey-20261108/songs-bgm.js'));
const AD = require(path.join(repo, 'prototypes/bgm-placement-v2-20261109/songs-add.js'));
const N3 = require(path.join(dir, 'songs-v3.js'));
const VR = require(path.join(dir, 'variants.js'));
const D = require(path.join(dir, 'design.js'));
const name = (m) => ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'][m % 12] + (Math.floor(m / 12) - 1);
let failures = 0;
const fail = (m) => { console.log('FAIL ' + m); failures++; };

// (1) 新曲
const shape = (song) => { const n = V1.flatten(song).notes; return n.slice(1).map((x, i) => `${x.midi - n[i].midi}:${Math.round(n[i].dur * 1000)}`); };
function longestCommon(a, b) { let best = 0; const dp = new Array(b.length + 1).fill(0); for (let i = 1; i <= a.length; i++) { let prev = 0; for (let j = 1; j <= b.length; j++) { const tmp = dp[j]; dp[j] = a[i - 1] === b[j - 1] ? prev + 1 : 0; if (dp[j] > best) best = dp[j]; prev = tmp; } } return best + 1; }
const refs = [...V1.SONGS.map((s) => ['V1-' + s.id, s]), ...V2.SONGS.filter((s) => s.group === 'new').map((s) => ['V2-' + s.id, s]), ...V3m.SONGS.filter((s) => s.group === 'morning').map((s) => ['V3-' + s.id, s]), ...EX.EXISTING.map((s) => [s.id, s]), ...NB.NEW_SONGS.map((s) => ['531-' + s.id, s]), ...AD.ADD_SONGS.map((s) => ['533-' + s.id, s])];
for (const song of N3.SONGS) {
  let flat; try { flat = V1.flatten(song); } catch (err) { fail(`${song.id}: ${err.message}`); continue; }
  const mids = flat.notes.map((n) => n.midi), secs = flat.beats * 60 / song.bpm, total = secs * song.repeats;
  console.log(`${song.id.padEnd(17)} ${song.kind.padEnd(6)} ${(song.tonicName || song.key + ' major').padEnd(18)} ${song.meter}/4 ♩=${song.bpm} total=${total.toFixed(1)}s range=${name(Math.min(...mids))}-${name(Math.max(...mids))} notes/s=${(mids.length / secs).toFixed(2)}`);
  if (song.kind === 'loop' && (total < 45 || total > 90)) fail(`${song.id}: loop length ${total.toFixed(1)}s`);
  if (song.kind === 'jingle' && total > 15) fail(`${song.id}: jingle too long`);
  if (Math.max(...mids) > 86) fail(`${song.id}: melody above D6`);
  const warn = [];
  for (let bar = 0; bar < song.bars.length; bar++) for (const sb of (song.meter === 4 ? [0, 2] : [0])) {
    const beat = bar * song.meter + sb, note = flat.notes.find((n) => n.beat <= beat + 1e-6 && n.beat + n.dur > beat + 1e-6), ch = flat.chords.find((c) => c.beat <= beat + 1e-6 && c.beat + c.dur > beat + 1e-6);
    if (note && ch && !ch.chord.pcs.includes(note.midi % 12)) warn.push(`bar${bar + 1}.${sb + 1} ${name(note.midi)}/${ch.chord.name}`);
  }
  if (warn.length) console.log(`                  strong-beat non-chord tones: ${warn.join(', ')}`);
  const sim = refs.concat(N3.SONGS.filter((s) => s !== song).map((s) => ['v3-' + s.id, s])).map(([id, s]) => ({ id, n: longestCommon(shape(song), shape(s)) })).sort((a, b) => b.n - a.n);
  console.log(`                  longest shared melodic run (notes): ${sim.slice(0, 3).map((x) => `${x.id}=${x.n}`).join(' ')}`);
  if (sim[0].n >= 8) fail(`${song.id}: too similar to ${sim[0].id}`);
}

// (2) 変奏
const melodyOf = (bars) => JSON.stringify(bars.map((b) => ({ ch: b.ch, m: b.m })));
for (const v of VR.VARIANTS) {
  const base = D.SONGS[v.baseId]; if (!base) { fail(`${v.id}: base ${v.baseId} missing`); continue; }
  const b = base.song.bars, range = v.bars.length === b.length ? [0, b.length] : null;
  let ok = false;
  for (let s = 0; s + v.bars.length <= b.length; s++) if (melodyOf(b.slice(s, s + v.bars.length)) === melodyOf(v.bars)) { ok = true; break; }
  const sameKey = v.key === base.song.key && v.meter === base.song.meter;
  console.log(`${v.id.padEnd(17)} variant of ${v.baseId}: melody identical=${ok} key/meter kept=${sameKey} ♩=${base.song.bpm}→${v.bpm} bars=${v.bars.length}${range ? '' : ' (excerpt)'}`);
  if (!ok || !sameKey) fail(`${v.id}: variant changes the melody`);
}

// (3) 採用 10曲
const ADOPTED = ['home-morning', 'home-day', 'home-evening', 'home-night', 'poyo-1', 'koro-1', 'card-2', 'game-1', 'explore-1', 'event-2'];
// 2026-11-09 の 試聴で 本人が 採用を 押した 曲（db の ratings/latest から 読み取った もの）
const ADOPTED_LATER = ['poyo-2', 'board-b', 'game-2', 'fishing-a', 'bgm-race', 'explore-2', 'bgm-game', 'lullaby-a', 'bgm-farewell', 'jingle-achieve', 'var-poyo-clear', 'var-koro-goal', 'var-card-late', 'jingle-card-lose'];
const expectAdopted = [...ADOPTED, ...ADOPTED_LATER].sort();
if (JSON.stringify([...D.ADOPTED].sort()) !== JSON.stringify(expectAdopted)) fail('adopted set must be exactly the owner-confirmed songs: ' + D.ADOPTED.join(','));
const F = require(path.join(repo, 'prototypes/main-theme-favorites-20261108/favorites.js'));
const src = { 'home-morning': F.FAVORITES.find((f) => f.id === 'soyokaze').song, 'home-day': F.FAVORITES.find((f) => f.id === 'current').song, 'home-evening': F.FAVORITES.find((f) => f.id === 'starlake').song, 'home-night': F.FAVORITES.find((f) => f.id === 'hoshizora').song };
for (const id of ['poyo-1', 'koro-1', 'card-2', 'game-1', 'explore-1', 'event-2']) src[id] = NB.NEW_SONGS.find((s) => s.id === id);
for (const id of ADOPTED) if (melodyOf(D.SONGS[id].song.bars) !== melodyOf(src[id].bars) || D.SONGS[id].song.bpm !== src[id].bpm) fail(`${id}: adopted song data differs from the original`);
for (const s of [...N3.SONGS, ...VR.VARIANTS]) if (!expectAdopted.includes(s.id) && D.STATUS[s.id].status === 'adopted') fail(`${s.id}: adopted without an owner decision`);
for (const id of ['poyo-2', 'koro-2', 'card-1', 'game-2', 'explore-2']) if (!D.SONGS[id]) fail(`${id}: alternative must be kept`);
for (const u of D.USES) if (u.candidates.every((c) => D.STATUS[c].status === 'adopted')) fail(`use ${u.id}: nothing left to choose`);
const byStatus = {}; for (const [id, v] of Object.entries(D.STATUS)) (byStatus[v.status] = byStatus[v.status] || []).push(id);
console.log('song status:', Object.entries(byStatus).map(([k, v]) => `${k}=${v.length}`).join(' '));

// (4) 最終配置表
let mgIds = [];
for (const r of D.TABLE) {
  for (const c of r.songs) if (!D.SONGS[c]) fail(`row ${r.scene}: unknown song ${c}`);
  if (r.status === '採用' && !r.songs.every((c) => D.STATUS[c].status === 'adopted')) fail(`row ${r.scene}: 採用 rows must use adopted songs only`);
  for (const k of ['game', 'scene', 'exists', 'arrangement', 'start', 'stop', 'loop', 'volume', 'fade', 'sfx', 'status']) if (r[k] == null) fail(`row ${r.scene}: missing ${k}`);
  mgIds = mgIds.concat(r.gameIds || []);
}
const mg = JSON.parse(fs.readFileSync(path.join(repo, 'docs/bgm-survey-20261108/data/minigames.json'), 'utf8')).games.map((g) => g.id);
const miss = mg.filter((id) => !mgIds.includes(id)); if (miss.length) fail('minigames without a row: ' + miss.join(','));
const rowsBy = {}; for (const r of D.TABLE) { const k = r.status.startsWith('採用') ? '採用' : r.status.startsWith('無音') ? '無音' : '候補比較中'; rowsBy[k] = (rowsBy[k] || 0) + 1; }
console.log(`final table: ${D.TABLE.length} rows ${JSON.stringify(rowsBy)}, minigames covered ${mg.length - miss.length}/100, future-plan rows ${D.TABLE.filter((r) => r.exists !== '実在').length}`);

// (5) 元の ファイル
const base = process.env.V3_BASE || 'origin/claude/bgm-placement-v2-20261109';
try {
  const diff = execFileSync('git', ['diff', '--name-only', base, '--', 'audio.js', 'script.js', 'games.js', 'quick.js', 'index.html', 'prototypes/main-theme-20261108', 'prototypes/main-theme-v2-20261108', 'prototypes/main-theme-v3-morning-20261108', 'prototypes/main-theme-favorites-20261108', 'prototypes/bgm-survey-20261108', 'prototypes/bgm-placement-v2-20261109', 'docs/bgm-survey-20261108', 'docs/bgm-placement-v2-20261109', 'prototypes/life-sugoroku', 'prototypes/card-game', 'prototypes/naopoyo', 'prototypes/naopoyo-time-hand-chapter1'], { cwd: repo, encoding: 'utf8' }).trim();
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
  const meta = [{ t: 0, o: 0, d: text(song.title) }, { t: 0, o: 0, d: [0xff, 0x51, 3, (us >> 16) & 255, (us >> 8) & 255, us & 255] }, { t: 0, o: 0, d: [0xff, 0x58, 4, song.meter, 2, 24, 8] }];
  const mel = [{ t: 0, o: 0, d: text('Melody') }, { t: 0, o: 0, d: [0xc0, 0] }], ch = [{ t: 0, o: 0, d: text('Chords') }, { t: 0, o: 0, d: [0xc1, 0] }], bs = [{ t: 0, o: 0, d: text('Bass') }, { t: 0, o: 0, d: [0xc2, 32] }];
  const note = (arr, chn, m, beat, dur, vel) => { const a = Math.round(beat * PPQ), b = Math.round((beat + dur) * PPQ) - 4; arr.push({ t: a, o: 1, d: [0x90 | chn, m, vel] }, { t: b, o: 0, d: [0x80 | chn, m, 0] }); };
  for (const n of flat.notes) note(mel, 0, n.midi, n.beat, n.dur, 96);
  for (const c of flat.chords) { note(bs, 2, 36 + c.chord.bass + (c.chord.bass < 4 ? 12 : 0), c.beat, c.dur, 80); voicing(c.chord).forEach((m) => note(ch, 1, m, c.beat, c.dur, 64)); }
  const tracks = [meta, mel, ch, bs].map(track);
  return Buffer.from([0x4d, 0x54, 0x68, 0x64, 0, 0, 0, 6, 0, 1, 0, tracks.length, (PPQ >> 8) & 255, PPQ & 255, ...tracks.flat()]);
}
if (process.argv.includes('--midi')) {
  const out = path.join(dir, 'midi'); fs.mkdirSync(out, { recursive: true });
  for (const song of [...N3.SONGS, ...VR.VARIANTS]) { const f = path.join(out, `naotocchi-bgm-v3-${song.id}.mid`); fs.writeFileSync(f, songToMidi(song)); }
  console.log(`wrote ${N3.SONGS.length + VR.VARIANTS.length} MIDI files to ${path.relative(repo, out)}`);
}
if (failures) { console.error(`${failures} failure(s)`); process.exit(1); }
