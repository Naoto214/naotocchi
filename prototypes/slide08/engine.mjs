// Independent deterministic engine. Cell 0=empty, kind*8+stage otherwise.
export const VERSION = 'slide08-v1';
export const DIRS = ['left', 'right', 'up', 'down'];
export const stage = (c) => (c ? ((c - 1) % 8) + 1 : 0);
export const kind = (c) => Math.floor((c - 1) / 8);
const int = (n, a, b) => Number.isSafeInteger(n) && n >= a && n <= b;
export function config(input = {}) {
  const c = {
    size: 6,
    count: 24,
    kinds: 3,
    maxStage: 4,
    single: 4,
    bulk: 12,
    cap: 24,
    initialGauge: 4,
    initialEggs: [2, 1, 0, 0],
    reward: 'landing',
    ...input,
  };
  if (
    !int(c.size, 2, 7) ||
    !int(c.count, 0, c.size * c.size) ||
    !int(c.kinds, 1, 5) ||
    !int(c.maxStage, 1, 5) ||
    !int(c.single, 1, 24) ||
    !int(c.bulk, 1, 24) ||
    !int(c.cap, 1, 100) ||
    !int(c.initialGauge, 0, c.cap) ||
    !Array.isArray(c.initialEggs) ||
    c.initialEggs.length !== 4 ||
    c.initialEggs.some((v) => !int(v, 0, 100)) ||
    !['landing', 'crossed', 'off'].includes(c.reward)
  )
    throw Error('Invalid configuration');
  return { ...c, initialEggs: [...c.initialEggs] };
}
export function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export function create(seed = 1, options = {}) {
  if (!int(seed, 0, 0xffffffff)) throw Error('Invalid seed');
  const c = config(options),
    random = rng(seed),
    positions = Array.from({ length: c.size * c.size }, (_, i) => i),
    board = positions.map(() => 0);
  for (let i = positions.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [positions[i], positions[j]] = [positions[j], positions[i]];
  }
  for (let j = 0; j < c.count; j++)
    board[positions[j]] =
      Math.floor(random() * c.kinds) * 8 +
      1 +
      Math.floor(random() * c.maxStage);
  return {
    version: VERSION,
    seed,
    config: c,
    board,
    eggs: [...c.initialEggs],
    gauge: c.initialGauge,
    moves: 0,
    score: 0,
    won: false,
    used: { egg: 0, single: 0, bulk: 0 },
  };
}
export function validate(s) {
  const c = config(s.config);
  if (
    s.version !== VERSION ||
    !Array.isArray(s.board) ||
    s.board.length !== c.size * c.size ||
    s.board.some((v) => !int(v, 0, c.kinds * 8)) ||
    !Array.isArray(s.eggs) ||
    s.eggs.length !== 4 ||
    s.eggs.some((v) => !int(v, 0, Number.MAX_SAFE_INTEGER)) ||
    !int(s.gauge, 0, c.cap) ||
    typeof s.won !== 'boolean' ||
    !int(s.moves, 0, Number.MAX_SAFE_INTEGER) ||
    !int(s.score, 0, Number.MAX_SAFE_INTEGER)
  )
    throw Error('Invalid state');
  return true;
}
export const key = (s) =>
  `${s.board.join(',')}|${s.eggs.join(',')}|${s.gauge}|${+s.won}`;
export function lines(n, dir) {
  const out = [];
  for (let lane = 0; lane < n; lane++) {
    const row = [];
    for (let j = 0; j < n; j++)
      row.push(
        dir === 'left'
          ? lane * n + j
          : dir === 'right'
            ? lane * n + n - 1 - j
            : dir === 'up'
              ? j * n + lane
              : (n - 1 - j) * n + lane,
      );
    out.push(row);
  }
  return out;
}
function compress(b, n, dir) {
  const out = b.map(() => 0);
  for (const line of lines(n, dir)) {
    const cells = line.map((i) => b[i]).filter(Boolean);
    cells.forEach((c, j) => (out[line[j]] = c));
  }
  return out;
}
export function groups(b, n) {
  const seen = new Uint8Array(b.length),
    out = [];
  for (let i = 0; i < b.length; i++) {
    if (!b[i] || seen[i]) continue;
    const g = [i];
    seen[i] = 1;
    for (let p = 0; p < g.length; p++) {
      const j = g[p],
        x = j % n,
        y = Math.floor(j / n);
      for (const k of [
        x > 0 ? j - 1 : -1,
        x < n - 1 ? j + 1 : -1,
        y > 0 ? j - n : -1,
        y < n - 1 ? j + n : -1,
      ])
        if (k >= 0 && !seen[k] && b[k] === b[i]) {
          seen[k] = 1;
          g.push(k);
        }
    }
    if (g.length >= 2) out.push(g);
  }
  return out;
}
function anchor(g, n, dir, priority) {
  if (g.includes(priority)) return priority;
  const rank = (i) =>
    dir === 'left'
      ? i % n
      : dir === 'right'
        ? -(i % n)
        : dir === 'up'
          ? Math.floor(i / n)
          : dir === 'down'
            ? -Math.floor(i / n)
            : 0;
  return [...g].sort(
    (a, b) =>
      rank(a) - rank(b) ||
      (a % n) - (b % n) ||
      Math.floor(b / n) - Math.floor(a / n),
  )[0];
}
export function landing(s, dir, lane) {
  if (!DIRS.includes(dir) || !int(lane, 0, s.config.size - 1)) return -1;
  const line = lines(s.config.size, dir)[lane].slice().reverse();
  let last = -1;
  for (const i of line) {
    if (s.board[i]) break;
    last = i;
  }
  return last;
}
export function step(s, a) {
  const invalid = () => ({ valid: false, state: s, waves: [] });
  if (s.won || !a || typeof a !== 'object') return invalid();
  const c = s.config,
    n = c.size;
  let b = s.board.slice(),
    eggs = s.eggs.slice(),
    gauge = s.gauge,
    dir = null,
    priority = -1;
  const goodKind = (k) => int(k, 0, c.kinds - 1);
  if (a.type === 'slide') {
    if (!DIRS.includes(a.dir)) return invalid();
    dir = a.dir;
    b = compress(b, n, dir);
  } else if (a.type === 'egg') {
    if (!int(a.rank, 0, 3) || !eggs[a.rank] || !goodKind(a.kind))
      return invalid();
    const i = landing(s, a.dir, a.lane);
    if (i < 0) return invalid();
    b[i] = a.kind * 8 + a.rank + 1;
    eggs[a.rank]--;
    dir = a.dir;
  } else if (a.type === 'single') {
    if (
      !int(a.index, 0, b.length - 1) ||
      !b[a.index] ||
      !goodKind(a.kind) ||
      kind(b[a.index]) === a.kind ||
      gauge < c.single
    )
      return invalid();
    b[a.index] = a.kind * 8 + stage(b[a.index]);
    gauge -= c.single;
    priority = a.index;
  } else if (a.type === 'bulk') {
    if (
      !goodKind(a.from) ||
      !goodKind(a.kind) ||
      a.from === a.kind ||
      gauge < c.bulk ||
      !b.some((v) => v && kind(v) === a.from)
    )
      return invalid();
    b = b.map((v) => (v && kind(v) === a.from ? a.kind * 8 + stage(v) : v));
    gauge -= c.bulk;
  } else return invalid();
  const waves = [];
  let score = s.score,
    won = false;
  // Each wave strictly reduces population; at most board.length waves.
  for (let wave = 1; wave <= b.length; wave++) {
    const gs = groups(b, n);
    if (!gs.length) break;
    const next = b.slice(),
      events = [];
    let gain = 0;
    for (const g of gs) {
      const at = anchor(g, n, dir, priority),
        old = stage(b[at]),
        death = old === 8,
        delta = death ? 0 : Math.min(4, g.length - 1),
        to = death ? 0 : Math.min(8, old + delta),
        overflow = death ? 0 : Math.max(0, old + delta - 8),
        k = kind(b[at]);
      for (const i of g) next[i] = 0;
      if (!death) next[at] = k * 8 + to;
      else won = true;
      gain += death ? 0 : to - old;
      if (!death && c.reward !== 'off')
        for (let j = 4; j <= 7; j++)
          if (c.reward === 'crossed' ? old < j && to >= j : to === j)
            eggs[j - 4]++;
      score += (death ? 100 : (to - old + overflow) * 10) * wave;
      events.push({
        cells: g,
        anchor: at,
        kind: k,
        from: old,
        to,
        death,
        overflow,
      });
    }
    gauge = Math.min(c.cap, gauge + gain);
    b = a.type === 'slide' ? compress(next, n, dir) : next;
    waves.push({ chain: wave, events });
  }
  if (
    a.type === 'slide' &&
    !waves.length &&
    b.every((v, i) => v === s.board[i])
  )
    return invalid();
  const used = { ...s.used };
  if (a.type !== 'slide') used[a.type]++;
  return {
    valid: true,
    state: {
      ...s,
      board: b,
      eggs,
      gauge,
      score,
      won,
      moves: s.moves + 1,
      used,
    },
    waves,
  };
}
export function* candidates(s) {
  if (s.won) return;
  const c = s.config;
  for (const dir of DIRS) yield { type: 'slide', dir };
  for (let rank = 0; rank < 4; rank++)
    if (s.eggs[rank])
      for (const dir of DIRS)
        for (let lane = 0; lane < c.size; lane++)
          if (landing(s, dir, lane) >= 0)
            for (let k = 0; k < c.kinds; k++)
              yield { type: 'egg', rank, kind: k, dir, lane };
  if (s.gauge >= c.single)
    for (let index = 0; index < s.board.length; index++)
      if (s.board[index])
        for (let k = 0; k < c.kinds; k++)
          if (kind(s.board[index]) !== k)
            yield { type: 'single', index, kind: k };
  if (s.gauge >= c.bulk)
    for (const from of new Set(s.board.filter(Boolean).map(kind)))
      for (let k = 0; k < c.kinds; k++)
        if (from !== k) yield { type: 'bulk', from, kind: k };
}
export function actions(s) {
  return [...candidates(s)].filter((a) => step(s, a).valid);
}
