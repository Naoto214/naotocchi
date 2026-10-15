// Transaction adapted from ../growth-chain/session.mjs at cee3e872; movement reused directly.
import {standardRules} from '../growth-chain/rules.mjs';
import {board,cloneBoard,validateBoard,gravity,HIDDEN,resolve as oldResolve,groups as oldGroups} from '../growth-chain/engine.mjs';
import {spawnPose,poseCells,fits,movePose,landing,placements,hasLegalPlacement} from '../growth-chain/session.mjs';
import {createBag,drawPair} from './bag.mjs';
import {groups,resolve} from './engine.mjs';
export {spawnPose,poseCells,fits,movePose,landing,placements,hasLegalPlacement};
export function createSession(seed, options={}, initial={}){
 const opts={mode:'new',anchor:'A',gaugeUnit:8,...options};
 if(!['new','old'].includes(opts.mode)||!['A','B','C'].includes(opts.anchor)||![2,3,4,8].includes(opts.gaugeUnit))throw Error('Invalid options');
 const r=standardRules({gaugeUnit:opts.gaugeUnit});
 const b=initial.board?cloneBoard(initial.board):board(r);validateBoard(b,r);
 if((opts.mode==='new'?groups(b):oldGroups(b,r)).length||JSON.stringify(gravity(b))!==JSON.stringify(b))throw Error('Initial board must be stable');
 const eggs=initial.eggs?[...initial.eggs]:[0,0,0,0],gauge=initial.gauge??0;
 if(eggs.length!==4||eggs.some(n=>!Number.isSafeInteger(n)||n<0)||!Number.isSafeInteger(gauge)||gauge<0)throw Error('Invalid resources');
 const bag=createBag(seed),queue=Array.from({length:4},()=>drawPair(bag));
 const s={version:'growth-clear/1',seed,options:opts,rules:r,board:b,eggs,gauge,bag,queue,nextId:Math.max(0,...b.flat().filter(Boolean).map(c=>c.id))+1,score:0,drops:0,actions:0,over:null};
 if(!fits(b,spawnPose(r)))s.over='spawn-blocked';else if(!hasLegalPlacement(s))s.over='no-legal-placement';
 return s;
}
function copy(s) {
  return {
    ...s,
    board: cloneBoard(s.board),
    eggs: [...s.eggs],
    queue: s.queue.map((p) => [...p]),
    bag: { ...s.bag, items: [...s.bag.items] },
    last: undefined,
  };
}
const integer = (n, min, max) => Number.isInteger(n) && n >= min && n <= max;
export function applyAction(s, a, trace = true, options = {}) {
  if (s.over) throw Error("Game over");
  let z = copy(s),
    r = s.rules,
    ctx = { source: a.type, priority: [] };
  if (a.type === "drop") {
    if (!Array.isArray(a.path) || !a.path.length || a.path.at(-1) !== "hard")
      throw Error("Invalid drop path");
    let p = spawnPose(r);
    if (!fits(z.board, p)) throw Error("Blocked spawn");
    for (let i = 0; i < a.path.length; i++) {
      const op = a.path[i];
      if (op === "hard") {
        if (i !== a.path.length - 1) throw Error("Early hard drop");
        p = landing(z.board, p);
      } else {
        p = movePose(z.board, p, op);
        if (!p) throw Error("Illegal motion");
      }
    }
    if (r.topOut === "legal" && poseCells(p).some((c) => c.y < HIDDEN))
      throw Error("Illegal hidden placement");
    const cells = poseCells(p),
      pair = z.queue[0];
    for (let i = 0; i < 2; i++) {
      const c = cells[i],
        id = z.nextId++;
      z.board[c.y][c.x] = { id, ...pair[i] };
      ctx.priority.push(id);
    }
    ctx.pair = [...ctx.priority];
    ctx.priority.reverse();
    z.drops++;
    if (r.topOut === "lock" && cells.some((c) => c.y < HIDDEN)) {
      z.over = "lock-overflow";
      z.actions++;
      z.last = {
        waves: [],
        eggs: [0, 0, 0, 0],
        gauge: 0,
        score: 0,
        created08: 0,
        deaths: 0,
        overflow: 0,
        consumed: 0,
        board: z.board,
      };
      return z;
    }
    z.queue.shift();
    z.queue.push(drawPair(z.bag));
  } else if (a.type === "egg") {
    if (
      !integer(a.rank, 0, 3) ||
      !integer(a.k, 0, r.kinds - 1) ||
      !integer(a.x, 0, r.width - 1) ||
      !z.eggs[a.rank]
    )
      throw Error("Invalid egg");
    let y = a.y;
    if (r.eggPlacement === "column") {
      y = z.board.length - 1;
      while (y >= HIDDEN && z.board[y][a.x]) y--;
    }
    if (!integer(y, HIDDEN, z.board.length - 1) || z.board[y][a.x])
      throw Error("Invalid egg cell");
    let id = z.nextId++;
    z.board[y][a.x] = { id, k: a.k, s: a.rank + 1 };
    z.eggs[a.rank]--;
    ctx.priority = [id];
  } else if (a.type === "transform" || a.type === "bulk") {
    if (!integer(a.to, 0, r.kinds - 1)) throw Error("Invalid target species");
    const cost = (a.type === "bulk" ? 3 : 1) * r.gaugeUnit;
    if (z.gauge < cost) throw Error("Insufficient gauge");
    if (a.type === "transform") {
      if (
        !integer(a.x, 0, r.width - 1) ||
        !integer(a.y, HIDDEN, z.board.length - 1)
      )
        throw Error("Invalid target cell");
      const c = z.board[a.y][a.x];
      if (!c || c.k === a.to) throw Error("Invalid target");
      c.k = a.to;
      ctx.priority = [c.id];
    } else {
      if (!integer(a.from, 0, r.kinds - 1) || a.from === a.to)
        throw Error("Invalid source");
      for (let y = z.board.length - 1; y >= 0; y--)
        for (let x = 0; x < r.width; x++) {
          const c = z.board[y][x];
          if (c?.k === a.from) {
            c.k = a.to;
            ctx.priority.push(c.id);
          }
        }
      if (!ctx.priority.length) throw Error("Empty bulk");
    }
    z.gauge -= cost;
  } else throw Error("Invalid action");
  const result = (s.options.mode === 'old' ? oldResolve : resolve)(z.board, r, {...ctx, anchor:s.options.anchor, choices:a.choices, choose:options.choose}, trace);
  result.mixedRemoved ??= 0; result.mixedHigh ??= 0; result.decisions ??= 0; result.choices ??= {};
  z.board = result.board;
  z.last = result;
  z.actions++;
  z.score += result.score;
  z.gauge += result.gauge;
  z.eggs = z.eggs.map((n, i) => n + result.eggs[i]);
  if (!fits(z.board, spawnPose(r))) z.over = "spawn-blocked";
  else if (r.topOut === "legal" && !hasLegalPlacement(z))
    z.over = "no-legal-placement";
  return z;
}
export const preview = (s, a) => applyAction(s, a);
export function stateData(s) {
  const { last, ...rest } = s;
  return rest;
}
export function stateHash(s) {
  let h = 2166136261;
  for (const c of JSON.stringify(stateData(s))) {
    h = Math.imul(h ^ c.charCodeAt(0), 16777619) >>> 0;
  }
  return h.toString(16).padStart(8, "0");
}
export function replay(record){
 if(!record.initial||record.initial.version!=='growth-clear/1'||!Array.isArray(record.actions))throw Error('Invalid replay');
 let s=structuredClone(record.initial);validateBoard(s.board,s.rules);
 for(const a of record.actions)s=applyAction(s,a,false);
 if(record.hash&&stateHash(s)!==record.hash)throw Error('Replay hash mismatch');
 return s;
}
