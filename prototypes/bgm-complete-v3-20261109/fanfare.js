// なおとっち BGM 完全設計 VERSION 3 — たまごが かえる しゅんかんの ファンファーレ編曲
// 「おはようのひかり」の 冒頭（変奏 var-ohayo-hatch2 / var-ohayo-hatch4）を 派手に 鳴らす ための 編曲。
// 旋律の 音高・リズムは 変奏データ（元の 採用曲の 小節）を そのまま 使い、1音も 変えない。
// 足すのは 伴奏と 飾りだけ: はじまりの「パカッ」（ノイズ＋上がる スイープ）、旋律の オクターブ重ね（ベル）、
// 金管風の 和音きざみ、ベース、ティンパニ風の 低音、グロッケンの 分散和音、最後の 主和音（E♭）＋シンバル＋キラキラ上昇。
// 最後の 主和音は 旋律を 足さない 伴奏だけの しめくくり（2小節版は Fm7/E♭ → E♭、4小節版は B♭7 → E♭ の 終止）。
(function (root) {
  'use strict';
  const isNode = typeof module === 'object' && module.exports;
  const V1 = isNode ? require('../main-theme-20261108/songs.js') : root.NAOTOCCHI_THEME_SONGS;
  const hz = (m) => 440 * Math.pow(2, (m - 69) / 12);
  const LEAD_IN = 0.35; // 「パカッ」の あと 旋律が 入るまで（秒）
  const TAIL = 2.4;     // 最後の 主和音と シンバルの 余韻（秒）
  const LEVEL = 1.9;    // ホーム曲より 約 4 dB 大きく 聞こえる 標準音量（2秒窓の 最大 RMS で 測定）

  function duration(song) { const f = V1.flatten(song); return LEAD_IN + f.beats * 60 / song.bpm + TAIL; }

  // ctx の dest へ 予約する。t0 は 開始時刻。gain は 全体の 音量（1 = 標準）。
  function schedule(ctx, dest, song, opts = {}) {
    const t0 = opts.t0 != null ? opts.t0 : ctx.currentTime + 0.05;
    const master = ctx.createGain(); master.gain.value = (opts.gain == null ? 1 : opts.gain) * LEVEL;
    const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 4; comp.attack.value = 0.004; comp.release.value = 0.2;
    master.connect(comp); const lim = ctx.createDynamicsCompressor(); lim.threshold.value = -3; lim.knee.value = 0; lim.ratio.value = 20; lim.attack.value = 0.001; lim.release.value = 0.1; comp.connect(lim); lim.connect(dest);
    const nodes = [];
    let noiseBuf = null;
    const getNoise = () => { if (noiseBuf) return noiseBuf; const n = Math.floor(ctx.sampleRate * 2.5); noiseBuf = ctx.createBuffer(1, n, ctx.sampleRate); const d = noiseBuf.getChannelData(0); for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1; return noiseBuf; };
    function env(g, t, a, peak, d, sustain, rel) {
      g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(peak, t + a);
      if (sustain != null) { g.gain.setTargetAtTime(peak * sustain, t + a, d / 3); g.gain.setValueAtTime(peak * sustain, t + Math.max(a, rel - 0.06)); g.gain.exponentialRampToValueAtTime(0.0001, t + rel + 0.12); }
      else g.gain.exponentialRampToValueAtTime(0.0001, t + a + d);
    }
    function osc(type, midi, t, dur, vol, o = {}) {
      const s = ctx.createOscillator(), g = ctx.createGain(); s.type = type; s.frequency.setValueAtTime(hz(midi), t);
      if (o.detune) s.detune.value = o.detune;
      let out = s;
      if (o.lp) { const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.setValueAtTime(o.lp, t); if (o.lpEnd) f.frequency.exponentialRampToValueAtTime(o.lpEnd, t + Math.min(dur, 0.4)); out.connect(f); out = f; }
      out.connect(g); g.connect(master);
      if (o.hold) env(g, t, o.a || 0.01, vol, o.d || 0.2, o.hold, dur); else env(g, t, o.a || 0.004, vol, dur);
      s.start(t); s.stop(t + dur + 0.2); nodes.push(s);
    }
    function noise(t, dur, vol, type, f0, f1) {
      const s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain(); s.buffer = getNoise(); f.type = type; f.frequency.setValueAtTime(f0, t); if (f1) f.frequency.exponentialRampToValueAtTime(f1, t + dur);
      s.connect(f); f.connect(g); g.connect(master); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur); s.start(t); s.stop(t + dur + 0.05); nodes.push(s);
    }
    const bell = (midi, t, dur, vol) => { osc('sine', midi, t, Math.min(1.6, dur + 0.6), vol); osc('sine', midi + 12, t, 0.5, vol * 0.35); osc('triangle', midi + 24, t, 0.15, vol * 0.12); };
    const brass = (midi, t, dur, vol) => { osc('sawtooth', midi, t, dur, vol, { lp: 3200, lpEnd: 1400, a: 0.02, d: 0.15, hold: 0.7 }); osc('sawtooth', midi, t, dur, vol * 0.6, { lp: 2400, lpEnd: 1200, a: 0.03, d: 0.15, hold: 0.7, detune: 9 }); };
    const timp = (midi, t, vol) => { const s = ctx.createOscillator(), g = ctx.createGain(); s.type = 'sine'; s.frequency.setValueAtTime(hz(midi) * 1.5, t); s.frequency.exponentialRampToValueAtTime(hz(midi), t + 0.08); s.connect(g); g.connect(master); env(g, t, 0.003, vol, 0.7); s.start(t); s.stop(t + 0.9); nodes.push(s); noise(t, 0.08, vol * 0.5, 'lowpass', 900); };

    const spb = 60 / song.bpm, flat = V1.flatten(song), start = t0 + LEAD_IN, end = start + flat.beats * spb;
    // はじまりの「パカッ」: 殻が われる ノイズ ＋ 上がる スイープ
    noise(t0, 0.18, 0.5, 'bandpass', 5000, 1800);
    { const s = ctx.createOscillator(), g = ctx.createGain(); s.type = 'triangle'; s.frequency.setValueAtTime(380, t0); s.frequency.exponentialRampToValueAtTime(1900, t0 + 0.3); s.connect(g); g.connect(master); env(g, t0, 0.01, 0.22, 0.32); s.start(t0); s.stop(t0 + 0.4); nodes.push(s); }
    // 旋律（変えない）: 金管風の 本体 ＋ 1オクターブ上の ベル
    for (const n of flat.notes) {
      const t = start + n.beat * spb, d = n.dur * spb * 0.92;
      brass(n.midi, t, d, 0.17); bell(n.midi + 12, t, d, 0.16);
    }
    // 伴奏: 和音の 8分きざみ（金管）、ベース、ティンパニ、グロッケンの 分散和音
    for (const c of flat.chords) {
      const pcs = c.chord.pcs, voice = pcs.map((pc) => 55 + ((pc - 55) % 12 + 12) % 12).sort((a, b) => a - b), bass = 39 + ((c.chord.bass - 39) % 12 + 12) % 12;
      for (let b = 0; b < c.dur; b += 0.5) {
        const t = start + (c.beat + b) * spb, accent = b % 1 === 0 ? 1 : 0.6;
        for (const m of voice) osc('sawtooth', m, t, spb * 0.35, 0.045 * accent, { lp: 2600, lpEnd: 900 });
        // グロッケン: 和音の 音を 16分で 上へ
        for (let k = 0; k < 2; k++) { const m = 84 + ((pcs[(Math.round(b * 4) + k) % pcs.length] - 84) % 12 + 12) % 12 + (k ? 12 : 0); osc('sine', m, t + k * spb / 4, 0.25, 0.035); }
      }
      for (let b = 0; b < c.dur; b += 1) osc('triangle', bass, start + (c.beat + b) * spb, spb * 0.8, b % 2 ? 0.16 : 0.22);
      timp(bass - 12, start + c.beat * spb, 0.42);
    }
    // 最後: スネアの ロール → 主和音 E♭ ＋ シンバル ＋ キラキラ上昇
    for (let i = 0; i < 8; i++) noise(end - spb + i * spb / 8, 0.06, 0.06 + i * 0.02, 'highpass', 1800);
    const tonic = [51, 58, 63, 67, 70, 75];
    for (const m of tonic) brass(m, end, 1.8, 0.09);
    bell(79, end, 1.8, 0.14); bell(87, end + 0.02, 1.8, 0.1);
    osc('triangle', 39, end, 1.4, 0.26); timp(39, end, 0.5);
    noise(end, 2.2, 0.22, 'highpass', 6000, 3000);
    [63, 67, 70, 75, 79, 82, 87, 91, 94, 99].forEach((m, i) => osc('sine', m + 0, end + 0.15 + i * 0.05, 0.6, 0.05));
    return { end: end + TAIL, stop() { for (const n of nodes) { try { n.stop(); } catch (err) {} } try { master.disconnect(); } catch (err) {} } };
  }

  const api = { schedule, duration, LEAD_IN, TAIL };
  if (isNode) module.exports = api;
  root.NAOTOCCHI_BGM_V3_FANFARE = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
