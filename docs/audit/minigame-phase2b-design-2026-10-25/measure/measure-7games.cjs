// 7ゲームの実測（設計資料用・リポジトリは変更しない）
// 使い方: cd <リポジトリ> && node --max-old-space-size=4096 <this> <gameId> <bot> <N> [age] [length] [difficulty]
// games.js をメモリ上だけで書きかえ、内部状態を見るフックを足す（ボットの目の代わり）。
const fs = require('node:fs');
const origRead = fs.readFileSync;
const PATCHES = [
  // road: items / lane
  ["const items = [];\n        const timerEl = container.querySelector('#lrTimer')",
   "const items = [];\n        globalThis.__road = { items, get lane(){return lane}, get position(){return position}, get playerX(){return playerX}, PLAYER_Z, SEG_LEN, setLane:(n)=>setLane(n), get good(){return good}, get bad(){return bad}, difficulty };\n        const timerEl = container.querySelector('#lrTimer')"],
  // fishing
  ["const fishes = [];\n        function spawnFish()",
   "const fishes = [];\n        globalThis.__fish = { fishes, get phase(){return phase}, get tension(){return tension}, get charge(){return charge}, get caught(){return caught}, get escaped(){return escaped}, difficulty, DURATION_MS };\n        function spawnFish()"],
  // ring flight
  ["for (let i = 0; i < 4; i++) spawn();\n        function update(dt, now) {\n          const kx",
   "for (let i = 0; i < 4; i++) spawn();\n        globalThis.__ring = { get objs(){return objs}, get px(){return px}, get py(){return py}, setT:(x,y)=>{tx=x;ty=y;}, get rings(){return rings}, get missed(){return missed}, get coins(){return coins}, difficulty, DURATION_MS };\n        function update(dt, now) {\n          const kx"],
  // stack
  ["const topY = () => blocks[blocks.length - 1].y;",
   "const topY = () => blocks[blocks.length - 1].y;\n        globalThis.__stack = { swing, blocks, get falling(){return falling}, get over(){return over}, get perfects(){return perfects}, drop:()=>drop(), difficulty, DURATION_MS };"],
  // curling
  ["const turnEl = container.querySelector('#cuTurn')",
   "globalThis.__curl = { get phase(){return phase}, get moving(){return moving}, get myThrown(){return myThrown}, get aiThrown(){return aiThrown}, stones, H, W, BTN, START, TIME_LIMIT_MS, difficulty, startTime };\n        const turnEl = container.querySelector('#cuTurn')"],
];

// ---- 試作（PROTO=wind|arc|flock）。リポジトリは変えず、メモリ上の games.js だけを書きかえる ----
const PROTO = process.env.PROTO || '';
if (PROTO === 'wind') PATCHES.push(
  ["globalThis.__stack = { swing,", "let wind = 0; const WMAX = +(globalThis.__env.WMAX) || 40; globalThis.__stack = { get wind(){return wind}, swing,"],
  ["falling = null; hud(); swing.w = blocks[blocks.length - 1].w;", "falling = null; wind = blocks.length >= 4 ? (Math.random() * 2 - 1) * WMAX : 0; hud(); swing.w = blocks[blocks.length - 1].w;"],
  ["if (falling) { falling.vy += 1400 * dt;", "if (falling) { falling.x += wind * dt; falling.vy += 1400 * dt;"],
);
if (PROTO === 'arc') PATCHES.push(
  ["if (r < 0.55) objs.push({ kind: 'ring', x, y, z: spawnZ, r: lerp(0.48, 0.38, difficulty), hit: false });",
   "if (r < 0.55 && theme === 'summer' && Math.random() < (+(globalThis.__env.ARC) || 0.6)) { const x0 = (Math.random() - 0.5) * 1.2, side = Math.random() < 0.5 ? -1 : 1; [-0.72, -0.42, -0.72].forEach((yy, i) => objs.push({ kind: 'ring', x: x0 + side * i * 0.22, y: yy, z: spawnZ + i * 0.55, r: lerp(0.48, 0.38, difficulty), hit: false })); spawnZ += 1.1; } else if (r < 0.55) objs.push({ kind: 'ring', x, y, z: spawnZ, r: lerp(0.48, 0.38, difficulty), hit: false });"],
);
if (PROTO === 'flock' && process.env.REEL) PATCHES.push(["if (reeling) { lineLen -= 55 * dt;", "if (reeling) { lineLen -= 55 * dt * (1 + lineLen / (+(globalThis.__env.REEL))); "]);
if (PROTO === 'flock') PATCHES.push(
  ["globalThis.__fish = { fishes,", "let flockX = W * 0.6, flockAt = 0; globalThis.__fish = { get flockX(){return flockX}, W, fishes,"],
  ["if (charging) charge = Math.min(1, charge + dt / 1.1);", "if (charging) charge = Math.min(1, charge + dt / 1.1); if (now > flockAt) { flockX = 70 + Math.random() * (W - 100); flockAt = now + 6000; }"],
  ["Math.hypot(f.x - lureX, f.y - lureY) < 90 && Math.random() < dt * 0.9)", "Math.hypot(f.x - lureX, f.y - lureY) < 90 && Math.random() < dt * 0.9 * (Math.abs(lureX - flockX) < 40 ? (+(globalThis.__env.IN) || 2.5) : (+(globalThis.__env.OUT) || 0.6)))"],
);

fs.readFileSync = function (p, ...rest) {
  let out = origRead.call(this, p, ...rest);
  if (typeof p === 'string' && p.endsWith('games.js') && !p.includes('/') ) {
    for (const [a, b] of PATCHES) { if (!out.includes(a)) throw new Error('patch miss: ' + a.slice(0, 50)); out = out.replace(a, b); }
  }
  return out;
};
const {harness} = require(process.cwd() + '/tests/helpers/runtime-harness.cjs');
fs.readFileSync = origRead;

const [id, bot, N = '30', age = '25', length = 'normal', diff = 'normal'] = process.argv.slice(2);

function gauss(rnd) { let u = 0, v = 0; while (!u) u = rnd(); v = rnd(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }
function mulberry(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

function run(seed) {
  const h = harness({seed});
  h.sandbox.__env = {WMAX: process.env.WMAX, ARC: process.env.ARC, IN: process.env.IN, OUT: process.env.OUT, REEL: process.env.REEL};
  const st = h.api.state();
  st.ageTicks = +age * 20;
  st.lifetime.minigameLength = length; st.lifetime.minigameDifficulty = diff;
  const game = h.api.games.find((g) => g.id === id);
  if (!game) throw new Error('no game ' + id);
  let score = null, endAt = null, startAt = null; const botRnd = mulberry(seed * 7919 + 13);
  h.api.startMinigame({id: game.id, start(c, done) { game.start(c, (s) => { score = s; done(s); }); }});
  const view = h.get('minigameOverlay');
  const S = h.sandbox;
  const extra = {};
  let t = 0; const STEP = 16;
  const pd = (el, init = {}) => h.dispatch(el, 'pointerdown', {pointerId: 3, clientX: 150, clientY: 150, ...init});
  const pu = (el, init = {}) => h.dispatch(el, 'pointerup', {pointerId: 3, clientX: 150, clientY: 150, ...init});
  const pm = (el, init = {}) => h.dispatch(el, 'pointermove', {pointerId: 3, ...init});
  // bot state
  const B = {holdUntil: 0, holding: false, reactAt: 0, striking: false, nextDecide: 0, noise: null, dropNoise: null, think: 0, lastHint: ''};
  while (score === null && t < 120000) {
    h.advance(STEP); t += STEP;
    if (bot === 'idle') continue;
    if (id.startsWith('p3') || id.startsWith('road')) {
      const R = S.__road; if (!R) continue;
      const pz = R.position + R.PLAYER_Z;
      // 見える範囲（human: 近め・判断に間をおく / oracle: すぐ）
      const horizon = R.SEG_LEN * (bot === 'oracle' ? 40 : 22);
      if (bot === 'human' && t < B.nextDecide) continue;
      if (bot === 'human') B.nextDecide = t + 180 + botRnd() * 120;
      const ahead = R.items.filter((it) => !it.done && it.z > pz && it.z < pz + horizon).sort((a, b) => a.z - b.z);
      if (bot === 'lazy') { if (t % 1200 < STEP) R.setLane(Math.floor(botRnd() * 3)); continue; }
      if (!ahead.length) continue;
      const first = ahead[0];
      let target = R.lane;
      if (first.bad) {
        if (first.lane === R.lane) { const g = ahead.find((it) => !it.bad && it.lane !== first.lane); target = g ? g.lane : (first.lane === 1 ? (botRnd() < .5 ? 0 : 2) : 1); }
      } else target = first.lane;
      if (bot === 'human' && botRnd() < 0.12) target = R.lane; // 見落とし
      R.setLane(target);
    } else if (id.startsWith('fishing') || id === 'real-fishing') {
      const F = S.__fish; if (!F) continue; const btn = view.querySelector('#rfMain');
      if (F.phase === 'ready') {
        if (!B.holding && t > B.reactAt) { pd(btn); B.holding = true; B.holdUntil = t + (bot === 'reader' && F.flockX ? Math.max(0.12, Math.min(1, (F.flockX - 68) / (F.W - 80))) * 1100 + 40 : bot === 'far' ? 1100 : bot === 'near' ? 250 : 550); }
        else if (B.holding && t >= B.holdUntil) { pu(btn); B.holding = false; B.reactAt = t + 400; }
      } else if (F.phase === 'wait') {
        const biting = F.fishes.some((f) => f.state === 'bite');
        if (biting && !B.striking) { B.striking = true; B.reactAt = t + (bot === 'slow' ? 450 : 260); }
        if (B.striking && t >= B.reactAt) { pd(btn); pu(btn); B.striking = false; B.reactAt = t + 300; }
      } else if (F.phase === 'fight') {
        B.striking = false;
        const want = F.tension < (bot === 'slow' ? 50 : 62);
        if (want && !B.holding) { pd(btn); B.holding = true; } else if (!want && B.holding && F.tension > 72) { pu(btn); B.holding = false; }
      }
      if (F.phase !== 'ready' && F.phase !== 'fight' && B.holding) { pu(btn); B.holding = false; }
    } else if (id.startsWith('ring-flight')) {
      const G = S.__ring; if (!G) continue;
      if (bot === 'human' && t < B.nextDecide) continue;
      if (bot === 'human') B.nextDecide = t + 120;
      const next = G.objs.filter((o) => o.kind === 'ring' && !o.hit && o.z > 0.05).sort((a, b) => a.z - b.z)[0];
      if (!next) continue;
      if (bot === 'human' && next.z > 3.2) continue;
      if (!B.noise || B.noise.o !== next) B.noise = {o: next, dx: bot === 'human' ? gauss(botRnd) * (+process.env.SIG || 0.18) : 0, dy: bot === 'human' ? gauss(botRnd) * (+process.env.SIG || 0.18) : 0};
      G.setT(Math.max(-1, Math.min(1, next.x + B.noise.dx)), Math.max(-1, Math.min(1, next.y + B.noise.dy)));
    } else if (id.startsWith('stack')) {
      const K = S.__stack; if (!K || K.falling || K.over) continue;
      if (t < 600 + 32) continue;
      const top = K.blocks[K.blocks.length - 1];
      const comp = (bot.endsWith('R') && K.wind) ? K.wind * 0.46 : 0;
      const mid = top.x + top.w / 2 - comp, x = K.swing.x + K.swing.w / 2;
      const tt = (mid - x) / (K.swing.dir * K.swing.speed) * 1000; // ms until centered (may be negative)
      if (B.dropNoise === null) B.dropNoise = gauss(botRnd) * (bot.startsWith('oracle') ? 0 : bot.startsWith('human') ? 45 : bot.startsWith('sloppy') ? 90 : 150);
      if (tt > B.dropNoise + 40) B.armed = true;
      if (B.armed && tt <= B.dropNoise) { K.drop(); B.dropNoise = null; B.armed = false; }
    } else if (id.startsWith('curling')) {
      const C = S.__curl; if (!C) continue; const cv = view.querySelector('#cuCanvas'); const hint = view.querySelector('#cuHint').textContent;
      const myTurn = C.phase === 'me' && !C.moving && C.myThrown < 4 + (id === 'curling-winter' ? 0 : -1);
      if (myTurn) {
        if (!B.think) B.think = t + (bot === 'quick' ? 300 : bot === 'slow' ? 3500 : 1800);
        if (t >= B.think) {
          const reach = (C.START.y - C.BTN.y) * (1 + (bot === 'quick' ? 0 : gauss(botRnd) * 0.06));
          const len = reach / 2.4; const dx = bot === 'quick' ? 0 : gauss(botRnd) * 3;
          pd(cv, {clientX: 150, clientY: 400}); pm(cv, {clientX: 150 + dx, clientY: 400 - Math.sqrt(len * len - dx * dx)}); pu(cv, {clientX: 150 + dx, clientY: 400 - Math.sqrt(len * len - dx * dx)});
          B.think = 0;
          if (!extra.throwTimes) extra.throwTimes = []; extra.throwTimes.push(t);
        }
      }
      if (S.__curl) { extra.my = C.myThrown; extra.ai = C.aiThrown; }
    }
  }
  if (S.__curl && id.startsWith('curling')) { extra.my = S.__curl.myThrown; extra.ai = S.__curl.aiThrown; extra.limit = S.__curl.TIME_LIMIT_MS; const st = id === 'curling-winter' ? 4 : 3; extra.complete = (extra.my === st && extra.ai === st) ? 1 : 0; extra.endT = t; }
  if (S.__fish && id.includes('fishing')) { extra.caught = S.__fish.caught.length; extra.esc = S.__fish.escaped; extra.dur = S.__fish.DURATION_MS; }
  if (S.__ring && id.startsWith('ring')) { extra.rings = S.__ring.rings; extra.missed = S.__ring.missed; extra.coins = S.__ring.coins; extra.dur = S.__ring.DURATION_MS; }
  if (S.__stack && id.startsWith('stack')) { extra.n = S.__stack.blocks.length - 1; extra.perf = S.__stack.perfects; extra.over = S.__stack.over; }
  if (S.__road && (id.startsWith('p3') || id.startsWith('road'))) { extra.good = S.__road.good; extra.bad = S.__road.bad; }
  return {score, t, extra};
}

const scores = [], extras = [];
for (let seed = 1; seed <= +N; seed++) { const r = run(seed); scores.push(r.score); extras.push(r.extra); }
const n = scores.length, mean = scores.reduce((a, b) => a + b, 0) / n;
const sorted = [...scores].sort((a, b) => a - b);
const c = scores.filter((s) => s >= 35).length / n, b = scores.filter((s) => s >= 55).length / n, a = scores.filter((s) => s >= 75).length / n, s90 = scores.filter((s) => s >= 90).length / n;
const agg = {};
for (const e of extras) for (const [k, v] of Object.entries(e)) { if (typeof v === 'number') agg[k] = (agg[k] || 0) + v / n; }
console.log(JSON.stringify({id, bot, n, age: +age, length, diff, mean: +mean.toFixed(1), min: sorted[0], med: sorted[n >> 1], max: sorted[n - 1], C: +c.toFixed(2), B: +b.toFixed(2), A: +a.toFixed(2), S: +s90.toFixed(2), avg: Object.fromEntries(Object.entries(agg).map(([k, v]) => [k, +v.toFixed(2)])) }));
