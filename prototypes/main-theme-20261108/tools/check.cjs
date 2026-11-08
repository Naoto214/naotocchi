#!/usr/bin/env node
// メインテーマ比較 VERSION 1 の 点検と MIDI 書き出し。
//   node prototypes/main-theme-20261108/tools/check.cjs          … 点検のみ
//   node prototypes/main-theme-20261108/tools/check.cjs --midi   … midi/ に .mid を 書き出す
// 点検: (1) 各小節の 拍数 (2) 強拍の 非和声音 (3) 音域 (4) 現行曲が audio.js と 一致するか
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const dir = path.resolve(__dirname, '..');
const repo = path.resolve(dir, '../..');
const S = require(path.join(dir, 'songs.js'));
const name = (m) => ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'][m % 12] + (Math.floor(m / 12) - 1);
let failures = 0;

// (4) audio.js の TRACKS.home を とりだして くらべる (audio.js は 読むだけ)
{
  const src = fs.readFileSync(path.join(repo, 'audio.js'), 'utf8');
  const block = src.slice(src.indexOf('      home: {'), src.indexOf('      night: {'));
  // chords / roots は 1行に 書かれている
  const pick = (key) => { const m = new RegExp('^\\s*' + key + ': (.*),$', 'm').exec(block); return m && Function('_', 'return ' + m[1])(null); };
  const lead = Function('_', 'return ' + /lead:\s*(\[[\s\S]*\]\])/.exec(block)[1])(null);
  const ok = JSON.stringify(lead) === JSON.stringify(S.CURRENT_RAW.lead)
    && JSON.stringify(pick('chords')) === JSON.stringify(S.CURRENT_RAW.chords)
    && JSON.stringify(pick('roots')) === JSON.stringify(S.CURRENT_RAW.roots)
    && /bpm: 96/.test(block);
  console.log(`current vs audio.js TRACKS.home: ${ok ? 'MATCH' : 'MISMATCH'}`);
  if (!ok) failures++;
}

for (const song of S.SONGS) {
  let flat;
  try { flat = S.flatten(song); } catch (err) { console.log(`${song.id}: ${err.message}`); failures++; continue; }
  const mids = flat.notes.map((n) => n.midi);
  const lo = Math.min(...mids), hi = Math.max(...mids);
  const secs = flat.beats * 60 / song.bpm;
  const warn = [];
  // 強拍 (1拍目・4/4 の 3拍目) に のる 音が コード音か どうか。のこる音(タイ)は 拍頭で しらべる
  const strong = song.meter === 4 ? [0, 2] : [0];
  for (let bar = 0; bar < song.bars.length; bar++) {
    for (const sb of strong) {
      const beat = bar * song.meter + sb;
      const note = flat.notes.find((n) => n.beat <= beat + 1e-6 && n.beat + n.dur > beat + 1e-6);
      const ch = flat.chords.find((c) => c.beat <= beat + 1e-6 && c.beat + c.dur > beat + 1e-6);
      if (!note || !ch) continue;
      if (!ch.chord.pcs.includes(note.midi % 12)) warn.push(`bar${bar + 1}.${sb + 1} ${name(note.midi)}/${ch.chord.name}${note.beat < beat - 1e-6 ? '(tied)' : ''}`);
    }
  }
  // 大きな 跳躍 (6度より 広い)
  const leaps = [];
  for (let i = 1; i < flat.notes.length; i++) { const d = Math.abs(flat.notes[i].midi - flat.notes[i - 1].midi); if (d > 9) leaps.push(`bar${flat.notes[i].bar + 1} ${name(flat.notes[i - 1].midi)}→${name(flat.notes[i].midi)}`); }
  console.log(`${song.id.padEnd(8)} ${song.key} ${song.meter}/4 ${song.bpm}bpm bars=${song.bars.length} pass=${secs.toFixed(1)}s total=${(secs * song.repeats).toFixed(1)}s range=${name(lo)}-${name(hi)} (${hi - lo}st) notes=${flat.notes.length}`);
  if (warn.length) console.log(`         strong-beat non-chord tones (${warn.length}): ${warn.join(', ')}`);
  if (leaps.length) console.log(`         leaps > M6: ${leaps.join(', ')}`);
  if (secs * song.repeats < 44 || secs * song.repeats > 92) { console.log('         total length outside 45-90s'); failures++; }
}

// ---- MIDI (SMF type 1: 0=テンポ, 1=メロディ, 2=コード, 3=ベース) ----
function vlq(n) { const b = [n & 0x7f]; while ((n >>= 7)) b.unshift((n & 0x7f) | 0x80); return b; }
function track(events) {
  events.sort((a, b) => a.t - b.t || a.o - b.o); let last = 0; const out = [];
  for (const e of events) { out.push(...vlq(e.t - last), ...e.d); last = e.t; }
  out.push(0, 0xff, 0x2f, 0);
  return [0x4d, 0x54, 0x72, 0x6b, ...u32(out.length), ...out];
}
const u32 = (n) => [(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255];
const text = (s) => { const b = [...Buffer.from(s, 'utf8')]; return [0xff, 0x03, ...vlq(b.length), ...b]; };
function songToMidi(song) {
  const PPQ = 480, flat = S.flatten(song), us = Math.round(60e6 / song.bpm);
  const meta = [{ t: 0, o: 0, d: text(`${song.label} ${song.title}`) }, { t: 0, o: 0, d: [0xff, 0x51, 3, (us >> 16) & 255, (us >> 8) & 255, us & 255] }, { t: 0, o: 0, d: [0xff, 0x58, 4, song.meter, 2, 24, 8] }];
  const mel = [{ t: 0, o: 0, d: text('Melody') }, { t: 0, o: 0, d: [0xc0, 0] }], ch = [{ t: 0, o: 0, d: text('Chords') }, { t: 0, o: 0, d: [0xc1, 0] }], bs = [{ t: 0, o: 0, d: text('Bass') }, { t: 0, o: 0, d: [0xc2, 32] }];
  const note = (arr, chn, m, beat, dur, vel) => { const a = Math.round(beat * PPQ), b = Math.round((beat + dur) * PPQ) - 4; arr.push({ t: a, o: 1, d: [0x90 | chn, m, vel] }, { t: b, o: 0, d: [0x80 | chn, m, 0] }); };
  for (const n of flat.notes) note(mel, 0, n.midi, n.beat, n.dur, 96);
  for (const c of flat.chords) {
    note(bs, 2, 36 + ((c.chord.bass - 0 + 12) % 12) + (c.chord.bass < 4 ? 12 : 0), c.beat, c.dur, 80);
    voicing(c.chord).forEach((m) => note(ch, 1, m, c.beat, c.dur, 64));
  }
  const tracks = [meta, mel, ch, bs].map(track);
  const head = [0x4d, 0x54, 0x68, 0x64, 0, 0, 0, 6, 0, 1, 0, tracks.length, (PPQ >> 8) & 255, PPQ & 255];
  return Buffer.from([...head, ...tracks.flat()]);
}
function voicing(chord) { return chord.pcs.map((pc) => { let m = 48 + pc; while (m < 53) m += 12; while (m > 65) m -= 12; return m; }).sort((a, b) => a - b); }

if (process.argv.includes('--midi')) {
  const out = path.join(dir, 'midi'); fs.mkdirSync(out, { recursive: true });
  for (const song of S.SONGS) { const f = path.join(out, `naotocchi-theme-${song.id}.mid`); fs.writeFileSync(f, songToMidi(song)); console.log('wrote', path.relative(repo, f)); }
}
if (failures) { console.error(`${failures} failure(s)`); process.exit(1); }
