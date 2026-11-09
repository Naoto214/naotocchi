import { cloneGameState, createGameState, describeTiles, gameMove, isComplete, stateKey } from './engine.mjs';
import { matchesCondition } from '../naopoyo-rescue/conditions.mjs';

const steps = [[1, 0], [0, 1], [-1, 0], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];

export function replay(board, solution) {
  const state = createGameState(board);
  const events = [];
  const touched = new Set();
  for (const action of solution) {
    const actor = state.actors.find(a => a.x === action.x && a.y === action.y);
    const tiles = describeTiles(state);
    const result = actor && gameMove(state, actor.id, action.dx, action.dy);
    if (!result?.ok) throw new Error(`${board.id} move ${state.moves + 1}: ${result?.reason || 'missing actor'}`);
    events.push(...result.events);
    const contacts = [{ x: action.x + action.dx, y: action.y + action.dy }];
    for (const event of result.events) {
      if (event.catalogId) touched.add(event.catalogId);
      if (event.type === 'fall') contacts.push({ x: event.x, y: event.to });
      if (event.type === 'split') contacts.push(...(event.children || []));
    }
    for (const tile of tiles) {
      if (contacts.some(p => p.x === tile.x && p.y === tile.y)) touched.add(tile.catalogId);
    }
  }
  if (!isComplete(state)) throw new Error(`${board.id} incomplete witness`);
  return { state, events, touched: [...touched].sort() };
}

function path(node) {
  const solution = [];
  for (let n = node; n.action; n = n.parent) solution.push(n.action);
  return solution.reverse();
}

function* neighbors(state) {
  for (const { id, x, y } of state.actors) {
    for (const [dx, dy] of steps) {
      const next = cloneGameState(state);
      if (gameMove(next, id, dx, dy).ok) yield { state: next, action: { x, y, dx, dy } };
    }
  }
}

export function solve(board, { limit = 12000, maxDepth = 90 } = {}) {
  const state = createGameState(board);
  const queue = [{ state, depth: 0 }];
  const seen = new Set([stateKey(state)]);
  let expanded = 0;
  let deepest = 0;
  let truncated = false;
  for (let cursor = 0; cursor < queue.length; cursor++) {
    const entry = queue[cursor];
    deepest = entry.depth;
    if (isComplete(entry.state)) return { status: 'shortest', solution: path(entry), expanded, discovered: seen.size, limit, maxDepth, deepest };
    if (expanded >= limit) return { status: 'limit', expanded, discovered: seen.size, limit, maxDepth, deepest };
    if(entry.depth>=maxDepth){truncated=true;continue;}
    expanded++;
    for (const candidate of neighbors(entry.state)) {
      if(isComplete(candidate.state))return {status:'shortest',solution:path({...candidate,depth:entry.depth+1,parent:entry}),expanded,discovered:seen.size+1,limit,maxDepth,deepest:entry.depth+1};
      const key = stateKey(candidate.state);
      if (seen.has(key)) continue;
      seen.add(key);
      queue.push({ ...candidate, depth: entry.depth + 1, parent: entry });
    }
    // The parent links preserve action history. Old node states are no longer queried.
    entry.state = null;
  }
  return { status: truncated?'limit':'exhausted', expanded, discovered: seen.size, limit, maxDepth, deepest };
}

function distance(a, b) {
  return Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y));
}

function estimate(s) {
  return s.actors.reduce((sum, actor) => {
    const exits = s.exits.filter(e => !e.species || e.species === actor.species);
    const ready = exits.filter(e => matchesCondition(actor, e));
    if (ready.length) return sum + Math.min(...ready.map(e => distance(actor, e)));
    const low = exits.some(e => actor.level > (e.exact ?? e.max ?? 8));
    const targets = low ? s.spikes : s.actors.filter(a => a !== actor && a.species === actor.species);
    return sum + 4 + (targets.length ? Math.min(...targets.map(t => distance(actor, t))) : 8);
  }, 0);
}

class Frontier {
  constructor() { this.items = []; }
  push(node) {
    let index = this.items.length;
    while (index > 0) {
      const parent = Math.floor((index - 1) / 2);
      if (this.items[parent].cost <= node.cost) break;
      this.items[index] = this.items[parent];
      index = parent;
    }
    this.items[index] = node;
  }
  pop() {
    const first = this.items[0];
    const last = this.items.pop();
    if (this.items.length === 0) return first;
    let index = 0;
    while (index * 2 + 1 < this.items.length) {
      let child = index * 2 + 1;
      if (this.items[child + 1]?.cost < this.items[child].cost) child++;
      if (last.cost <= this.items[child].cost) break;
      this.items[index] = this.items[child];
      index = child;
    }
    this.items[index] = last;
    return first;
  }
}

// The weighted estimate is used only to find a witness after the breadth-first cap.
export function findWitness(board, { limit = 50000, maxDepth = 120 } = {}) {
  const state = createGameState(board);
  const queue = new Frontier();
  const seen = new Map([[stateKey(state), 0]]);
  queue.push({ state, depth: 0, cost: estimate(state) });
  let expanded = 0;
  let deepest = 0;
  let truncated = false;
  while (queue.items.length && expanded < limit) {
    const entry = queue.pop();
    if (seen.get(stateKey(entry.state)) < entry.depth) continue;
    deepest = Math.max(deepest, entry.depth);
    if (isComplete(entry.state)) return { status: 'witness', solution: path(entry), expanded, discovered: seen.size, limit, maxDepth, deepest };
    if (entry.depth >= maxDepth){truncated=true;continue;}
    expanded++;
    for (const candidate of neighbors(entry.state)) {
      const key = stateKey(candidate.state);
      const depth = entry.depth + 1;
      if ((seen.get(key) ?? Infinity) <= depth) continue;
      seen.set(key, depth);
      queue.push({ ...candidate, depth, parent: entry, cost: depth + 3 * estimate(candidate.state) });
    }
    entry.state = null;
  }
  return { status: queue.items.length||truncated ? 'limit' : 'exhausted', expanded, discovered: seen.size, limit, maxDepth, deepest };
}
