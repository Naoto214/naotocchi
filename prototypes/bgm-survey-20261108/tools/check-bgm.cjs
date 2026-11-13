#!/usr/bin/env node
// BGM 総点検 (2026-11-08) の 点検と MIDI 書き出し。
//   node prototypes/bgm-survey-20261108/tools/check-bgm.cjs          … 点検のみ
//   node prototypes/bgm-survey-20261108/tools/check-bgm.cjs --midi   … midi/ に 新曲の .mid を 書き出す
// (1) existing-bgm.js の 8曲が audio.js の TRACKS と 1値ずつ 一致 (audio.js は 読むだけ)
// (2) 新曲: 拍数・長さ 45〜90秒・強拍の 和音外音・音域
// (3) 新曲と これまでの 全曲 (V1 6・V2 5・V3 5・既存BGM 8・ほかの 新曲) の 旋律の 一致 (8音 以上で 失敗)
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const dir = path.resolve(__dirname, '..');
const repo = path.resolve(dir, '../..');
const V1 = require(path.join(repo, 'prototypes/main-theme-20261108/songs.js'));
const V2 = require(path.join(repo, 'prototypes/main-theme-v2-20261108/songs-v2.js'));
const V3 = require(path.join(repo, 'prototypes/main-theme-v3-morning-20261108/songs-v3.js'));
const EX = require(path.join(dir, 'existing-bgm.js'));
const NB = require(path.join(dir, 'songs-bgm.js'));
const name = (m) => ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'][m % 12] + (Math.floor(m / 12) - 1);
let failures = 0;
const fail = (m) => { console.log('FAIL ' + m); failures++; };

// (1) audio.js と 一致
{
  const src = fs.readFileSync(path.join(repo, 'audio.js'), 'utf8');
  const start = src.indexOf('    const TRACKS = {'), end = src.indexOf('    };', start) + 6;
  const TR = Function('_', '"use strict";' + src.slice(start, end).replace('const TRACKS =', 'return'))(null);
  const ids = Object.keys(TR);
  if (JSON.stringify(ids) !== JSON.stringify(Object.keys(EX.TRACKS_RAW))) fail('track list differs: ' + ids.join(','));
  for (const id of ids) { const same = JSON.stringify(TR[id]) === JSON.stringify(EX.TRACKS_RAW[id]); console.log(`audio.js ${id.padEnd(9)} ${same ? 'MATCH' : 'MISMATCH'}`); if (!same) fail('audio.js mismatch ' + id); }
}

// (2)(3) 新曲
const shape = (song) => { const n = V1.flatten(song).notes; return n.slice(1).map((x, i) => `${x.midi - n[i].midi}:${Math.round(n[i].dur * 1000)}`); };
function longestCommon(a, b) { let best = 0; const dp = new Array(b.length + 1).fill(0); for (let i = 1; i <= a.length; i++) { let prev = 0; for (let j = 1; j <= b.length; j++) { const tmp = dp[j]; dp[j] = a[i - 1] === b[j - 1] ? prev + 1 : 0; if (dp[j] > best) best = dp[j]; prev = tmp; } } return best + 1; }
const refs = [...V1.SONGS.map((s) => ['V1-' + s.id, s]), ...V2.SONGS.filter((s) => s.group === 'new').map((s) => ['V2-' + s.id, s]), ...V3.SONGS.filter((s) => s.group === 'morning').map((s) => ['V3-' + s.id, s]), ...EX.EXISTING.map((s) => [s.id, s])];
for (const song of NB.NEW_SONGS) {
  let flat; try { flat = V1.flatten(song); } catch (err) { fail(`${song.id}: ${err.message}`); continue; }
  const mids = flat.notes.map((n) => n.midi), secs = flat.beats * 60 / song.bpm;
  console.log(`${song.id.padEnd(8)} ${song.tonicName || song.key + ' major'} ${song.meter}/4 ♩=${song.bpm} bars=${song.bars.length} total=${(secs * song.repeats).toFixed(1)}s range=${name(Math.min(...mids))}-${name(Math.max(...mids))} notes/s=${(mids.length / secs).toFixed(2)}`);
  if (secs * song.repeats < 45 || secs * song.repeats > 90) fail(`${song.id}: length ${(secs * song.repeats).toFixed(1)}s`);
  const warn = [];
  for (let bar = 0; bar < song.bars.length; bar++) for (const sb of (song.meter === 4 ? [0, 2] : [0])) {
    const beat = bar * song.meter + sb, note = flat.notes.find((n) => n.beat <= beat + 1e-6 && n.beat + n.dur > beat + 1e-6), ch = flat.chords.find((c) => c.beat <= beat + 1e-6 && c.beat + c.dur > beat + 1e-6);
    if (note && ch && !ch.chord.pcs.includes(note.midi % 12)) warn.push(`bar${bar + 1}.${sb + 1} ${name(note.midi)}/${ch.chord.name}`);
  }
  if (warn.length) console.log(`         strong-beat non-chord tones: ${warn.join(', ')}`);
  const sim = refs.concat(NB.NEW_SONGS.filter((s) => s !== song).map((s) => ['new-' + s.id, s])).map(([id, s]) => ({ id, n: longestCommon(shape(song), shape(s)) })).sort((a, b) => b.n - a.n);
  console.log(`         longest shared melodic run (notes): ${sim.slice(0, 3).map((x) => `${x.id}=${x.n}`).join(' ')}`);
  if (sim[0].n >= 8) fail(`${song.id}: too similar to ${sim[0].id}`);
}

// ---- MIDI (SMF type 1: 0=テンポ, 1=メロディ, 2=コード, 3=ベース) ----
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
  for (const song of NB.NEW_SONGS) { const f = path.join(out, `naotocchi-bgm-${song.id}.mid`); fs.writeFileSync(f, songToMidi(song)); console.log('wrote', path.relative(repo, f)); }
}
if (failures) { console.error(`${failures} failure(s)`); process.exit(1); }
