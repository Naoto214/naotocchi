import { candidates, step, key, stage, kind, validate } from './engine.mjs';
export function evaluate(s, policy = 'cluster') {
  if (s.won) return 1e9;
  let mass = 0,
    pairs = 0,
    adjacent = 0;
  const counts = Array(s.config.kinds * 8 + 1).fill(0),
    byKind = Array(s.config.kinds).fill(0);
  const n = s.config.size;
  for (let i = 0; i < s.board.length; i++) {
    const v = s.board[i];
    if (!v) continue;
    counts[v]++;
    const p = 2 ** (stage(v) - 1);
    mass += p;
    byKind[kind(v)] += p;
    for (const j of [
      i % n < n - 1 ? i + 1 : -1,
      i + n < s.board.length ? i + n : -1,
    ])
      if (j >= 0 && s.board[j] && kind(v) === kind(s.board[j]))
        adjacent += stage(v) === stage(s.board[j]) ? stage(v) * 2 : 0.2;
  }
  for (let v = 1; v < counts.length; v++)
    pairs += Math.floor(counts[v] / 2) * 2 ** (stage(v) - 1);
  const eggs = s.eggs.reduce((a, v, i) => a + v * 2 ** i, 0),
    empty = s.board.filter((v) => !v).length;
  if (policy === 'organize')
    return mass + eggs * 0.8 + empty * 1.2 + adjacent * 2 + s.gauge;
  if (policy === 'save-eggs')
    return (
      mass +
      eggs * 1.8 +
      pairs * 0.4 +
      s.gauge * 1.5 +
      Math.max(...byKind) * 0.4
    );
  if (policy === 'transform')
    return (
      mass +
      eggs * 0.7 +
      pairs * 0.8 +
      Math.max(...byKind) * 0.8 +
      s.gauge * 0.4
    );
  return (
    mass +
    eggs * 0.9 +
    pairs * 0.65 +
    Math.max(...byKind) * 0.5 +
    s.gauge * 1.2 +
    adjacent * 0.05
  );
}
export function search(initial, options = {}) {
  validate(initial);
  const opts = {
    mode: 'beam',
    width: 24,
    maxDepth: 70,
    maxNodes: 200000,
    maxMs: 10000,
    policy: 'cluster',
    ...options,
  };
  if (
    !['beam', 'bfs'].includes(opts.mode) ||
    !Number.isInteger(opts.width) ||
    opts.width < 1 ||
    !Number.isInteger(opts.maxNodes) ||
    opts.maxNodes < 1 ||
    !Number.isInteger(opts.maxDepth) ||
    opts.maxDepth < 0 ||
    !Number.isFinite(opts.maxMs) ||
    opts.maxMs < 0
  )
    throw Error('Invalid search limits');
  const start = performance.now(),
    seen = new Set([key(initial)]);
  let nodes = 0,
    expanded = 0,
    duplicates = 0,
    pruned = 0,
    depth = 0,
    front = [{ s: initial, path: [] }];
  const finish = (status, node, reason) => ({
    status,
    path: node?.path ?? [],
    shortest: status === 'solved' && opts.mode === 'bfs',
    reason,
    options: opts,
    stats: {
      nodes,
      expanded,
      duplicates,
      pruned,
      depth,
      seen: seen.size,
      elapsedMs: performance.now() - start,
    },
  });
  if (initial.won) return finish('solved', front[0], 'initial-terminal');
  for (depth = 0; depth < opts.maxDepth; depth++) {
    let next = [];
    for (const node of front) {
      expanded++;
      for (const a of candidates(node.s)) {
        if (nodes >= opts.maxNodes || performance.now() - start >= opts.maxMs)
          return finish('unproven', null, 'budget');
        nodes++;
        const r = step(node.s, a);
        if (!r.valid) continue;
        const k = key(r.state);
        if (seen.has(k)) {
          duplicates++;
          continue;
        }
        seen.add(k);
        const child = {
          s: r.state,
          path: [...node.path, a],
          value: evaluate(r.state, opts.policy),
        };
        if (r.state.won) return finish('solved', child, 'witness');
        next.push(child);
      }
    }
    if (!next.length)
      return finish(
        opts.mode === 'bfs' ? 'unsolvable' : 'unproven',
        null,
        'frontier-exhausted',
      );
    if (opts.mode === 'beam') {
      next.sort((a, b) => b.value - a.value);
      pruned += Math.max(0, next.length - opts.width);
      next = next.slice(0, opts.width);
    }
    front = next;
  }
  return finish('unproven', null, 'depth');
}
