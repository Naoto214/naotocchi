// そうこばん(push-puzzle) の 盤面ソルバーと 難易度メトリクス。
// ルールは games.js の makePushPuzzleGame と おなじ: 上下左右に 1マス、箱は 1こだけ おせる、引っぱれない、
// 箱の むこうが かべ/箱なら おせない。goals は games.js と おなじ [y, x]。
'use strict';
const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];

function parse(rows, goals) {
  const H = rows.length, W = rows[0].length;
  const wall = [], boxes = []; let player = -1;
  rows.forEach((r, y) => [...r].forEach((c, x) => {
    const i = y * W + x; wall[i] = c === '#';
    if (c === '@') player = i; if (c === '$') boxes.push(i);
  }));
  const goalSet = new Set(goals.map(([gy, gx]) => gy * W + gx));
  return { W, H, wall, boxes: boxes.sort((a, b) => a - b), player, goalSet, goals: [...goalSet] };
}
const keyOf = (p, b) => p + ':' + b.join(',');
function step(P, p, boxes, dx, dy) {
  const nx = (p % P.W) + dx, ny = Math.floor(p / P.W) + dy, n = ny * P.W + nx;
  if (P.wall[n]) return null;
  const bi = boxes.indexOf(n);
  if (bi < 0) return { p: n, boxes, push: false };
  const t = n + dy * P.W + dx;
  if (P.wall[t] || boxes.includes(t)) return null;
  const nb = boxes.slice(); nb[bi] = t; nb.sort((a, b) => a - b);
  return { p: n, boxes: nb, push: true };
}
const isSolved = (P, boxes) => boxes.length === P.goals.length && boxes.every((b) => P.goalSet.has(b));

// 状態グラフを ぜんぶ ひろう(7x7・箱4こ までなら 数十万状態で おわる)
function explore(rows, goals, limit = 2e6) {
  const P = parse(rows, goals);
  const ids = new Map(), states = [], edges = [];
  const add = (p, b) => { const k = keyOf(p, b); let id = ids.get(k); if (id === undefined) { id = states.length; ids.set(k, id); states.push({ p, b }); edges.push(null); } return id; };
  const start = add(P.player, P.boxes);
  const dist = [0]; const q = [start];
  for (let qi = 0; qi < q.length; qi++) {
    const id = q[qi], s = states[id], out = [];
    if (!isSolved(P, s.b)) for (const [dx, dy] of DIRS) {
      const r = step(P, s.p, s.b, dx, dy); if (!r) continue;
      const before = states.length; const nid = add(r.p, r.boxes);
      if (nid === before) { dist[nid] = dist[id] + 1; q.push(nid); }
      out.push({ to: nid, push: r.push, d: [dx, dy] });
    }
    edges[id] = out;
    if (states.length > limit) throw new Error('state limit');
  }
  return { P, states, edges, start, dist };
}

function analyze(rows, goals) {
  const { P, states, edges, start, dist } = explore(rows, goals);
  const n = states.length;
  // 逆向きに ゴールから とどく 状態 = 「まだ クリアできる」状態
  const rev = Array.from({ length: n }, () => []);
  edges.forEach((out, i) => out.forEach((e) => rev[e.to].push(i)));
  const live = new Uint8Array(n); const q = [];
  for (let i = 0; i < n; i++) if (isSolved(P, states[i].b)) { live[i] = 1; q.push(i); }
  for (let qi = 0; qi < q.length; qi++) for (const j of rev[q[qi]]) if (!live[j]) { live[j] = 1; q.push(j); }
  const solvable = !!live[start];
  let minMoves = null, solution = null;
  if (solvable) {
    // BFS の dist が 最短手数。ゴール状態を さがして 道を もどる
    let best = -1; for (let i = 0; i < n; i++) if (isSolved(P, states[i].b) && (best < 0 || dist[i] < dist[best])) best = i;
    minMoves = dist[best];
    const prev = new Int32Array(n).fill(-1), pd = []; const seen = new Uint8Array(n); seen[start] = 1; const bq = [start];
    for (let qi = 0; qi < bq.length; qi++) for (const e of edges[bq[qi]]) if (!seen[e.to]) { seen[e.to] = 1; prev[e.to] = bq[qi]; pd[e.to] = e.d; bq.push(e.to); }
    solution = []; for (let c = best; c !== start; c = prev[c]) solution.unshift(pd[c]);
  }
  // 箱を おす 回数の 最小(0-1 BFS: 歩き=0, おす=1)
  let minPushes = null;
  if (solvable) {
    const pc = new Float64Array(n).fill(Infinity); pc[start] = 0; const dq = [start];
    while (dq.length) { const i = dq.shift(); for (const e of edges[i]) { const w = e.push ? 1 : 0; if (pc[i] + w < pc[e.to]) { pc[e.to] = pc[i] + w; w ? dq.push(e.to) : dq.unshift(e.to); } } }
    minPushes = Infinity; for (let i = 0; i < n; i++) if (isSolved(P, states[i].b)) minPushes = Math.min(minPushes, pc[i]);
  }
  // 解の 中で おした 回数
  let solPushes = 0; if (solution) { let p = P.player, b = P.boxes; for (const [dx, dy] of solution) { const r = step(P, p, b, dx, dy); if (r.push) solPushes++; p = r.p; b = r.boxes; } }
  // 行き詰まりやすさ: クリアできる 状態から の「おす」手の うち、クリア不能に おちる わりあい
  let livePushes = 0, trapPushes = 0, liveCount = 0;
  for (let i = 0; i < n; i++) { if (!live[i]) continue; liveCount++; for (const e of edges[i]) if (e.push) { livePushes++; if (!live[e.to]) trapPushes++; } }
  // 最初の 局面で、うごいて とどく 範囲から いきなり 詰む 押しが いくつ あるか
  const firstTraps = countFirstTraps(P, states, edges, live, start);
  return {
    boxes: P.boxes.length, goals: P.goals.length, solvable, minMoves, minPushes, solutionPushes: solPushes, solution,
    states: n, deadStateRatio: +(1 - liveCount / n).toFixed(3), trapPushRatio: livePushes ? +(trapPushes / livePushes).toFixed(3) : 0,
    firstTraps,
  };
}
function countFirstTraps(P, states, edges, live, start) {
  // 箱を うごかさずに 歩いて とどく 状態たち から の 押し を かぞえる
  const seen = new Set([start]), q = [start]; let total = 0, trap = 0;
  for (let qi = 0; qi < q.length; qi++) for (const e of edges[q[qi]]) {
    if (e.push) { total++; if (!live[e.to]) trap++; } else if (!seen.has(e.to)) { seen.add(e.to); q.push(e.to); }
  }
  return { total, trap };
}
// 手順を そのまま ルールで さいげんして クリアになるか
function replay(rows, goals, moves) {
  const P = parse(rows, goals); let p = P.player, b = P.boxes;
  for (const [dx, dy] of moves) { const r = step(P, p, b, dx, dy); if (!r) return false; p = r.p; b = r.boxes; }
  return isSolved(P, b);
}
// 左右反転(games.js で ランダムに つかう)。goals も [y, W-1-x] に
function mirror(rows, goals) {
  const W = rows[0].length;
  return { rows: rows.map((r) => [...r].reverse().join('')), goals: goals.map(([y, x]) => [y, W - 1 - x]) };
}
// 初見の 所要時間の めやす(秒)。読む 4秒 + 押し1回ごとに 考える 1.6秒 + 1手 0.45秒 操作 + 詰みやすさ ぶんの やりなおし
function estimateSeconds(m) {
  if (!m.solvable) return Infinity;
  const read = 4 + 1.5 * m.boxes;
  const think = 1.6 * m.minPushes;
  const op = 0.45 * m.minMoves;
  // 詰む 押しに いちど ふれる かくりつ × (やりなおしの コスト)
  const pTrap = 1 - Math.pow(1 - m.trapPushRatio, m.minPushes);
  const retry = pTrap * (6 + 0.5 * (think + op));
  return Math.round(read + think + op + retry);
}
// 「初見の ひと」の まね: 先を 読まず、いちばん ちかい 箱を いちばん ちかい ★へ 1こずつ はこぶ。
// 箱どうしの 順番や 詰みは 考えない(ほかの 箱は うごかない かべ あつかい)。迷い(eps)で 2番めの 候補も えらぶ。
// これで クリアできる わりあいが 高いほど「直感で とける」盤面。
function naivePlay(rows, goals, rng = Math.random, eps = 0.25) {
  const P = parse(rows, goals); let p = P.player, boxes = P.boxes.slice(), moves = 0, pushes = 0;
  for (let guard = 0; guard < 12 && !isSolved(P, boxes); guard++) {
    const plans = [];
    for (const b of boxes) {
      if (P.goalSet.has(b)) continue;
      const others = boxes.filter((o) => o !== b);
      const plan = pushOne(P, p, b, others);
      // 人は 見た目の きょり(マンハッタン)で 箱と ★を くみあわせる
      for (const [g, path] of plan) if (!others.includes(g)) plans.push({ path, eye: Math.abs(g % P.W - b % P.W) + Math.abs(Math.floor(g / P.W) - Math.floor(b / P.W)) + Math.abs(p % P.W - b % P.W) * 0.1 + Math.abs(Math.floor(p / P.W) - Math.floor(b / P.W)) * 0.1 });
    }
    if (!plans.length) return { ok: false, moves, pushes };
    plans.sort((a, b) => a.eye - b.eye);
    const pick = (plans.length > 1 && rng() < eps ? plans[1] : plans[0]).path;
    for (const [dx, dy] of pick) { const r = step(P, p, boxes, dx, dy); if (r.push) pushes++; p = r.p; boxes = r.boxes; moves++; }
  }
  return { ok: isSolved(P, boxes), moves, pushes };
}
// 箱 b だけを うごかして 各★へ とどく 最短手順(ほかの 箱は かべ)
function pushOne(P, p0, b0, others) {
  const W = P.W, key = (p, b) => p * 1000 + b, seen = new Map([[key(p0, b0), null]]), q = [[p0, b0]], found = new Map();
  for (let qi = 0; qi < q.length; qi++) {
    const [p, b] = q[qi];
    if (P.goalSet.has(b) && b !== b0 && !found.has(b)) { const path = []; for (let k = key(p, b); seen.get(k); k = seen.get(k).from) path.unshift(seen.get(k).d); found.set(b, path); }
    for (const [dx, dy] of DIRS) {
      const n = p + dy * W + dx; if (P.wall[n] || others.includes(n)) continue;
      let nb = b; if (n === b) { nb = b + dy * W + dx; if (P.wall[nb] || others.includes(nb)) continue; }
      const k = key(n, nb); if (seen.has(k)) continue; seen.set(k, { from: key(p, b), d: [dx, dy] }); q.push([n, nb]);
    }
  }
  return found;
}
function naiveRate(rows, goals, trials = 400, seed = 7) {
  let s = seed >>> 0; const rng = () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  let ok = 0; for (let i = 0; i < trials; i++) if (naivePlay(rows, goals, rng).ok) ok++;
  return +(ok / trials).toFixed(2);
}
// すべての 到達局面を grid(' ', '#', '$')と「まだ クリアできるか」で かえす(救済判定の テスト用)
function states(rows, goals) {
  const { P, states: all, edges } = explore(rows, goals);
  const n = all.length, rev = Array.from({ length: n }, () => []);
  edges.forEach((out, i) => out.forEach((e) => rev[e.to].push(i)));
  const live = new Uint8Array(n), q = [];
  for (let i = 0; i < n; i++) if (isSolved(P, all[i].b)) { live[i] = 1; q.push(i); }
  for (let qi = 0; qi < q.length; qi++) for (const j of rev[q[qi]]) if (!live[j]) { live[j] = 1; q.push(j); }
  return all.map((s, i) => {
    const grid = Array.from({ length: P.H }, (_, y) => Array.from({ length: P.W }, (_, x) => (P.wall[y * P.W + x] ? '#' : ' ')));
    for (const b of s.b) grid[Math.floor(b / P.W)][b % P.W] = '$';
    return { grid, live: !!live[i] };
  });
}
module.exports = { states, analyze, replay, mirror, estimateSeconds, parse, step, naivePlay, naiveRate };
