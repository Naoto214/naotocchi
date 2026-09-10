// なおとっち: おと(効果音 と BGM)。script.js から installNaotocchiAudio(S) で
// よびだされる。S には セーブ(getState)・画面(el)・場面を きめる ための
// じょうたい(isGameActive など)が 入る。ビルドは なく、index.html で
// script.js より さきに よみこむ
(() => {
  'use strict';
  globalThis.installNaotocchiAudio = function (S) {
    const { nativeSetTimeout, getState, STAGE, el, isGameActive, getActiveMinigame, minigameGenreId, isDateOpen } = S;
    const rawSetTimeout = typeof nativeSetTimeout === 'function' ? nativeSetTimeout : (typeof window.setTimeout === 'function' ? window.setTimeout.bind(window) : (fn, ms) => setTimeout(fn, ms));
    let ctx = null, master = null, sfxBus = null, bgmBus = null, unlocked = false, noiseBuf = null;
    let scene = null, track = null, nextNoteTime = 0, step = 0, schedTimer = null, sceneGain = null;
    const sfxOn = () => { const state = getState(); return !state || !state.lifetime || state.lifetime.soundSfx !== false; };
    const bgmOn = () => { const state = getState(); return !state || !state.lifetime || state.lifetime.soundBgm !== false; };
    function ensure() {
      if (ctx) return ctx;
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      try { ctx = new AC(); } catch (err) { return null; }
      master = ctx.createGain(); master.gain.value = 0.9; master.connect(ctx.destination);
      sfxBus = ctx.createGain(); sfxBus.gain.value = 0.9; sfxBus.connect(master);
      bgmBus = ctx.createGain(); bgmBus.gain.value = 0.28; bgmBus.connect(master);
      const len = Math.floor(ctx.sampleRate * 0.5); noiseBuf = ctx.createBuffer(1, len, ctx.sampleRate);
      const d = noiseBuf.getChannelData(0); for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      return ctx;
    }
    function unlock() {
      const c = ensure(); if (!c) return;
      if (c.state === 'suspended') { try { c.resume(); } catch (err) {} }
      unlocked = true;
      startScheduler();
    }
    // --- こうかおん の 部品 ---
    function tone(freq, dur, o = {}) {
      const c = ensure(); if (!c || !unlocked || !sfxOn()) return;
      const t0 = c.currentTime + (o.delay || 0);
      const osc = c.createOscillator(); osc.type = o.type || 'sine';
      osc.frequency.setValueAtTime(freq, t0);
      if (o.slide) osc.frequency.exponentialRampToValueAtTime(Math.max(30, freq + o.slide), t0 + dur);
      const g = c.createGain(); const v = o.vol == null ? 0.18 : o.vol;
      g.gain.setValueAtTime(0.0001, t0); g.gain.linearRampToValueAtTime(v, t0 + (o.attack || 0.005)); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      osc.connect(g); g.connect(sfxBus); osc.start(t0); osc.stop(t0 + dur + 0.02);
    }
    function noise(dur, o = {}) {
      const c = ensure(); if (!c || !unlocked || !sfxOn()) return;
      const t0 = c.currentTime + (o.delay || 0);
      const src = c.createBufferSource(); src.buffer = noiseBuf;
      const f = c.createBiquadFilter(); f.type = o.filter || 'lowpass'; f.frequency.setValueAtTime(o.freq || 1200, t0); if (o.freqEnd) f.frequency.exponentialRampToValueAtTime(o.freqEnd, t0 + dur);
      const g = c.createGain(); const v = o.vol == null ? 0.2 : o.vol;
      g.gain.setValueAtTime(v, t0); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      src.connect(f); f.connect(g); g.connect(sfxBus); src.start(t0); src.stop(t0 + dur + 0.02);
    }
    const N = (n) => 440 * Math.pow(2, (n - 69) / 12);
    const SFX = {
      tap: () => tone(N(84), 0.05, { type: 'square', vol: 0.05 }),
      open: () => { tone(N(76), 0.07, { type: 'triangle', vol: 0.12 }); tone(N(83), 0.1, { type: 'triangle', vol: 0.12, delay: 0.06 }); },
      close: () => { tone(N(83), 0.07, { type: 'triangle', vol: 0.1 }); tone(N(76), 0.1, { type: 'triangle', vol: 0.1, delay: 0.06 }); },
      good: () => { tone(N(79), 0.08, { type: 'triangle', vol: 0.16 }); tone(N(86), 0.14, { type: 'triangle', vol: 0.16, delay: 0.07 }); },
      coin: () => { tone(N(88), 0.06, { type: 'square', vol: 0.1 }); tone(N(95), 0.16, { type: 'square', vol: 0.1, delay: 0.06 }); },
      pop: () => tone(N(90), 0.07, { type: 'sine', vol: 0.16, slide: 300 }),
      bad: () => { tone(N(45), 0.28, { type: 'sawtooth', vol: 0.14, slide: -40 }); noise(0.16, { vol: 0.12, freq: 900, freqEnd: 200 }); },
      hit: () => noise(0.12, { vol: 0.2, freq: 1800, freqEnd: 300 }),
      jump: () => tone(N(60), 0.16, { type: 'square', vol: 0.09, slide: 500 }),
      whoosh: () => noise(0.22, { vol: 0.12, filter: 'bandpass', freq: 600, freqEnd: 2400 }),
      start: () => { tone(N(72), 0.09, { type: 'square', vol: 0.1 }); tone(N(72), 0.09, { type: 'square', vol: 0.1, delay: 0.14 }); tone(N(79), 0.22, { type: 'square', vol: 0.12, delay: 0.28 }); },
      clear: () => { [72, 76, 79, 84].forEach((n, i) => tone(N(n), 0.16, { type: 'triangle', vol: 0.16, delay: i * 0.09 })); },
      fanfare: () => { [72, 76, 79, 84, 79, 84].forEach((n, i) => tone(N(n), i >= 4 ? 0.3 : 0.14, { type: 'square', vol: 0.11, delay: i * 0.1 })); [60, 64, 67, 72].forEach((n, i) => tone(N(n), 0.5, { type: 'triangle', vol: 0.08, delay: 0.4 + i * 0.02 })); },
      fail: () => { [67, 64, 60].forEach((n, i) => tone(N(n), 0.22, { type: 'triangle', vol: 0.14, delay: i * 0.16 })); },
      notify: () => { tone(N(88), 0.08, { type: 'sine', vol: 0.14 }); tone(N(93), 0.2, { type: 'sine', vol: 0.14, delay: 0.09 }); },
      levelup: () => { [60, 64, 67, 72, 76, 79].forEach((n, i) => tone(N(n), 0.12, { type: 'triangle', vol: 0.14, delay: i * 0.06 })); tone(N(84), 0.5, { type: 'triangle', vol: 0.16, delay: 0.38 }); },
      hatch: () => { noise(0.1, { vol: 0.15, freq: 2500 }); [72, 79, 84].forEach((n, i) => tone(N(n), 0.18, { type: 'sine', vol: 0.15, delay: 0.1 + i * 0.1 })); },
      chirp: () => { tone(N(91), 0.06, { type: 'sine', vol: 0.1, slide: 200 }); tone(N(95), 0.08, { type: 'sine', vol: 0.1, delay: 0.08, slide: 150 }); },
      sad: () => { tone(N(67), 0.2, { type: 'sine', vol: 0.12, slide: -60 }); tone(N(62), 0.3, { type: 'sine', vol: 0.12, delay: 0.18, slide: -80 }); },
      sleep: () => { [72, 67, 64].forEach((n, i) => tone(N(n), 0.32, { type: 'sine', vol: 0.1, delay: i * 0.22 })); },
      wake: () => { [64, 67, 72].forEach((n, i) => tone(N(n), 0.14, { type: 'sine', vol: 0.1, delay: i * 0.1 })); },
      die: () => { [64, 63, 62, 55].forEach((n, i) => tone(N(n), 0.5, { type: 'triangle', vol: 0.12, delay: i * 0.4 })); },
      love: () => { [76, 79, 83, 88].forEach((n, i) => tone(N(n), 0.22, { type: 'sine', vol: 0.12, delay: i * 0.12 })); },
      tick: () => tone(N(96), 0.03, { type: 'square', vol: 0.04 }),
    };
    let lastSfxAt = {};
    function play(name) {
      const fn = SFX[name]; if (!fn || !unlocked || !sfxOn()) return;
      const now = performance.now();
      // おなじ おとの れんだは 40ms に 1かいまで
      if (lastSfxAt[name] && now - lastSfxAt[name] < 40) return;
      lastSfxAt[name] = now;
      try { fn(); } catch (err) { /* おとが ならなくても ゲームは とめない */ }
    }
    // BGM: 場面ごとの きょく。8しょうせつ ループ。数字は MIDI ノート、null は やすみ。
    // chords: しょうせつごとの コード(パッド)、roots: ベースの ね(MIDI)、bass: ね からの
    // はんおん オフセット(16分 × 16)、lead: しょうせつごとの メロディ(16分 × 16)、
    // drums: 16文字の パターン('x' で ならす)、arp: true なら 2しゅうめ ごと、'always' なら つねに
    const _ = null;
    const TRACKS = {
      home: { bpm: 96, swing: 0.08, lead: 'triangle', leadVol: 0.12, detune: 6, bassVol: 0.1, hat: 0.05, kick: 0.14, snare: 0.05, arp: true, arpVol: 0.035,
        chords: [[60, 64, 67], [57, 60, 64], [65, 69, 72], [67, 71, 74], [60, 64, 67], [64, 67, 71], [65, 69, 72], [67, 71, 74, 77]],
        roots: [48, 45, 41, 43, 48, 40, 41, 43],
        bass: [0, _, _, _, 7, _, _, _, 0, _, _, _, 12, _, 7, _],
        drums: { kick: 'x.......x.......', snare: '....x.......x...', hat: '..x...x...x...x.' },
        lead: [
          [72, _, 76, _, 79, _, 76, _, 72, _, _, _, 74, _, 76, _],
          [69, _, 72, _, 76, _, 72, _, 69, _, _, _, 67, _, 69, _],
          [65, _, 69, _, 72, _, 69, _, 77, _, _, _, 76, _, 74, _],
          [74, _, 71, _, 67, _, 71, _, 74, _, _, _, 72, _, _, _],
          [79, _, _, 76, _, _, 72, _, 76, _, 74, _, 79, _, _, _],
          [79, _, _, 83, _, _, 79, _, 76, _, 74, _, 76, _, _, _],
          [77, _, 76, _, 77, _, 81, _, 84, _, _, _, 81, _, 77, _],
          [79, _, _, _, 77, _, 74, _, 71, _, _, _, 74, _, 72, _]] },
      night: { bpm: 66, swing: 0, lead: 'sine', leadVol: 0.1, bassVol: 0.08, hat: 0, kick: 0, arp: 'always', arpVol: 0.03, padVol: 0.03,
        chords: [[57, 60, 64], [53, 57, 60], [60, 64, 67], [55, 59, 62], [57, 60, 64], [50, 53, 57], [52, 56, 59], [57, 60, 64]],
        roots: [45, 41, 48, 43, 45, 50, 52, 45],
        bass: [0, _, _, _, _, _, _, _, 7, _, _, _, _, _, _, _],
        drums: {},
        lead: [
          [76, _, _, _, 72, _, _, _, 69, _, _, _, _, _, _, _],
          [77, _, _, _, 72, _, _, _, 69, _, _, _, 72, _, _, _],
          [79, _, _, _, 76, _, _, _, 72, _, _, _, _, _, _, _],
          [74, _, _, _, 71, _, _, _, 67, _, _, _, 71, _, _, _],
          [81, _, _, _, 76, _, _, _, 72, _, _, _, 76, _, _, _],
          [77, _, _, _, 74, _, _, _, 69, _, _, _, 74, _, _, _],
          [80, _, _, _, 76, _, _, _, 71, _, _, _, 68, _, _, _],
          [69, _, _, _, _, _, _, _, 72, _, _, _, 69, _, _, _]] },
      game: { bpm: 138, swing: 0, lead: 'square', leadVol: 0.07, bassVol: 0.1, hat: 0.06, kick: 0.2, snare: 0.09, arp: true, arpVol: 0.03,
        chords: [[60, 64, 67], [60, 64, 67], [65, 69, 72], [67, 71, 74], [57, 60, 64], [65, 69, 72], [67, 71, 74], [67, 71, 74]],
        roots: [48, 48, 41, 43, 45, 41, 43, 43],
        bass: [0, _, 12, _, 0, _, 12, _, 0, _, 12, _, 0, _, 7, _],
        drums: { kick: 'x...x...x...x.x.', snare: '....x.......x...', hat: 'x.x.x.x.x.x.x.x.' },
        lead: [
          [79, _, 79, 76, _, 79, _, 81, _, 79, _, 76, _, 72, _, _],
          [76, _, 76, 72, _, 76, _, 79, _, 76, _, 72, _, 67, _, _],
          [77, _, 77, 74, _, 77, _, 81, _, 84, _, 81, _, 77, _, _],
          [79, _, 83, _, 86, _, 83, _, 79, _, 74, _, 71, _, 67, _],
          [81, _, 81, _, 79, _, 76, _, 72, _, _, 76, _, 81, _, _],
          [81, _, 81, _, 79, _, 77, _, 72, _, _, 77, _, 81, _, _],
          [83, _, 83, _, 86, _, 83, _, 79, _, 74, _, 79, _, _, _],
          [74, _, 76, _, 79, _, 83, _, 86, _, _, _, 84, _, 83, _]] },
      movie: { bpm: 112, swing: 0, lead: 'sine', leadVol: 0.11, detune: 5, bassVol: 0.09, hat: 0.03, kick: 0.07, waltz: true, arp: true, arpVol: 0.03,
        chords: [[60, 64, 67, 71], [57, 60, 64, 67], [62, 65, 69, 72], [67, 71, 74, 77], [64, 67, 71, 74], [57, 60, 64, 67], [62, 65, 69, 72], [67, 71, 74, 77]],
        roots: [48, 45, 50, 43, 52, 45, 50, 43],
        bass: [0, _, _, _, _, _, 7, _, _, _, _, 7, _, _, _, _],
        drums: { kick: 'x...............', hat: '......x....x....' },
        lead: [
          [79, _, _, _, 76, _, 74, _, _, _, 72, _, 76, _, _, _],
          [76, _, _, _, 72, _, 69, _, _, _, 67, _, 72, _, _, _],
          [77, _, _, _, 74, _, 72, _, _, _, 69, _, 74, _, _, _],
          [74, _, _, _, 71, _, 67, _, _, _, 71, _, 74, _, _, _],
          [79, _, _, _, 83, _, 79, _, _, _, 76, _, 74, _, _, _],
          [76, _, _, _, 79, _, 76, _, _, _, 72, _, 69, _, _, _],
          [77, _, _, _, 81, _, 77, _, _, _, 74, _, 72, _, _, _],
          [71, _, _, _, 74, _, 77, _, _, _, 79, _, _, _, _, _]] },
      puzzle: { bpm: 100, swing: 0.1, lead: 'sine', leadVol: 0.1, detune: 4, bassVol: 0.08, hat: 0.03, kick: 0, arp: true, arpVol: 0.03,
        chords: [[57, 60, 64, 67], [65, 69, 72, 76], [60, 64, 67, 71], [67, 71, 74], [62, 65, 69, 72], [64, 67, 71, 74], [65, 69, 72, 76], [67, 71, 74]],
        roots: [45, 41, 48, 43, 50, 52, 41, 43],
        bass: [0, _, _, _, _, _, 7, _, 0, _, _, _, _, _, 12, _],
        drums: { hat: '..x...x...x...x.' },
        lead: [
          [76, _, _, 79, _, _, 81, _, _, _, 79, _, 76, _, _, _],
          [77, _, _, 81, _, _, 84, _, _, _, 81, _, 77, _, _, _],
          [79, _, _, 76, _, _, 72, _, _, _, 76, _, 79, _, _, _],
          [74, _, _, 77, _, _, 79, _, _, _, 83, _, 79, _, _, _],
          [81, _, _, 77, _, _, 74, _, _, _, 77, _, 81, _, _, _],
          [79, _, _, 83, _, _, 79, _, _, _, 76, _, 74, _, _, _],
          [76, _, _, 77, _, _, 81, _, _, _, 84, _, 81, _, _, _],
          [79, _, _, _, 83, _, _, _, 86, _, _, _, 83, _, 79, _]] },
      race: { bpm: 152, swing: 0, lead: 'square', leadVol: 0.07, bassVol: 0.11, hat: 0.07, kick: 0.22, snare: 0.1, arp: true, arpVol: 0.03,
        chords: [[57, 60, 64], [57, 60, 64], [65, 69, 72], [67, 71, 74], [57, 60, 64], [60, 64, 67], [65, 69, 72], [64, 68, 71]],
        roots: [45, 45, 41, 43, 45, 48, 41, 52],
        bass: [0, 0, 12, 0, 0, 12, 0, 0, 0, 0, 12, 0, 7, 7, 12, 12],
        drums: { kick: 'x...x...x...x...', snare: '....x.......x..x', hat: 'x.x.x.x.x.x.x.x.' },
        lead: [
          [76, _, 76, _, 79, 76, _, 74, _, 76, _, _, 79, _, 81, _],
          [76, _, 76, _, 79, 76, _, 74, _, 72, _, _, 71, _, 72, _],
          [77, _, 77, _, 81, 77, _, 76, _, 77, _, _, 81, _, 84, _],
          [79, _, 79, _, 83, 79, _, 77, _, 79, _, _, 83, _, 86, _],
          [81, _, 84, _, 81, _, 79, _, 76, _, 79, _, 81, _, _, _],
          [79, _, 84, _, 79, _, 76, _, 72, _, 76, _, 79, _, _, _],
          [81, _, 84, _, 81, _, 77, _, 77, _, 76, _, 81, _, _, _],
          [80, _, 83, _, 80, _, 76, _, 71, _, 76, _, 80, _, 83, _]] },
      sports: { bpm: 124, swing: 0.05, lead: 'triangle', leadVol: 0.11, detune: 5, bassVol: 0.1, hat: 0.06, kick: 0.18, snare: 0.08, arp: true, arpVol: 0.03,
        chords: [[65, 69, 72], [67, 71, 74], [69, 72, 76], [67, 71, 74], [65, 69, 72], [69, 72, 76], [70, 74, 77], [72, 76, 79]],
        roots: [41, 43, 45, 43, 41, 45, 46, 48],
        bass: [0, _, 0, _, 7, _, 0, _, 0, _, 0, _, 12, _, 7, _],
        drums: { kick: 'x...x...x...x...', snare: '....x.......x...', hat: '..x...x...x...x.' },
        lead: [
          [81, _, 84, _, 81, _, 77, _, 81, _, _, _, 84, _, _, _],
          [83, _, 86, _, 83, _, 79, _, 83, _, _, _, 86, _, _, _],
          [84, _, 88, _, 84, _, 81, _, 81, _, _, _, 84, _, _, _],
          [83, _, 79, _, 76, _, 79, _, 83, _, _, _, 86, _, _, _],
          [84, _, _, 81, _, _, 77, _, 81, _, 84, _, 89, _, _, _],
          [88, _, _, 84, _, _, 81, _, 84, _, 88, _, 91, _, _, _],
          [86, _, _, 82, _, _, 77, _, 82, _, 86, _, 89, _, _, _],
          [88, _, _, 84, _, 79, _, 76, _, 79, _, 84, _, 88, _, _]] },
      farewell: { bpm: 60, swing: 0, lead: 'sine', leadVol: 0.12, detune: 4, bassVol: 0.08, hat: 0, kick: 0, padVol: 0.045,
        chords: [[57, 60, 64], [53, 57, 60], [60, 64, 67], [55, 59, 62], [57, 60, 64], [53, 57, 60], [52, 56, 59], [57, 60, 64]],
        roots: [45, 41, 48, 43, 45, 41, 52, 45],
        bass: [0, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
        drums: {},
        lead: [
          [72, _, _, _, _, _, 71, _, 69, _, _, _, _, _, _, _],
          [69, _, _, _, _, _, 67, _, 65, _, _, _, _, _, _, _],
          [67, _, _, _, _, _, 69, _, 72, _, _, _, _, _, _, _],
          [74, _, _, _, _, _, 71, _, 67, _, _, _, _, _, _, _],
          [76, _, _, _, _, _, 74, _, 72, _, _, _, _, _, _, _],
          [72, _, _, _, _, _, 69, _, 65, _, _, _, _, _, _, _],
          [68, _, _, _, _, _, 71, _, 76, _, _, _, _, _, _, _],
          [69, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _]] },
    };
    function synthNote(midi, t, dur, type, vol, bus, detune = 0) {
      const c = ctx; const osc = c.createOscillator(); osc.type = type; osc.frequency.setValueAtTime(N(midi), t);
      const g = c.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + 0.02); g.gain.setValueAtTime(vol, t + Math.max(0.03, dur * 0.6)); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      osc.connect(g); g.connect(bus); osc.start(t); osc.stop(t + dur + 0.05);
      // detune > 0 なら すこし ずらした 2本目を かさねて ふくらみを 出す(コーラス)
      if (detune) { const o2 = c.createOscillator(); o2.type = type; o2.frequency.setValueAtTime(N(midi), t); o2.detune.setValueAtTime(detune, t); const g2 = c.createGain(); g2.gain.setValueAtTime(0.0001, t); g2.gain.linearRampToValueAtTime(vol * 0.5, t + 0.03); g2.gain.setValueAtTime(vol * 0.5, t + Math.max(0.03, dur * 0.6)); g2.gain.exponentialRampToValueAtTime(0.0001, t + dur); o2.connect(g2); g2.connect(bus); o2.start(t); o2.stop(t + dur + 0.05); }
    }
    function drum(kind, t, vol, bus) {
      const c = ctx;
      if (kind === 'kick') { const o = c.createOscillator(); o.type = 'sine'; o.frequency.setValueAtTime(150, t); o.frequency.exponentialRampToValueAtTime(45, t + 0.12); const g = c.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.16); o.connect(g); g.connect(bus); o.start(t); o.stop(t + 0.2); }
      else if (kind === 'snare') { const src = c.createBufferSource(); src.buffer = noiseBuf; const f = c.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 1800; f.Q.value = 0.7; const g = c.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.11); src.connect(f); f.connect(g); g.connect(bus); src.start(t); src.stop(t + 0.13); const o = c.createOscillator(); o.type = 'triangle'; o.frequency.setValueAtTime(190, t); o.frequency.exponentialRampToValueAtTime(120, t + 0.06); const g2 = c.createGain(); g2.gain.setValueAtTime(vol * 0.6, t); g2.gain.exponentialRampToValueAtTime(0.0001, t + 0.07); o.connect(g2); g2.connect(bus); o.start(t); o.stop(t + 0.09); }
      else { const src = c.createBufferSource(); src.buffer = noiseBuf; const f = c.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 6000; const g = c.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.04); src.connect(f); f.connect(g); g.connect(bus); src.start(t); src.stop(t + 0.06); }
    }
    // 1ステップ(16分おんぷ)ぶんを ならす。i は きょくの はじめからの ステップ番号
    function scheduleStep(tr, i, t, stepDur) {
      const bars = tr.chords.length, bar = Math.floor(i / 16) % bars, s = i % 16, loop = Math.floor(i / (16 * bars));
      const chord = tr.chords[bar], root = tr.roots[bar];
      // コード(パッド): しょうせつの あたま と 3はく目(ワルツは 2・3はく目)
      if (s === 0 || (tr.waltz ? (s === 6 || s === 11) : s === 8)) { for (const n of chord) synthNote(n, t, stepDur * (tr.waltz ? 5 : 7), 'triangle', tr.padVol || 0.035, sceneGain); }
      const b = tr.bass[s]; if (b != null) synthNote(root + b, t, stepDur * 1.8, 'triangle', tr.bassVol, sceneGain);
      const l = tr.lead[bar][s]; if (l != null) synthNote(l, t, stepDur * 2.2, tr.lead, tr.leadVol, sceneGain, tr.detune || 0);
      // アルペジオ: うらの 8分に コードの おとを 1こずつ。2しゅうめ ごとに 入って へんかを つける
      if ((tr.arp === 'always' || (tr.arp && loop % 2 === 1)) && s % 4 === 2) synthNote(chord[(s >> 2) % chord.length] + 12, t, stepDur * 1.6, 'sine', tr.arpVol || 0.03, sceneGain);
      const d = tr.drums || {}; const on = (p) => p && p[s] === 'x';
      if (tr.kick && on(d.kick)) drum('kick', t, tr.kick, sceneGain);
      if (tr.snare && on(d.snare)) drum('snare', t, tr.snare, sceneGain);
      if (tr.hat && on(d.hat)) drum('hat', t, s % 4 === 0 ? tr.hat : tr.hat * 0.6, sceneGain);
      // はやい きょくは 2しゅうめ ごとに ハイハットの 16分を たして もりあげる
      if (tr.hat && d.hat && tr.bpm >= 120 && loop % 2 === 1 && s % 2 === 1) drum('hat', t, tr.hat * 0.3, sceneGain);
    }
    function scheduler() {
      schedTimer = null;
      if (!ctx || !unlocked) return;
      const wanted = bgmOn() ? currentScene() : null;
      if (wanted !== scene) switchScene(wanted);
      if (track && sceneGain) {
        const tr = TRACKS[track]; const stepDur = 60 / tr.bpm / 4;
        while (nextNoteTime < ctx.currentTime + 0.3) {
          const swing = (step % 2 === 1) ? stepDur * tr.swing : 0;
          scheduleStep(tr, step, nextNoteTime + swing, stepDur);
          nextNoteTime += stepDur; step++;
        }
      }
      schedTimer = rawSetTimeout(scheduler, 100);
    }
    function startScheduler() { if (!schedTimer && ctx) scheduler(); }
    function switchScene(next) {
      const c = ctx; if (!c) return;
      if (sceneGain) { const old = sceneGain; old.gain.cancelScheduledValues(c.currentTime); old.gain.setValueAtTime(old.gain.value, c.currentTime); old.gain.linearRampToValueAtTime(0.0001, c.currentTime + 0.6); rawSetTimeout(() => { try { old.disconnect(); } catch (err) {} }, 800); }
      sceneGain = null; scene = next; track = next && TRACKS[next] ? next : null;
      if (!track) return;
      sceneGain = c.createGain(); sceneGain.gain.setValueAtTime(0.0001, c.currentTime); sceneGain.gain.linearRampToValueAtTime(1, c.currentTime + 0.8); sceneGain.connect(bgmBus);
      nextNoteTime = c.currentTime + 0.05; step = 0;
    }
    // いま の 場面。render() の じょうたいから きめる
    function currentScene() {
      try {
        const state = getState(), gameActive = isGameActive(), activeMinigame = getActiveMinigame(), dateOpen = isDateOpen();
        if (!state) return 'home';
        if (state.stage === STAGE.DEAD || state.stage === STAGE.FAREWELL || (el.lifeCardOverlay && !el.lifeCardOverlay.classList.contains('hidden'))) return 'farewell';
        if (gameActive) {
          // ジャンルごとに きょくを かえる(3D・のりもの→race、パズル/ボード→puzzle、スポーツ→sports、ほかは game)
          const genre = activeMinigame && typeof minigameGenreId === 'function' ? minigameGenreId(activeMinigame) : 'action';
          return genre === 'drive3d' ? 'race' : (genre === 'puzzle' || genre === 'board') ? 'puzzle' : genre === 'sports' ? 'sports' : 'game';
        }
        const movie = document.getElementById('dateMovie');
        if ((movie && !movie.classList.contains('hidden')) || dateOpen) return 'movie';
        if (state.isSleeping) return 'night';
        return 'home';
      } catch (err) { return 'home'; }
    }
    function settingsChanged() {
      if (!ctx) return;
      if (!bgmOn() && scene) switchScene(null);
      startScheduler();
    }
    // さいしょの そうさで かいじょう。タブが かくれたら いったん とめる
    const unlockHandler = () => { unlock(); if (unlocked) { document.removeEventListener('pointerdown', unlockHandler, true); document.removeEventListener('keydown', unlockHandler, true); } };
    document.addEventListener('pointerdown', unlockHandler, true);
    document.addEventListener('keydown', unlockHandler, true);
    document.addEventListener('visibilitychange', () => { if (!ctx) return; if (document.hidden) { try { ctx.suspend(); } catch (err) {} } else if (unlocked) { try { ctx.resume(); } catch (err) {} } });
    return { play, settingsChanged, currentScene, get unlocked() { return unlocked; }, _debug: () => ({ ctx, master, scene, track, step }), _tracks: TRACKS };
  };
})();
