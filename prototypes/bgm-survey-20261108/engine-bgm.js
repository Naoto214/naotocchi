// なおとっち BGM 総点検 (2026-11-08) — 試聴用 Web Audio エンジン
// V2 の engine-v2.js を 複製し、「ゲームの 音」再生を audio.js の 8曲 すべてに 広げた もの (V2 の ファイルは 変更していない)。
// 以下 V2 の 説明:
// VERSION 1 の engine.js を 複製し、音量調整・iPhone Safari 対策・一時停止からの 復帰を 足した もの。
// (V1 の engine.js は 変更していない。音色・伴奏型・音量は V1 と 同一)
// 6曲すべてを 同じ 音色・同じ 音量・同じ 伴奏型で 鳴らす (メロディだけの 差を 聴くため)。
// mode: 'melody' = メロディのみ / 'piano' = ピアノ (メロディ + 左手) / 'band' = 軽い伴奏
//       'game'   = 現行曲だけ: audio.js と おなじ 鳴らしかた (参考)
(function (root) {
  'use strict';
  const S = root.NAOTOCCHI_THEME_SONGS; // flatten() は V1 の 関数を 使う
  const hz = (m) => 440 * Math.pow(2, (m - 69) / 12);
  const LEVEL = { melody: 0.30, lh: 0.11, arp: 0.085, bass: 0.16, pad: 0.022, kick: 0.20, shaker: 0.018 };

  // コードの 左手 voicing: E3〜F4 の なかで 前の 和音に 近い 形
  function voicing(chord, prev) {
    let best = null, bestCost = Infinity;
    for (let inv = 0; inv < chord.pcs.length; inv++) {
      const pcs = chord.pcs.slice(inv).concat(chord.pcs.slice(0, inv));
      let m = 52 + ((pcs[0] - 52) % 12 + 12) % 12; const v = [m];
      for (let i = 1; i < pcs.length; i++) { let n = v[i - 1] + 1; while (n % 12 !== pcs[i]) n++; v.push(n); }
      if (v[v.length - 1] > 70) continue;
      const cost = prev ? v.reduce((s, n, i) => s + Math.abs(n - (prev[i] ?? prev[prev.length - 1])), 0) : Math.abs(v[0] - 55);
      if (cost < bestCost) { bestCost = cost; best = v; }
    }
    return best || chord.pcs.map((pc) => 55 + ((pc - 55) % 12 + 12) % 12).sort((a, b) => a - b);
  }
  const bassNote = (pc) => 40 + ((pc - 40) % 12 + 12) % 12; // E2〜D#3

  // 曲 → 時刻つき イベント列 (秒)。tempo を わたすと テンポを そろえる
  function buildEvents(song, mode, opts = {}) {
    const bpm = opts.bpm || song.bpm, spb = 60 / bpm, flat = S.flatten(song), passBeats = flat.beats;
    const ev = []; const reps = opts.repeats || song.repeats;
    if (mode === 'game' && song.raw) return buildGameEvents(song, reps, opts);
    // 比較用の 再生は スウィングなし (現行曲の swing 0.08 は 16分裏だけに かかり、メロディには ほぼ 影響しない)
    const at = (beat) => beat * spb;
    for (let r = 0; r < reps; r++) {
      const off = r * passBeats;
      for (const n of flat.notes) {
        const accent = (n.beat % song.meter === 0) ? 1.0 : (n.beat % 1 === 0 ? 0.9 : 0.82);
        ev.push({ kind: 'piano', t: at(off + n.beat), midi: n.midi, dur: n.dur * spb * 0.96, vel: LEVEL.melody * accent, mel: true, beat: n.beat });
      }
      if (mode === 'melody') continue;
      let prev = null;
      for (const c of flat.chords) {
        const v = voicing(c.chord, prev); prev = v; const b0 = off + c.beat, bass = bassNote(c.chord.bass);
        if (mode === 'piano') {
          ev.push({ kind: 'piano', t: at(b0), midi: bass, dur: c.dur * spb, vel: LEVEL.lh * 1.2 });
          // 4/4: 1拍目 ね+和音、3拍目 和音 / 3/4: 1拍目 ね、2・3拍目 和音
          const hits = song.meter === 3 ? [1, 2] : (c.dur >= 4 ? [0, 2] : [0]);
          for (const h of hits) if (h < c.dur) for (const m of v) ev.push({ kind: 'piano', t: at(b0 + h), midi: m, dur: (song.meter === 3 ? 1 : Math.min(2, c.dur - h)) * spb * 0.95, vel: LEVEL.lh * (h === 0 ? 0.9 : 0.75) });
        } else if (mode === 'band') {
          // ベース: コード頭 と (4拍の とき) 3拍目に 5度
          ev.push({ kind: 'bass', t: at(b0), midi: bass, dur: Math.min(c.dur, 2) * spb * 0.9, vel: LEVEL.bass });
          if (song.meter === 4 && c.dur >= 4) ev.push({ kind: 'bass', t: at(b0 + 2), midi: bass + 7 > 52 ? bass - 5 : bass + 7, dur: 2 * spb * 0.9, vel: LEVEL.bass * 0.85 });
          if (song.meter === 3) ev.push({ kind: 'bass', t: at(b0 + 2), midi: bass + 7 > 52 ? bass - 5 : bass + 7, dur: spb * 0.8, vel: LEVEL.bass * 0.6 });
          // 左手 分散和音: 8分で ね・5度・10度・5度 …
          const pat = [bass + 12, v[1] ?? v[0], v[v.length - 1] + (v[v.length - 1] < 62 ? 12 : 0), v[1] ?? v[0]];
          for (let k = 0; k < c.dur * 2; k++) ev.push({ kind: 'piano', t: at(b0 + k / 2), midi: pat[k % 4], dur: spb * 0.9, vel: LEVEL.arp * (k % 2 ? 0.75 : 1) });
          ev.push({ kind: 'pad', t: at(b0), notes: v, dur: c.dur * spb, vel: LEVEL.pad });
        }
      }
      if (mode === 'band') {
        for (let b = 0; b < passBeats; b++) {
          const inBar = b % song.meter;
          if (inBar === 0 || (song.meter === 4 && inBar === 2)) ev.push({ kind: 'kick', t: at(off + b), vel: LEVEL.kick * (inBar === 0 ? 1 : 0.7) });
          ev.push({ kind: 'shaker', t: at(off + b), vel: LEVEL.shaker });
          ev.push({ kind: 'shaker', t: at(off + b + 0.5), vel: LEVEL.shaker * 0.6 });
        }
      }
    }
    ev.sort((a, b) => a.t - b.t);
    return { events: ev, duration: reps * passBeats * spb + 1.2, passSeconds: passBeats * spb, spb };
  }

  // audio.js の scheduleStep を 1行ずつ なぞった「ゲームの 音」再生。8曲 すべてに 使える
  // (V2 の engine では home の 鳴らし方だけを なぞっていた。ここでは 曲ごとの 音色・ドラム・ワルツ・
  //  アルペジオ・16分ハイハット・スウィングを audio.js と 同じ 条件で 鳴らす)
  function buildGameEvents(song, reps, opts) {
    const tr = song.raw, bpm = opts.bpm || tr.bpm, stepDur = 60 / bpm / 4, ev = [];
    const bars = tr.chords.length, total = 16 * bars * reps, d = tr.drums || {}, on = (p, s) => p && p[s] === 'x';
    const G = 0.28 * 6; // audio.js の bgmBus(0.28)。試聴用に ほかの モードと 同じ 音量感まで もちあげる (曲間の 補正は 別)
    for (let i = 0; i < total; i++) {
      const bar = Math.floor(i / 16) % bars, s = i % 16, loop = Math.floor(i / (16 * bars));
      const t = i * stepDur + (i % 2 === 1 ? stepDur * (tr.swing || 0) : 0), chord = tr.chords[bar], rootN = tr.roots[bar];
      if (s === 0 || (tr.waltz ? (s === 6 || s === 11) : s === 8)) for (const n of chord) ev.push({ kind: 'synth', type: 'triangle', t, midi: n, dur: stepDur * (tr.waltz ? 5 : 7), vel: (tr.padVol || 0.035) * G });
      const b = tr.bass[s]; if (b != null) ev.push({ kind: 'synth', type: 'triangle', t, midi: rootN + b, dur: stepDur * 1.8, vel: tr.bassVol * G });
      const l = tr.lead[bar][s]; if (l != null) ev.push({ kind: 'synth', type: tr.leadType, t, midi: l, dur: stepDur * 2.2, vel: tr.leadVol * G, detune: tr.detune || 0 });
      if ((tr.arp === 'always' || (tr.arp && loop % 2 === 1)) && s % 4 === 2) ev.push({ kind: 'synth', type: 'sine', t, midi: chord[(s >> 2) % chord.length] + 12, dur: stepDur * 1.6, vel: (tr.arpVol || 0.03) * G });
      if (tr.kick && on(d.kick, s)) ev.push({ kind: 'gkick', t, vel: tr.kick * G });
      if (tr.snare && on(d.snare, s)) ev.push({ kind: 'gsnare', t, vel: tr.snare * G });
      if (tr.hat && on(d.hat, s)) ev.push({ kind: 'ghat', t, vel: (s % 4 === 0 ? tr.hat : tr.hat * 0.6) * G });
      if (tr.hat && d.hat && bpm >= 120 && loop % 2 === 1 && s % 2 === 1) ev.push({ kind: 'ghat', t, vel: tr.hat * 0.3 * G });
    }
    return { events: ev, duration: total * stepDur + 1, passSeconds: 16 * bars * stepDur, spb: stepDur * 4 };
  }

  // ---- 音色 ----
  function makeVoices(ctx, out) {
    const wave = ctx.createPeriodicWave(new Float32Array([0, 1, 0.42, 0.2, 0.11, 0.06, 0.035, 0.02, 0.01]), new Float32Array(9));
    const len = Math.floor(ctx.sampleRate * 0.3), noise = ctx.createBuffer(1, len, ctx.sampleRate);
    { const d = noise.getChannelData(0); let seed = 7; for (let i = 0; i < len; i++) { seed = (seed * 16807) % 2147483647; d[i] = seed / 1073741823.5 - 1; } }
    function piano(t, midi, dur, vel) {
      const f = hz(midi), o = ctx.createOscillator(), lp = ctx.createBiquadFilter(), g = ctx.createGain();
      o.setPeriodicWave(wave); o.frequency.setValueAtTime(f, t);
      lp.type = 'lowpass'; lp.Q.value = 0.3; lp.frequency.setValueAtTime(Math.min(9000, f * 8), t); lp.frequency.setTargetAtTime(Math.min(4000, f * 2.6), t + 0.01, 0.35);
      const decay = Math.max(0.45, 1.6 - (midi - 60) * 0.03);
      g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vel, t + 0.006); g.gain.setTargetAtTime(vel * 0.18, t + 0.006, decay);
      g.gain.setTargetAtTime(0.0001, t + dur, 0.07);
      o.connect(lp); lp.connect(g); g.connect(out); o.start(t); o.stop(t + dur + 0.6);
    }
    function synth(t, midi, dur, vel, type, detune) {
      const mk = (dt, v) => { const o = ctx.createOscillator(), g = ctx.createGain(); o.type = type; o.frequency.setValueAtTime(hz(midi), t); if (dt) o.detune.setValueAtTime(dt, t); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(v, t + 0.02); g.gain.setValueAtTime(v, t + Math.max(0.03, dur * 0.6)); g.gain.exponentialRampToValueAtTime(0.0001, t + dur); o.connect(g); g.connect(out); o.start(t); o.stop(t + dur + 0.05); };
      mk(0, vel); if (detune) mk(detune, vel * 0.5);
    }
    function bass(t, midi, dur, vel) {
      const o = ctx.createOscillator(), o2 = ctx.createOscillator(), lp = ctx.createBiquadFilter(), g = ctx.createGain();
      o.type = 'triangle'; o2.type = 'sine'; o.frequency.setValueAtTime(hz(midi), t); o2.frequency.setValueAtTime(hz(midi), t);
      lp.type = 'lowpass'; lp.frequency.value = 700;
      g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vel, t + 0.01); g.gain.setTargetAtTime(vel * 0.5, t + 0.01, 0.3); g.gain.setTargetAtTime(0.0001, t + dur, 0.06);
      o.connect(lp); o2.connect(lp); lp.connect(g); g.connect(out); o.start(t); o2.start(t); o.stop(t + dur + 0.4); o2.stop(t + dur + 0.4);
    }
    function pad(t, notes, dur, vel) {
      const lp = ctx.createBiquadFilter(), g = ctx.createGain(); lp.type = 'lowpass'; lp.frequency.value = 1400;
      g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vel, t + Math.min(0.35, dur * 0.3)); g.gain.setValueAtTime(vel, t + Math.max(0.36, dur - 0.1)); g.gain.linearRampToValueAtTime(0.0001, t + dur + 0.35);
      lp.connect(g); g.connect(out);
      for (const m of notes) for (const dt of [-7, 7]) { const o = ctx.createOscillator(); o.type = 'triangle'; o.frequency.setValueAtTime(hz(m + 12), t); o.detune.setValueAtTime(dt, t); o.connect(lp); o.start(t); o.stop(t + dur + 0.4); }
    }
    function kick(t, vel) { const o = ctx.createOscillator(), g = ctx.createGain(); o.type = 'sine'; o.frequency.setValueAtTime(120, t); o.frequency.exponentialRampToValueAtTime(48, t + 0.12); g.gain.setValueAtTime(vel, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.18); o.connect(g); g.connect(out); o.start(t); o.stop(t + 0.2); }
    function hiss(t, vel, freq, dur, type) { const s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain(); s.buffer = noise; f.type = type; f.frequency.value = freq; g.gain.setValueAtTime(vel, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur); s.connect(f); f.connect(g); g.connect(out); s.start(t); s.stop(t + dur + 0.02); }
    return (e, t) => {
      switch (e.kind) {
        case 'piano': return piano(t, e.midi, e.dur, e.vel);
        case 'synth': return synth(t, e.midi, e.dur, e.vel, e.type, e.detune);
        case 'bass': return bass(t, e.midi, e.dur, e.vel);
        case 'pad': return pad(t, e.notes, e.dur, e.vel);
        case 'kick': return kick(t, e.vel);
        case 'gkick': { const o = ctx.createOscillator(), g = ctx.createGain(); o.frequency.setValueAtTime(150, t); o.frequency.exponentialRampToValueAtTime(45, t + 0.12); g.gain.setValueAtTime(e.vel, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.16); o.connect(g); g.connect(out); o.start(t); o.stop(t + 0.2); return; }
        case 'gsnare': { hiss(t, e.vel, 1800, 0.11, 'bandpass'); const o = ctx.createOscillator(), g = ctx.createGain(); o.type = 'triangle'; o.frequency.setValueAtTime(190, t); o.frequency.exponentialRampToValueAtTime(120, t + 0.06); g.gain.setValueAtTime(e.vel * 0.6, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.07); o.connect(g); g.connect(out); o.start(t); o.stop(t + 0.09); return; }
        case 'ghat': return hiss(t, e.vel, 6000, 0.04, 'highpass');
        case 'shaker': return hiss(t, e.vel, 7000, 0.045, 'highpass');
      }
    };
  }

  // ---- 再生 (先読み スケジューラ) ----
  function createPlayer() {
    let ctx = null, bus = null, comp = null, timer = null, job = null, master = null, volume = 0.8, keepAlive = null;
    // iPhone: 消音スイッチが オンでも 鳴る よう「メディア再生」として あつかわせる。
    // (1) Safari 16.4+ の navigator.audioSession、(2) 無音の <audio> を ループ再生する 古い 方法
    function iosUnlock() {
      try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch (err) {}
      if (keepAlive || typeof document === 'undefined') return;
      try {
        keepAlive = document.createElement('audio');
        keepAlive.setAttribute('playsinline', ''); keepAlive.setAttribute('x-webkit-airplay', 'deny'); keepAlive.loop = true; keepAlive.preload = 'auto';
        keepAlive.src = silentWav(); keepAlive.volume = 0.01;
        const p = keepAlive.play(); if (p && p.catch) p.catch(() => {});
      } catch (err) {}
    }
    function silentWav() {
      const n = 4410, b = new Uint8Array(44 + n * 2), v = new DataView(b.buffer), w = (o, t) => { for (let i = 0; i < t.length; i++) b[o + i] = t.charCodeAt(i); };
      w(0, 'RIFF'); v.setUint32(4, 36 + n * 2, true); w(8, 'WAVEfmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
      v.setUint32(24, 44100, true); v.setUint32(28, 88200, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true); w(36, 'data'); v.setUint32(40, n * 2, true);
      let bin = ''; for (let i = 0; i < b.length; i++) bin += String.fromCharCode(b[i]);
      return 'data:audio/wav;base64,' + btoa(bin);
    }
    function ensure() {
      if (ctx) return ctx;
      const AC = root.AudioContext || root.webkitAudioContext; ctx = new AC();
      comp = ctx.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 3; comp.attack.value = 0.005; comp.release.value = 0.2;
      master = ctx.createGain(); master.gain.value = 0.9 * volume / 0.8; comp.connect(master); master.connect(ctx.destination);
      return ctx;
    }
    function setVolume(v) {
      volume = Math.max(0, Math.min(1, v));
      if (ctx && master) { const t = ctx.currentTime; master.gain.cancelScheduledValues(t); master.gain.setValueAtTime(master.gain.value, t); master.gain.linearRampToValueAtTime(0.9 * volume / 0.8, t + 0.05); }
    }
    function stop() {
      if (timer) clearInterval(timer); timer = null;
      if (bus && ctx) { const b = bus, t = ctx.currentTime; b.gain.cancelScheduledValues(t); b.gain.setValueAtTime(b.gain.value, t); b.gain.linearRampToValueAtTime(0.0001, t + 0.12); setTimeout(() => { try { b.disconnect(); } catch (err) {} }, 300); }
      bus = null; job = null;
    }
    function play(song, mode, opts = {}) {
      iosUnlock();
      const c = ensure(); if (c.state !== 'running') { try { c.resume(); } catch (err) {} }
      stop();
      bus = c.createGain(); bus.gain.value = 1; bus.connect(comp);
      const voice = makeVoices(c, bus), built = buildEvents(song, mode, opts);
      const start = c.currentTime + 0.08;
      job = { song, mode, opts, built, start, idx: 0, voice, onend: opts.onend };
      const tick = () => {
        if (!job) return;
        const horizon = c.currentTime + 0.35;
        while (job.idx < built.events.length && start + built.events[job.idx].t < horizon) { const e = built.events[job.idx++]; job.voice(e, Math.max(c.currentTime, start + e.t)); }
        if (c.currentTime > start + built.duration) {
          if (opts.loop) { const o = { ...opts }; play(song, mode, o); } else { const cb = job.onend; stop(); cb && cb(); }
        }
      };
      tick(); timer = setInterval(tick, 60);
      return built;
    }
    // いまの 再生位置 (1周ぶんの 拍)
    function position() {
      if (!job || !ctx) return null;
      const t = ctx.currentTime - job.start; if (t < 0) return { beat: 0, pass: 0 };
      const pass = Math.floor(t / job.built.passSeconds);
      return { beat: (t - pass * job.built.passSeconds) / job.built.spb, pass, seconds: t, duration: job.built.duration };
    }
    // タブを もどした ときや 着信の あと (iOS の 'interrupted') に 再開する
    if (typeof document !== 'undefined') document.addEventListener('visibilitychange', () => { if (!document.hidden && ctx && job && ctx.state !== 'running') { try { ctx.resume(); } catch (err) {} } });
    return { play, stop, position, setVolume, get volume() { return volume; }, get state() { return ctx ? ctx.state : 'none'; }, get playing() { return !!job; }, get current() { return job && { id: job.song.id, mode: job.mode }; } };
  }

  // 書き出し・音量点検用: OfflineAudioContext で 1曲ぶんを 描く (再生と おなじ 経路)
  async function renderOffline(song, mode, opts = {}) {
    const built = buildEvents(song, mode, opts), sr = opts.sampleRate || 22050;
    const OAC = root.OfflineAudioContext || root.webkitOfflineAudioContext;
    const ctx = new OAC(1, Math.ceil(built.duration * sr), sr);
    const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 3; comp.attack.value = 0.005; comp.release.value = 0.2;
    const master = ctx.createGain(); master.gain.value = 0.9; comp.connect(master); master.connect(ctx.destination);
    const voice = makeVoices(ctx, comp); for (const e of built.events) voice(e, e.t + 0.05);
    return ctx.startRendering();
  }

  root.NAOTOCCHI_BGM_ENGINE = { buildEvents, createPlayer, voicing, renderOffline };
})(typeof globalThis !== 'undefined' ? globalThis : this);
