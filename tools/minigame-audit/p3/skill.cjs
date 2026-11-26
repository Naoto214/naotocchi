// Phase 3: 「上手な 人」「ふつうの 人」の ボット。画面に 描かれた 位置(canvas の 呼び出し)を 見て 操作する。
// 人の 反応の おそさ・ずれは react(ms)・err(px) で まねる(0 なら 上手、大きいほど 初心者)
const {many, fmt, fresh} = require('./probe.cjs');

// つみあげタワー: ゆれる ブロックの 中心が 下の ブロックの 中心に tol px いないで 近づいたら おとす
function stackBot(o = {}) { return fresh((seed) => stackBot1({...o, seed})); }
function stackBot1({tol = 3, react = 0, miss = 0, seed = 1} = {}) {
  let wait = null, rnd = seed;
  const rand = () => ((rnd = (Math.imul(rnd, 1103515245) + 12345) >>> 0) / 4294967296);
  return (r, t) => {
    if (t < 1300) return;
    const f = r.frame; let dash = -1;
    for (let i = f.length - 1; i >= 0; i--) if (f[i][0] === 'setLineDash' && f[i][1][0] && f[i][1][0].length === 2 && f[i][1][0][0] === 3) { dash = i; break; }
    if (dash < 0) return;
    let tr = null; for (let i = dash; i >= 0; i--) if (f[i][0] === 'translate') { tr = f[i][1][0]; break; }
    const mv = f.slice(dash).filter((c) => c[0] === 'moveTo'); if (!tr || mv.length < 2) return;
    const topC = (mv[0][1][0] + mv[1][1][0]) / 2;
    if (wait !== null) { if (t >= wait) { r.tap(r.q('#stDrop')); wait = null; } return; }
    const off = Math.abs(tr - topC) + (miss ? (rand() - 0.5) * 2 * miss : 0);
    if (off < tol) { if (react) wait = t + react; else r.tap(r.q('#stDrop')); }
  };
}
module.exports = {stackBot};
if (require.main === module) {
  const id = process.argv[2] || 'stack-themed';
  console.log('上手(ずれ3px)      ', fmt(many(id, stackBot({tol: 3}), {step: 16})));
  console.log('ふつう(ずれ12px)    ', fmt(many(id, stackBot({tol: 12}), {step: 16})));
  console.log('初心者(ずれ25px)    ', fmt(many(id, stackBot({tol: 25}), {step: 33})));
}

// リズム: 画面の ノーツ(fillText)の 位置から 判定ラインに とどく 時刻を 見つもって 押す。
// jitter(ms): 押す 時刻の ずれ(上手 15・ふつう 70・初心者 150 など)。hitRate: 押しに いく ノーツの 割合
function rhythmBot(o = {}) { return fresh((seed) => rhythmBot1({...o, seed})); }
function rhythmBot1({jitter = 15, hitRate = 1, seed = 1} = {}) {
  let geo = null, rnd = seed, prev = [];
  const rand = () => ((rnd = (Math.imul(rnd, 1103515245) + 12345) >>> 0) / 4294967296);
  const sched = [];
  return (r, t) => {
    for (let i = sched.length - 1; i >= 0; i--) if (t >= sched[i].at) { r.down(r.q(['#rhL', '#rhM', '#rhR'][sched[i].lane])); sched.splice(i, 1); }
    const f = r.frame;
    if (!geo) { const arcs = f.filter((c) => c[0] === 'arc' && c[1][2] === 15); if (arcs.length >= 3) { const xs = arcs.slice(0, 3).map((a) => a[1][0]).sort((a, b) => a - b); geo = {W: xs[1] * 2, LINE: arcs[0][1][1], HOR: 34}; } return; }
    const {W, LINE, HOR} = geo; const laneX = (lane, p) => { const far = W / 2 + (lane - 1) * W * 0.07, near = W / 2 + (lane - 1) * W * 0.3; return far + (near - far) * p; };
    // 1ステップ(50ms)に 何回か 描かれるので、さいごの 1回(判定の まるが 3つ 描かれた あと)だけ 見る
    let from = 0; for (let i = f.length - 1, k = 0; i >= 0; i--) if (f[i][0] === 'arc' && f[i][1][2] === 15 && ++k === 3) { from = i; break; }
    const cur = [];
    for (const c of f.slice(from)) { if (c[0] !== 'fillText' || !/^\p{Extended_Pictographic}/u.test(String(c[1][0])) || [...String(c[1][0])].length > 3) continue; const [, x, y] = c[1]; if (!(y > HOR && y < LINE + 2)) continue; const z = Math.sqrt((y - HOR) / (LINE - HOR)), p = z * z; for (let lane = 0; lane < 3; lane++) if (Math.abs(laneX(lane, p) - x) < 3) cur.push({lane, z}); }
    // z の すすみ方(1ステップ ぶん)から のこり時間を 見つもる
    for (const n of cur) {
      const pv = prev.filter((q) => q.lane === n.lane && q.z < n.z && n.z - q.z < 0.2).sort((a, b) => b.z - a.z)[0];
      if (!pv || n.z < 0.55) continue; const dz = n.z - pv.z; if (dz <= 0) continue; const left = (1 - n.z) / dz * 50;
      const at = t + left + (rand() - 0.5) * 2 * jitter;
      if (sched.some((s) => s.lane === n.lane && Math.abs(s.hit - (t + left)) < 200) || (n.done)) continue;
      if (rand() > hitRate) { sched.push({lane: n.lane, at: Infinity, hit: t + left}); continue; }
      sched.push({lane: n.lane, at, hit: t + left});
    }
    // 古い 予定を けす
    for (let i = sched.length - 1; i >= 0; i--) if (sched[i].hit < t - 400) sched.splice(i, 1);
    prev = cur;
  };
}
module.exports.rhythmBot = rhythmBot;

// アステロイド: いちばん 近い 岩へ パッドで 向きを あわせて、むきが あったら 撃つ(進まない)。
// aimTol(rad): 撃つ ときの むきの ずれの 許容。slow: 向きを かえる 速さ(初心者は おそい)
function asteroidsBot(o = {}) { return fresh((seed) => asteroidsBot1({...o, seed})); }
function asteroidsBot1({aimTol = 0.12, slow = 1} = {}) {
  let padDown = false, px = 0;
  return (r, t) => {
    if (t < 1500) return;
    const f = r.frame; let si = -1;
    for (let i = f.length - 1; i >= 0; i--) if (f[i][0] === 'moveTo' && f[i][1][0] === 14 && f[i][1][1] === 0) { si = i; break; }
    if (si < 0) return;
    let rot = null, tr = null, ti = -1;
    for (let i = si; i >= 0; i--) { if (rot === null && f[i][0] === 'rotate') rot = f[i][1][0]; if (f[i][0] === 'translate') { tr = f[i][1]; ti = i; break; } }
    let prevShip = -1; for (let i = ti - 1; i >= 0; i--) if (f[i][0] === 'moveTo' && f[i][1][0] === 14 && f[i][1][1] === 0) { prevShip = i; break; }
    const rocks = f.slice(prevShip + 1, ti).filter((c) => c[0] === 'translate').map((c) => c[1]);
    if (!tr || rot === null || !rocks.length) return;
    const [sx, sy] = tr; let best = null;
    for (const [x, y] of rocks) { const d = Math.hypot(x - sx, y - sy); if (!best || d < best.d) best = {x, y, d}; }
    const want = Math.atan2(best.y - sy, best.x - sx); let diff = want - rot; diff = Math.atan2(Math.sin(diff), Math.cos(diff));
    const pad = r.pad(); if (!pad) return;
    if (!padDown) { r.down(pad, 150, 600, 9); padDown = true; px = 150; }
    const step = Math.max(-30, Math.min(30, diff / 0.014 / 1.6 * slow));
    if (Math.abs(diff) > 0.03) { px += step; r.move(pad, px, 600, 9); if (px > 280 || px < 20) { r.up(pad, px, 600, 9); padDown = false; } }
    if (Math.abs(diff) < aimTol) r.down(r.q('#asFire'));
  };
}
module.exports.asteroidsBot = asteroidsBot;

// フルーツ斬り: 見えている くだもの(ばくだん 以外)を ねらって 短く スワイプする。
// every(ms): 1回 振る 間隔。multi: 近い くだものを 1ふりで まとめて 斬る
function fruitBot(o = {}) { return fresh((seed) => fruitBot1({...o, seed})); }
function fruitBot1({every = 250, multi = true} = {}) {
  let next = 0, id = 20;
  return (r, t) => {
    if (t < 1300 || t < next) return;
    const f = r.frame; const objs = [];
    // さいごの 描画の くだもの: translate → rotate → fillText(絵文字) (clip が はさまる ものは 斬った 半分)
    for (let i = 0; i + 2 < f.length; i++) if (f[i][0] === 'translate' && f[i + 1][0] === 'rotate' && f[i + 2][0] === 'fillText') objs.push({x: f[i][1][0], y: f[i][1][1], e: String(f[i + 2][1][0])});
    const seen = new Map(); for (const o of objs) seen.set(Math.round(o.x / 6) + ':' + o.e, o);
    const list = [...seen.values()];
    const bombs = list.filter((o) => o.e.includes('💣')), fruits = list.filter((o) => !o.e.includes('💣') && o.y > 20 && o.y < 280);
    if (!fruits.length) return;
    fruits.sort((a, b) => a.x - b.x);
    let a = fruits[0], b = fruits[0];
    if (multi) for (let i = 0; i + 1 < fruits.length; i++) if (Math.hypot(fruits[i + 1].x - fruits[i].x, fruits[i + 1].y - fruits[i].y) < 90) { a = fruits[i]; b = fruits[i + 1]; break; }
    const near = (x, y) => bombs.some((q) => Math.hypot(q.x - x, q.y - y) < 40);
    if (near(a.x, a.y) || near(b.x, b.y)) return;
    const c = r.q('#fsCanvas'); id++;
    r.down(c, a.x - 25, a.y - 10, id); r.move(c, a.x, a.y, id); r.move(c, b.x, b.y, id); r.move(c, b.x + 25, b.y + 10, id); r.up(c, b.x + 25, b.y + 10, id);
    next = t + every;
  };
}
module.exports.fruitBot = fruitBot;

// アーチェリー: いっぱいに 引き、画面の ねらい(風の ぶんも 入った 照準の まる)を 的の 中心に あわせて はなす。
// err(px): ねらいの ずれ(上手 2・ふつう 10・初心者 22)。wind を 見ない ときは follow=false(まっすぐ 引くだけ)
function archeryBot(o = {}) { return fresh((seed) => archeryBot1({...o, seed})); }
function archeryBot1({err = 2, seed = 1, wait = 600} = {}) {
  let phase = 0, x = 150, at = 0, rnd = seed;
  const rand = () => ((rnd = (Math.imul(rnd, 1103515245) + 12345) >>> 0) / 4294967296);
  let goal = null;
  return (r, t) => {
    const c = r.q('#arCanvas'); if (t < 1000) return;
    const f = r.frame;
    if (phase === 0) { if (t < at) return; x = 150; r.down(c, 150, 200); r.move(c, 150, 330); phase = 1; at = t + wait; goal = null; return; }
    if (phase === 1) {
      // 的(いちばん 大きい まる)の 中心と、照準(半径10の まる)
      const rings = f.filter((q) => q[0] === 'arc' && q[1][2] > 20); const sight = f.filter((q) => q[0] === 'arc' && q[1][2] === 10).pop();
      if (rings.length && sight) {
        const tx = rings[rings.length - 1][1][0], ty = rings[rings.length - 1][1][1];
        if (!goal) goal = {x: tx + (rand() - 0.5) * 2 * err};
        const e = sight[1][0] - goal.x; x += e * 130 / 150; r.move(c, x, 330);
      }
      if (t >= at) { r.up(c, x, 330); phase = 0; at = t + 2500; }
    }
  };
}
module.exports.archeryBot = archeryBot;

// ボクセル: 見えている 鉱石の うち「ねだん ÷ (きょり+1)」が いちばん 高い ものへ 1マスずつ 掘りすすむ(なければ 下へ)。
// reach: 何マス 先までの 鉱石を ねらうか(上手 4・ふつう 2・初心者 1)
function voxelBot(o = {}) { return fresh((seed) => voxelBot1({...o, seed})); }
function voxelBot1({reach = 4, every = 350} = {}) {
  const VAL = {'⚫': 5, '⛓': 12, '🟡': 25, '💎': 60};
  let next = 0, id = 30;
  return (r, t) => {
    if (t < 1500 || t < next) return;
    const f = r.frame; let cell = 0;
    for (const c of f) if (c[0] === 'fillRect' && c[1][2] === c[1][3] && c[1][2] > 15) { cell = c[1][2]; break; }
    if (!cell) return;
    let me = null; for (let i = f.length - 1; i > 0; i--) if (f[i][0] === 'fillText' && f[i][1][0] === '⛏️' && f[i - 1][0] === 'fillText') { me = {x: Math.floor(f[i - 1][1][1] / cell), y: Math.floor(f[i - 1][1][2] / cell)}; break; }
    if (!me) return;
    let best = null;
    for (const c of f) { if (c[0] !== 'fillText' || !(c[1][0] in VAL)) continue; const x = Math.floor(c[1][1] / cell), y = Math.floor(c[1][2] / cell); const d = Math.abs(x - me.x) + Math.abs(y - me.y); if (d > reach || y < me.y) continue; const s = VAL[c[1][0]] / (d + 1); if (!best || s > best.s) best = {x, y, s}; }
    let dir = [0, 1]; if (best) { if (best.x !== me.x) dir = [Math.sign(best.x - me.x), 0]; else dir = [0, 1]; }
    const cv = r.q('#vmCanvas'); id++;
    r.down(cv, 150, 100, id); r.move(cv, 150 + dir[0] * 40, 100 + dir[1] * 40, id); r.up(cv, 150 + dir[0] * 40, 100 + dir[1] * 40, id);
    next = t + every;
  };
}
module.exports.voxelBot = voxelBot;

// ハーフパイプ: くだり(中央へ むかう)の あいだだけ ポンプを 押し、空中では spins 回 タップする。
// smart=false なら ポンプ 押しっぱなし。pattern: エアごとの 回転数(くりかえし)
function halfpipeBot(o = {}) { return fresh((seed) => halfpipeBot1({...o, seed})); }
function halfpipeBot1({smart = true, pattern = [1]} = {}) {
  let lastX = null, held = false, lastHint = '', i = 0;
  return (r, t) => {
    if (t < 1000) return;
    const pump = r.q('#hpPump');
    if (!smart) { if (!held) { r.down(pump, 0, 0, 7); held = true; } }
    const f = r.frame; let x = null, W = 300;
    for (let k = f.length - 1; k > 1; k--) if (f[k][0] === 'ellipse' && f[k][1][0] === 0 && f[k][1][1] === 14 && f[k - 3] && f[k - 3][0] === 'translate') { x = f[k - 3][1][0]; break; }
    if (smart && x !== null && lastX !== null) {
      const toward = Math.abs(x - W / 2) < Math.abs(lastX - W / 2) - 0.2;
      if (toward && !held) { r.down(pump, 0, 0, 7); held = true; } else if (!toward && held) { r.up(pump, 0, 0, 7); held = false; }
    }
    if (x !== null) lastX = x;
    const h = r.q('#hpHint').textContent;
    if (h !== lastHint && h.includes('エア')) { const k = pattern[i++ % pattern.length]; for (let j = 0; j < k; j++) r.down(r.q('#hpTrick'), 0, 0, 2); }
    lastHint = h;
  };
}
module.exports.halfpipeBot = halfpipeBot;

// グランプリ: アクセルを 押しつづけ、いちばん 手前の 道(road 色の 四角)の 中心に 車が くるように パッドで ハンドルを きる。
// dead: これより 外れたら きる(上手 0.15・ふつう 0.35・初心者 0.6)。lag: 反応の おくれ(ステップ数)
function gpBot(o = {}) { return fresh((seed) => gpBot1({...o, seed})); }
function gpBot1({dead = 0.15, lag = 0} = {}) {
  let down = false, px = 150, hist = [];
  return (r, t) => {
    if (t === 500) r.down(r.q('#gpAccel'), 0, 0, 5);
    if (t < 600) return;
    const f = r.frame; let best = null;
    for (let i = 0; i + 1 < f.length; i++) { const c = f[i]; if (c[0] !== 'moveTo' || !/^#(5c5c66|63636d)$/.test(c[2])) continue; const n = f[i + 1]; if (n[0] !== 'lineTo') continue; if (!best || c[1][1] >= best.y) best = {y: c[1][1], x1: c[1][0], x2: n[1][0]}; }
    if (!best) return;
    const W = 300 * 0 + (r.W || 0); const half = (best.x2 - best.x1) / 2, center = (best.x1 + best.x2) / 2;
    hist.push(center); const cNow = hist[Math.max(0, hist.length - 1 - lag)];
    // 車は 画面の まんなか(W/2)。W は 道の 左右の はしから: 手前の 道は 画面より ひろい ことが あるので、canvas の はばを 使う
    const cw = r.cw || (r.cw = 2 * 150);
    const off = (cw / 2 - cNow) / Math.max(1, half);
    const pad = r.pad(); if (!pad) return;
    if (!down) { r.down(pad, 150, 600, 8); down = true; px = 150; }
    if (off > dead) { px -= 12; r.move(pad, px, 600, 8); } else if (off < -dead) { px += 12; r.move(pad, px, 600, 8); }
    if (px < 30 || px > 270) { r.up(pad, px, 600, 8); down = false; }
  };
}
module.exports.gpBot = gpBot;

// ハンググライダー: 画面の 🌀(上昇気流)と 🎈 を 見て、近い ものへ よこに よせる(ドラッグ)。
// 高さが ひくい ときは 気流を、たかい ときは 風船を ねらう。gain: よせる つよさ、every: 見なおす 間隔
function hgBot(o = {}) { return fresh((seed) => hgBot1({...o, seed})); }
function hgBot1({gain = 0.5, every = 100, aimBalloons = true} = {}) {
  let down = false, x = 150, next = 0;
  return (r, t) => {
    if (t < 1200 || t < next) return; next = t + every;
    const c = r.q('#hgCanvas'); const f = r.frame;
    const items = f.filter((q) => q[0] === 'fillText' && (q[1][0] === '🌀' || q[1][0] === '🎈')).map((q) => ({k: q[1][0], x: q[1][1], y: q[1][2]}));
    // いちばん 手前(画面の 下の ほう)に ある もの
    const pick = (k) => items.filter((q) => q.k === k && q.y > 90).sort((a, b) => b.y - a.y)[0];
    const goal = (aimBalloons && pick('🎈')) || pick('🌀');
    if (!down) { r.down(c, 150, 150, 6); down = true; x = 150; }
    if (goal) { x += Math.max(-20, Math.min(20, (goal.x - 150) * gain)); x = Math.max(10, Math.min(290, x)); r.move(c, x, 150, 6); }
  };
}
module.exports.hgBot = hgBot;

// ジェンガ: 本体と おなじ 安定度の 式で 塔を まねして、ぬいた あとの 安定度が いちばん 高い ブロックを えらぶ(minS いじょう)。
// middleOnly: まんなか だけを 下から じゅんに ぬく(考えない)。「かたい」と 言われた ブロックは つぎから えらばない
function jengaBot(o = {}) { return fresh((seed) => jengaBot1({...o, seed})); }
function jengaBot1({middleOnly = false, minS = 0.45, every = 1300} = {}) {
  const rows = []; for (let r = 0; r < 10; r++) rows.push([true, true, true]); let top = [];
  const tight = new Set(); let next = 1500, pending = null, lastHint = '', lastN = 0, pendAt = 0;
  const stab = (R, T) => { let worst = 1; for (let r = 0; r < R.length; r++) { const sup = R[r].map((v, i) => (v ? i - 1 : null)).filter((v) => v !== null); if (!sup.length) return 0; let mass = 0, mom = 0; for (let k = r + 1; k < R.length; k++) R[k].forEach((v, i) => { if (v) { mass++; mom += i - 1; } }); T.forEach((v, i) => { if (v) { mass++; mom += i - 1; } }); if (!mass) continue; const com = mom / mass; const lo = Math.min(...sup) - 0.5, hi = Math.max(...sup) + 0.5; const margin = Math.min(com - lo, hi - com); worst = Math.min(worst, Math.max(0, Math.min(1, margin / 0.5))); } return worst; };
  const apply = (R, T, r, i) => { const R2 = R.map((x) => x.slice()), T2 = T.slice(); R2[r][i] = false; if (T2.length >= 3) { R2.push(T2.splice(0)); } T2.push(true); return [R2, T2]; };
  const legal = (r, i) => rows[r][i] && rows[r].filter(Boolean).length > 1 && !(r === rows.length - 1 && top.length && top.length < 3) && !tight.has(r + ':' + i);
  return (r0, t) => {
    const h = r0.q('#jgHint').textContent, n = Number((r0.q('#jgPulled').textContent.match(/\d+/) || [0])[0]);
    if (pending && n > lastN) { const [R2, T2] = apply(rows, top, ...pending); rows.length = 0; rows.push(...R2); top = T2; pending = null; }
    else if (pending && h !== lastHint && /かたい|びくとも/.test(h)) { tight.add(pending.join(':')); pending = null; }
    else if (pending && t > pendAt + 700) { if (/かたい|びくとも/.test(h)) tight.add(pending.join(':')); pending = null; }
    lastHint = h; lastN = n;
    if (t < next || pending) return;
    let pick = null;
    for (let r = 0; r < rows.length; r++) for (const i of middleOnly ? [1] : [1, 0, 2]) { if (!legal(r, i)) continue; const s = stab(...apply(rows, top, r, i)); if (middleOnly) { if (!pick) pick = {r, i, s}; } else if (s >= minS && (!pick || s > pick.s + 1e-9)) pick = {r, i, s}; }
    if (!pick) return;
    const x = 150 + (pick.i - 1) * 34, y = 345 - (pick.r + 1) * 16 + 8;
    r0.down(r0.q('#jgCanvas'), x, y); pending = [pick.r, pick.i]; pendAt = t; next = t + every;
  };
}
module.exports.jengaBot = jengaBot;

// ドミノ: 点線の すきま(setLineDash([2,2]) の 前の translate)を 1つずつ タップして うめ、なくなったら「おす!」。
// every: 1回の タップの 間隔(はやい 子 300ms・ゆっくり 1500ms)
function dominoBot(o = {}) { return fresh((seed) => dominoBot1({...o, seed})); }
function dominoBot1({every = 400} = {}) {
  let next = 600;
  return (r, t) => {
    if (t < next) return; next = t + every;
    const f = r.frame; let from = 0; for (let i = f.length - 1; i >= 0; i--) if (f[i][0] === 'fillRect' && f[i][1][0] === 0 && f[i][1][1] === 0) { from = i; break; }
    const gaps = [];
    for (let i = from; i + 3 < f.length; i++) if (f[i][0] === 'translate' && f[i + 1][0] === 'rotate' && f[i + 2][0] === 'setLineDash' && f[i + 2][1][0] && f[i + 2][1][0][0] === 2) gaps.push(f[i][1]);
    if (gaps.length) r.down(r.q('#dmCanvas'), gaps[0][0], gaps[0][1]);
    else if (!r.q('#dmPush').disabled) r.down(r.q('#dmPush'));
  };
}
module.exports.dominoBot = dominoBot;
