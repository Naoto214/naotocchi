// なおとっち BGM VERSION 7 完成版 の 再生部品（ホーム・なおぽよ。・CARD GAME・なおころ。で 共通）。
// 曲は assets/bgm/*.m4a（正式採用32曲・PR #549）。曲目と 正確な 長さは assets/bgm/catalog.js。
//
//   const bgm = NAOTOCCHI_BGM2.create({ base: 'assets/bgm/', context, output, enabled: () => true });
//   bgm.unlock()            … 最初の タップの 中で 呼ぶ（iPhone Safari の 自動再生制限）
//   bgm.setSong('home-day') … ループ曲を 切りかえる（同じ 曲なら 何もしない。null で フェードアウト）
//   bgm.jingle('var-ohayo-hatch2', { duckDb: -14, then: null }) … ジングルを 1回。その 間 ループ曲を 下げ、終わったら もどす
//   bgm.stop()
//
// * 復号した 音は 最大 3曲だけ 持つ（iPhone の メモリを 守る）。
// * AAC の 末尾の 詰め物は 原盤の 長さで 切り、ループの つなぎ目に 無音が 入らない ように する。
// * 読み込みに 失敗したら onError を 呼ぶ（ゲーム側は 以前の 合成BGMに もどせる）。
(function (root) {
  'use strict';
  const COMMON_GAIN = 0.36; // 本体・別ページの最終実効ゲイン。個別補正は0dB。
  const CAT = () => root.NAOTOCCHI_BGM_CATALOG || {};
  function create(opt = {}) {
    const base = opt.base || 'assets/bgm/';
    const enabled = typeof opt.enabled === 'function' ? opt.enabled : () => true;
    let ctx = opt.context || null, out = null, own = !opt.context;
    let cur = null;          // { id, src, gain }
    let wanted = null;       // 鳴らしたい ループ曲（読み込み中も 含む）
    let jingleNode = null, jingleGain = null, jingleEpoch = 0, duckLevel = 1, duckGain = null;
    let holding = false, held;  // ジングルの あとに 曲を 切りかえる 間は、ループ曲の 指定を 保留する
    const cache = new Map(), loading = new Map();
    const FADE_IN = opt.fadeIn ?? 1.2, FADE_OUT = opt.fadeOut ?? 0.9;

    function playbackSession() { try { if (root.navigator?.audioSession) root.navigator.audioSession.type = 'playback'; } catch (err) {} }
    function running() { return ctx && ctx.state === 'running' && root.navigator?.audioSession?.state !== 'interrupted' && !root.document?.hidden; }
    function cancelJingle() {
      jingleEpoch++;
      const old = jingleNode, gain = jingleGain; jingleNode = null; jingleGain = null;
      try { old?.stop(); old?.disconnect(); gain?.disconnect(); } catch (err) {}
    }
    function interruptJingle() {
      if (holding) { wanted = held || null; holding = false; held = undefined; }
      cancelJingle(); if (duckGain) setDuck(1, .1);
    }
    function ensure() {
      if (!ctx) {
        const AC = root.AudioContext || root.webkitAudioContext; if (!AC) return null;
        try { ctx = new AC(); } catch (err) { return null; }
      }
      if (!out) {
        out = ctx.createGain(); out.gain.value = opt.level ?? 1;
        duckGain = ctx.createGain(); duckGain.gain.value = 1; duckGain.connect(out);
        out.connect(opt.output || ctx.destination);
        ctx.addEventListener?.('statechange', () => { if (ctx.state === 'interrupted' || ctx.state === 'suspended') interruptJingle(); });
        root.navigator?.audioSession?.addEventListener?.('statechange', () => { if (root.navigator.audioSession.state === 'interrupted') interruptJingle(); });
      }
      return ctx;
    }
    function unlock() {
      playbackSession();
      const c = ensure(); if (!c) return;
      try { if (c.state !== 'running') Promise.resolve(c.resume()).then(() => { if (wanted && !cur && enabled()) start(wanted); }).catch(() => {}); } catch (err) {}
      if (own) { try { const n = c.createBufferSource(); n.buffer = c.createBuffer(1, 1, c.sampleRate); n.connect(c.destination); n.start(); } catch (err) {} }
      if (wanted && !cur) start(wanted);
    }
    function decode(ab) {
      return new Promise((ok, ng) => { try { const p = ctx.decodeAudioData(ab, ok, ng); if (p && p.then) p.then(ok, ng); } catch (err) { ng(err); } });
    }
    function load(id) {
      if (cache.has(id)) { const b = cache.get(id); cache.delete(id); cache.set(id, b); return Promise.resolve(b); }
      if (loading.has(id)) return loading.get(id);
      const meta = CAT()[id]; if (!meta) return Promise.reject(new Error('unknown song ' + id));
      const p = fetch(base + meta.file).then((r) => { if (!r.ok) throw new Error('HTTP ' + r.status + ' ' + meta.file); return r.arrayBuffer(); }).then(decode).then((dec) => {
        const len = Math.min(dec.length, Math.round(meta.duration * dec.sampleRate));
        const b = ctx.createBuffer(dec.numberOfChannels, len, dec.sampleRate);
        for (let ch = 0; ch < dec.numberOfChannels; ch++) b.copyToChannel(dec.getChannelData(ch).subarray(0, len), ch);
        cache.set(id, b);
        while (cache.size > 3) { const k = [...cache.keys()].find((x) => x !== (cur && cur.id) && x !== wanted && x !== id); if (!k) break; cache.delete(k); }
        loading.delete(id); return b;
      }).catch((err) => { loading.delete(id); throw err; });
      loading.set(id, p); return p;
    }
    function fadeOutNode(node, gain, sec) {
      try { const t = ctx.currentTime; gain.gain.cancelScheduledValues(t); gain.gain.setValueAtTime(gain.gain.value, t); gain.gain.linearRampToValueAtTime(0.0001, t + sec); node.stop(t + sec + 0.05); } catch (err) {}
      setTimeout(() => { try { gain.disconnect(); } catch (err) {} }, (sec + 0.3) * 1000);
    }
    function start(id) {
      const c = ensure(); if (!c || c.state === 'closed') return;
      load(id).then((buf) => {
        if (wanted !== id || !enabled() || !running() || (cur && cur.id === id)) return;
        if (cur) { fadeOutNode(cur.src, cur.gain, FADE_OUT); cur = null; }
        const meta = CAT()[id], src = c.createBufferSource(), g = c.createGain();
        src.buffer = buf; src.loop = !!meta.loop; src.loopStart = meta.loopStart ?? 0; src.loopEnd = Math.min(meta.loopEnd ?? buf.duration, buf.duration);
        g.gain.setValueAtTime(0.0001, c.currentTime); g.gain.linearRampToValueAtTime(1, c.currentTime + FADE_IN);
        src.connect(g); g.connect(duckGain); src.start();
        const me = { id, src, gain: g }; cur = me;
        src.onended = () => { if (cur === me) { cur = null; if (!meta.loop) wanted = null; } };
      }).catch((err) => { if (wanted === id && enabled() && opt.onError) opt.onError(err, id); });
    }
    function setSong(id) {
      if (!enabled()) id = null;
      if (!id) { stop(); return; }
      if (holding) { held = id; return; }
      if (id === wanted && (cur ? cur.id === id : true)) { if (id && !cur && ctx && ctx.state === 'running') start(id); return; }
      wanted = id || null;
      if (!wanted) { if (cur) { fadeOutNode(cur.src, cur.gain, FADE_OUT); cur = null; } return; }
      if (ctx && ctx.state !== 'closed') start(wanted);
    }
    function setDuck(level, sec) {
      if (!ensure()) return; duckLevel = level; const t = ctx.currentTime;
      try { duckGain.gain.cancelScheduledValues(t); duckGain.gain.setValueAtTime(duckGain.gain.value, t); duckGain.gain.linearRampToValueAtTime(level, t + sec); } catch (err) {}
    }
    function jingle(id, o = {}) {
      if (!enabled()) return Promise.resolve(false);
      const c = ensure(); if (!c || !running()) return Promise.resolve(false);
      const request = ++jingleEpoch;
      const duck = Math.pow(10, (o.duckDb ?? -10) / 20);
      return load(id).then((buf) => {
        if (request !== jingleEpoch || !enabled() || !running()) return false;
        const old = jingleNode, oldGain = jingleGain; jingleNode = null; jingleGain = null;
        try { old?.stop(); old?.disconnect(); oldGain?.disconnect(); } catch (err) {}
        if (o.then !== undefined) { if (cur) { fadeOutNode(cur.src, cur.gain, .25); cur = null; } wanted = null; holding = true; held = o.then; } else { if (holding) { const next = held; holding = false; held = undefined; setSong(next); } setDuck(duck, .2); }
        const src = c.createBufferSource(), g = c.createGain(); src.buffer = buf; g.gain.value = 1; src.connect(g); g.connect(out);
        jingleNode = src; jingleGain = g;
        src.onended = () => {
          if (request !== jingleEpoch || jingleNode !== src) return;
          jingleNode = null; jingleGain = null; src.disconnect(); g.disconnect();
          if (o.then !== undefined) { holding = false; const next = held === undefined ? o.then : held; held = undefined; setSong(next); } else setDuck(1, 1.0);
          if (o.onend && enabled()) o.onend();
        };
        src.start(c.currentTime + (o.delay || 0));
        return true;
      }).catch((err) => { if (request === jingleEpoch && enabled() && opt.onError) opt.onError(err, id); return false; });
    }
    function stop() { cancelJingle(); holding = false; held = undefined; wanted = null; if (cur) { fadeOutNode(cur.src, cur.gain, FADE_OUT); cur = null; } if (duckGain) setDuck(1, .1); }
    function preload(ids) { if (!ensure()) return; for (const id of ids) load(id).catch(() => {}); }
    if (own && typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', () => { if (!ctx) return; try { if (document.hidden) { interruptJingle(); Promise.resolve(ctx.suspend()).catch(() => {}); } else Promise.resolve(ctx.resume()).catch(() => {}); } catch (err) {} });
      root.addEventListener && root.addEventListener('pagehide', () => { try { interruptJingle(); if (ctx) Promise.resolve(ctx.suspend()).catch(() => {}); } catch (err) {} });
    }
    if (!own) { const resume = () => { if (ctx && ctx.state !== 'running') unlock(); }; root.document?.addEventListener('pointerdown', resume, true); root.document?.addEventListener('keydown', resume, true); }
    const api = { unlock, setSong, jingle, stop, preload, setDuck, get song() { return cur ? cur.id : null; }, get wanted() { return wanted; }, get context() { return ctx; }, _cache: cache };
    (root.NAOTOCCHI_BGM2_INSTANCES = root.NAOTOCCHI_BGM2_INSTANCES || []).push(api); // 点検用（どの 曲が 鳴って いるか）
    return api;
  }
  // 時間帯（ホームの 背景と 同じ 区切り: 朝 05:00・昼 10:00・夕 16:00・夜 19:00）→ ホーム曲
  function homeSong(date) {
    const h = (date || new Date()).getHours();
    return h >= 5 && h < 10 ? 'home-morning' : h >= 10 && h < 16 ? 'home-day' : h >= 16 && h < 19 ? 'home-evening' : 'home-night';
  }
  // 本体の セーブ（naotocchi-save-v1）の BGM オン/オフ設定を 読む（サブアプリ用。同じ オリジンなので 読める）
  function mainBgmEnabled() {
    try { const s = JSON.parse(root.localStorage.getItem('naotocchi-save-v1') || 'null'); return !(s && s.lifetime && s.lifetime.soundBgm === false); } catch (err) { return true; }
  }
  // サブアプリ用: 最初の タップで 解除し、ページを 離れたら 止める。戻ってきたら 続きを 鳴らす。
  function forPage(o = {}) {
    const p = create({ base: o.base, enabled: mainBgmEnabled, level: o.level ?? COMMON_GAIN });
    const go = () => { p.unlock(); };
    root.document.addEventListener('pointerdown', go, true); root.document.addEventListener('keydown', go, true);
    root.addEventListener('pageshow', () => { if (!mainBgmEnabled()) p.stop(); });
    return p;
  }
  root.NAOTOCCHI_BGM2 = { COMMON_GAIN, create, homeSong, mainBgmEnabled, forPage };
})(typeof globalThis !== 'undefined' ? globalThis : this);
