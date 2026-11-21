#!/usr/bin/env node
// メインテーマ VERSION 2 の 点検と MIDI 書き出し。
//   node prototypes/main-theme-v2-20261108/tools/check-v2.cjs          … 点検のみ
//   node prototypes/main-theme-v2-20261108/tools/check-v2.cjs --midi   … midi/ に 新規5曲の .mid を 書き出す
// 点検: 拍数・強拍の 非和声音・音域・長さ(45〜90秒) と、既存曲(現行・V1 の 5案)との 旋律の 似かたを 数える。
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const dir = path.resolve(__dirname, '..');
const repo = path.resolve(dir, '../..');
const S = require(path.join(dir, 'songs-v2.js'));
const name = (m) => ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'][m % 12] + (Math.floor(m / 12) - 1);
let failures = 0;

// 似かた: 「音程 + 長さ」の 列で、いちばん 長く 一致する 連続部分 (音の 数)。
// 移調しても 同じ 形なら 一致と みなす。6音 以上 一致したら 要確認、8音 以上は 失敗。
const shape = (song) => { const n = S.flatten(song).notes; return n.slice(1).map((x, i) => `${x.midi - n[i].midi}:${n[i].dur}`); };
function longestCommon(a, b) {
  let best = 0; const dp = new Array(b.length + 1).fill(0);
  for (let i = 1; i <= a.length; i++) { let prev = 0; for (let j = 1; j <= b.length; j++) { const tmp = dp[j]; dp[j] = a[i - 1] === b[j - 1] ? prev + 1 : 0; if (dp[j] > best) best = dp[j]; prev = tmp; } }
  return best + 1; // 音程の 数 + 1 = 音の 数
}
const refs = [...S.V1_SONGS.map((s) => ({ id: 'V1-' + s.id, s }))];

for (const song of S.SONGS) {
  let flat;
  try { flat = S.flatten(song); } catch (err) { console.log(`${song.id}: ${err.message}`); failures++; continue; }
  const mids = flat.notes.map((n) => n.midi), lo = Math.min(...mids), hi = Math.max(...mids);
  const secs = flat.beats * 60 / song.bpm;
  console.log(`${song.id.padEnd(9)} ${song.key}${song.mode === 'minor' ? '(rel.)minor' : ''} ${song.meter}/4 ${song.bpm}bpm bars=${song.bars.length} total=${(secs * song.repeats).toFixed(1)}s range=${name(lo)}-${name(hi)} notes=${flat.notes.length}`);
  if (song.group !== 'new') continue;
  const warn = [];
  for (let bar = 0; bar < song.bars.length; bar++) for (const sb of (song.meter === 4 ? [0, 2] : [0])) {
    const beat = bar * song.meter + sb;
    const note = flat.notes.find((n) => n.beat <= beat + 1e-6 && n.beat + n.dur > beat + 1e-6);
    const ch = flat.chords.find((c) => c.beat <= beat + 1e-6 && c.beat + c.dur > beat + 1e-6);
    if (note && ch && !ch.chord.pcs.includes(note.midi % 12)) warn.push(`bar${bar + 1}.${sb + 1} ${name(note.midi)}/${ch.chord.name}`);
  }
  if (warn.length) console.log(`          strong-beat non-chord tones: ${warn.join(', ')}`);
  if (secs * song.repeats < 45 || secs * song.repeats > 90) { console.log('          total length outside 45-90s'); failures++; }
  const sim = refs.concat(S.SONGS.filter((s) => s.group === 'new' && s.id !== song.id).map((s) => ({ id: 'V2-' + s.id, s })))
    .map((r) => ({ id: r.id, n: longestCommon(shape(song), shape(r.s)) })).sort((a, b) => b.n - a.n);
  console.log(`          longest shared melodic run (notes): ${sim.slice(0, 3).map((x) => `${x.id}=${x.n}`).join(' ')}`);
  if (sim[0].n >= 8) { console.log('          too similar to an existing melody'); failures++; }
}

// ---- MIDI (SMF type 1: 0=テンポ, 1=メロディ, 2=コード, 3=ベース) ----
const u32 = (n) => [(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255];
function vlq(n) { const b = [n & 0x7f]; while ((n >>= 7)) b.unshift((n & 0x7f) | 0x80); return b; }
const text = (s) => { const b = [...Buffer.from(s, 'utf8')]; return [0xff, 0x03, ...vlq(b.length), ...b]; };
function track(events) { events.sort((a, b) => a.t - b.t || a.o - b.o); let last = 0; const out = []; for (const e of events) { out.push(...vlq(e.t - last), ...e.d); last = e.t; } out.push(0, 0xff, 0x2f, 0); return [0x4d, 0x54, 0x72, 0x6b, ...u32(out.length), ...out]; }
function voicing(chord) { return chord.pcs.map((pc) => { let m = 48 + pc; while (m < 53) m += 12; while (m > 65) m -= 12; return m; }).sort((a, b) => a - b); }
function songToMidi(song) {
  const PPQ = 480, flat = S.flatten(song), us = Math.round(60e6 / song.bpm);
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
  for (const song of S.SONGS.filter((s) => s.group === 'new')) { const f = path.join(out, `naotocchi-theme-v2-${song.id}.mid`); fs.writeFileSync(f, songToMidi(song)); console.log('wrote', path.relative(repo, f)); }
}
if (failures) { console.error(`${failures} failure(s)`); process.exit(1); }
