// 通常ミニゲーム100本の 点数分布を、実コード(harness)で はかる。
// 使い方: node --max-old-space-size=4096 score-measure.cjs <from> <to> <cond: idle|random> <seedFrom> <seedTo> <out.jsonl>
//   cwd はリポジトリの ルート(/home/user/naotocchi)。リポジトリの ファイルは 変更しない。
// idle  : 開始して 何もしない。CAP_MS まで 時間を すすめ、終わらなければ 打ち切り(ended:false)。
// onetap: 0.8秒後に 入力先ごとに 中央を 1回 タップして、あとは 放置(「はじめの1タップだけ」の 下限を みる)。
// mash  : random と おなじ 入力先へ、60〜200ms ごとの 連打(タップ8割強・スワイプ、長押しなし)。
// random: 別の 乱数(bot用)で 120〜700ms ごとに、いま つながっている 入力先(canvas/ボタン/ドラッグ物/パッド)へ
//         タップ・スワイプ・長押し・ドラッグ、ときどき 矢印/スペースキーを 送る。
const fs = require('node:fs');
const {harness} = require(process.cwd() + '/tests/helpers/runtime-harness.cjs');
const CAP_MS = +process.env.CAP_MS || 240000;
const [from, to, cond, s0, s1, out] = [+process.argv[2], +process.argv[3], process.argv[4], +process.argv[5], +process.argv[6], process.argv[7]];

function stubCtx() {
  const st = {canvas: {width: 300, height: 300}, fillStyle: '#000', strokeStyle: '#000', globalAlpha: 1, lineWidth: 1, font: '10px sans-serif'};
  return new Proxy(st, {
    get(o, k) {
      if (k in o) return o[k];
      if (k === 'measureText') return (t) => ({width: String(t || '').length * 6, actualBoundingBoxAscent: 8, actualBoundingBoxDescent: 2});
      if (k === 'createLinearGradient' || k === 'createRadialGradient' || k === 'createConicGradient' || k === 'createPattern') return () => ({addColorStop() {}, setTransform() {}});
      if (k === 'getImageData' || k === 'createImageData') return (x, y, w, h) => ({width: w || 1, height: h || 1, data: new Uint8ClampedArray(Math.max(1, (w || 1) * (h || 1)) * 4)});
      if (k === 'isPointInPath' || k === 'isPointInStroke') return () => false;
      if (k === 'getTransform') return () => ({a: 1, b: 0, c: 0, d: 1, e: 0, f: 0, inverse() { return this; }});
      if (k === 'getLineDash') return () => [];
      if (typeof k === 'symbol') return undefined;
      return () => {};
    },
    set(o, k, v) { o[k] = v; return true; },
  });
}
function mulberry(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const INPUT_TYPES = ['pointerdown', 'pointerup', 'pointermove', 'click', 'touchstart', 'mousedown'];

function run(index, seed) {
  const h = harness({seed, canvasContext: stubCtx()});
  const game = h.api.games[index];
  const bot = mulberry(seed * 7919 + 13);
  const rec = {id: game.id, cond, seed, score: null, ended: false, endMs: null, inputs: 0, targets: 0, error: null};
  // 入力先の 追跡: container と、そこから querySelector で とった node、innerHTML で できた 子、createElement で つくった node
  const tracked = []; const seen = new Set(); const rected = new WeakSet();
  const track = (node, parent, sel) => {
    if (!node || seen.has(node)) return node; seen.add(node);
    tracked.push({node, parent, sel});
    const q = node.querySelector;
    node.querySelector = (s) => { const r = q(s); return r ? track(r, node, s) : r; };
    const qa = node.querySelectorAll;
    node.querySelectorAll = (s) => { const r = qa(s); (r || []).forEach((x) => track(x, null, null)); return r; };
    return node;
  };
  const ce = h.document.createElement; h.document.createElement = (...a) => track(ce(...a), null, null);
  let t = 0;
  try {
    const s = h.api.state(); Object.assign(s, {isSleeping: false, isSick: false, energy: 100, health: 100, hunger: 80});
    h.api.startMinigame({id: game.id, start(c, done) {
      track(c, null, null);
      return game.start(c, (sc) => { if (rec.score === null) { rec.score = sc; rec.ended = true; rec.endMs = t; } done(sc); });
    }});
    const valid = (e) => {
      if (e.node.isConnected === false) return false;
      if (e.parent) { if (!valid(tracked.find((x) => x.node === e.parent) || {node: e.parent})) return false; if (e.sel && e.parent.querySelector(e.sel) !== e.node) return false; }
      return true;
    };
    const candidates = () => {
      const all = new Set();
      for (const e of tracked) { all.add(e); for (const ch of e.node.children || []) if (!seen.has(ch)) track(ch, null, null); }
      return tracked.filter((e) => valid(e) && ((e.node.listeners || []).some((l) => INPUT_TYPES.includes(l.type)) || e.node.dataset?.hold || e.node.dataset?.key));
    };
    const step = (ms) => { const end = Math.min(CAP_MS, t + ms); while (t < end && !rec.ended) { const d = Math.min(200, end - t); h.advance(d); t += d; } };
    if (cond === 'idle') {
      step(CAP_MS);
    } else if (cond === 'onetap') { // 0.8秒後に、入力先ごとに 中央を 1回だけ タップ。その後は 放置
      step(800);
      for (const e of candidates()) { const n = e.node, r = n.getBoundingClientRect(), p = {x: (r.left || 0) + (r.width || 300) / 2, y: (r.top || 0) + (r.height || 300) / 2};
        for (const ty of ['pointerdown', 'pointerup', 'click']) h.dispatch(n, ty, {pointerId: 1, clientX: p.x, clientY: p.y, button: 0, pointerType: 'touch', isPrimary: true}); rec.inputs++; step(150); }
      step(CAP_MS);
    } else {
      const pid = () => 1 + Math.floor(bot() * 50);
      const pt = (n) => { const r = n.getBoundingClientRect ? n.getBoundingClientRect() : {left: 0, top: 0, width: 300, height: 300}; const w = r.width || 300, hh = r.height || 300; return {x: (r.left || 0) + bot() * w, y: (r.top || 0) + bot() * hh}; };
      const fire = (n, type, p, id) => h.dispatch(n, type, {pointerId: id, clientX: p.x, clientY: p.y, pageX: p.x, pageY: p.y, button: 0, buttons: type === 'pointerup' ? 0 : 1, pointerType: 'touch', isPrimary: true, touches: [{clientX: p.x, clientY: p.y, identifier: id}], changedTouches: [{clientX: p.x, clientY: p.y, identifier: id}]});
      step(300 + bot() * 500);
      while (!rec.ended && t < CAP_MS) {
        const r = bot();
        if (r < 0.12) {
          const key = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', ' ', 'Enter'][Math.floor(bot() * 6)];
          h.dispatch(h.document, 'keydown', {key}); rec.inputs++;
          step(50 + bot() * 350); h.dispatch(h.document, 'keyup', {key});
        } else {
          const cs = candidates(); rec.targets = Math.max(rec.targets, cs.length);
          if (cs.length) {
            // ドラッグ系(cake/bento): harness には 配置が ないので、置き場は 上段に 横ならび、部品は 下段に 横ならびの 矩形を あたえる
            const dropT = tracked.filter((e) => valid(e)).map((e) => e.node).filter((n) => n.classList.contains('mg-drop-target'));
            const dragI = cs.map((e) => e.node).filter((n) => n.classList.contains('mg-drag-item'));
            dropT.forEach((n, i) => { if (!rected.has(n)) { rected.add(n); n.getBoundingClientRect = () => ({left: 10 + i * 50, right: 56 + i * 50, top: 20, bottom: 66, width: 46, height: 46}); } });
            dragI.forEach((n, i) => { if (!rected.has(n)) { rected.add(n); n.getBoundingClientRect = () => ({left: 10 + i * 50, right: 56 + i * 50, top: 200, bottom: 246, width: 46, height: 46}); } });
            const n = cs[Math.floor(bot() * cs.length)].node; const id = pid(); const p0 = pt(n); rec.inputs++;
            if (dragI.includes(n) && dropT.length) { // 部品を ランダムな 置き場(6割)か ランダムな 位置へ
              const tg = dropT[Math.floor(bot() * dropT.length)].getBoundingClientRect();
              const p1 = bot() < 0.6 ? {x: tg.left + 23, y: tg.top + 23} : {x: bot() * 300, y: bot() * 300};
              fire(n, 'pointerdown', p0, id); for (let i = 1; i <= 5; i++) { step(30); fire(n, 'pointermove', {x: p0.x + (p1.x - p0.x) * i / 5, y: p0.y + (p1.y - p0.y) * i / 5}, id); } fire(n, 'pointerup', p1, id);
              step(120 + bot() * 580); continue;
            }
            const kind = cond === 'mash' ? bot() * 0.6 : bot(); // mash: タップ多め・長押しなし
            if (kind < 0.5) { fire(n, 'pointerdown', p0, id); fire(n, 'mousedown', p0, id); step(40 + bot() * 80); fire(n, 'pointerup', p0, id); fire(n, 'click', p0, id); }
            else if (kind < 0.85) { // スワイプ/ドラッグ
              const p1 = pt(n), steps = 4 + Math.floor(bot() * 6), dur = 80 + bot() * 400;
              fire(n, 'pointerdown', p0, id);
              for (let i = 1; i <= steps; i++) { step(dur / steps); fire(n, 'pointermove', {x: p0.x + (p1.x - p0.x) * i / steps, y: p0.y + (p1.y - p0.y) * i / steps}, id); }
              fire(n, 'pointerup', p1, id);
            } else { fire(n, 'pointerdown', p0, id); step(300 + bot() * 900); fire(n, 'pointerup', p0, id); fire(n, 'click', p0, id); }
          }
        }
        step(cond === 'mash' ? 60 + bot() * 140 : 120 + bot() * 580);
      }
    }
  } catch (e) { rec.error = String(e && e.message || e).slice(0, 200); }
  if (!rec.ended) rec.endMs = t;
  return rec;
}

const N = harness({seed: 1}).api.games.length;
for (let i = from; i < Math.min(to, N); i++) {
  for (let seed = s0; seed <= s1; seed++) {
    const rec = run(i, seed);
    fs.appendFileSync(out, JSON.stringify(rec) + '\n');
    if (global.gc) global.gc();
  }
}
