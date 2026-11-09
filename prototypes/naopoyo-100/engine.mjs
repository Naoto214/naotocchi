// The formal chapter still resolves movement, support, contact, D births and rescue.
import { at, canAscend, complete, createState, externalMove, gateAllows, mass, settle, wall } from '../naopoyo-time-hand-chapter1/engine.mjs';
import { matchesCondition } from '../naopoyo-rescue/conditions.mjs';

const orientations = { N: [0, -1], E: [1, 0], S: [0, 1], W: [-1, 0] };
const letter = (dx, dy) => Object.keys(orientations).find(key => orientations[key][0] === dx && orientations[key][1] === dy);
const where = (x, y) => `${x},${y}`;
const tileKey = t => where(t.x, t.y);
const terrain = new Set(['terrain.floor', 'terrain.wall', 'terrain.water', 'terrain.ice', 'terrain.tunnel']);
const controlIds = new Set(['fixture.plate.hold', 'fixture.plate.weight', 'fixture.latch', 'fixture.sequence', 'fixture.toggle']);
const fieldIds = new Set(['field.current', 'field.bubble', 'field.wind', 'field.updraft', 'field.wave']);
const decoration = new Set(['scenery.lamp', 'scenery.grass', 'scenery.tree', 'sign.gravity']);
const priority = { 'fixture.warp': 0, 'fixture.burrow': 0, 'field.wave': 1, 'field.updraft': 1, 'field.bubble': 1, 'field.wind': 1, 'field.current': 1, 'terrain.ice': 2 };
const fits = (a, p) => matchesCondition(a, p);
const floatField = t => t.catalogId === 'field.updraft' || t.catalogId === 'field.bubble';
const canSwim = a => a.species === 'fish' || a.species === 'penguin';
const travelTile = t => t.catalogId === 'fixture.warp' || t.catalogId === 'fixture.burrow';
const openPhase = (s, p) => s.moves % p.period === p.phase;
const gcd = (a, b) => b === 0 ? a : gcd(b, a % b);

export const materialRules = Object.freeze({
  'terrain.floor': '通れる床。重力の部屋では、下の壁・門の天面・仲間などが支えになる。',
  'terrain.wall': '通れない壁。角を挟む二つの経路がどちらも塞がると、斜めにも抜けられない。',
  'scenery.lamp': '灯り。通行や条件には影響しない。',
  'scenery.grass': '草の目印。通行や条件には影響しない。',
  'scenery.tree': '木の目印。通行や条件には影響しない。',
  'sign.gravity': '重力が働く部屋の目印。上りには出発側と到着側の支えが必要。',
  'fixture.spike': '進入の真後ろから時の針が伸び、壁や仲間に当たると時計回りに曲がる。空きと針の強さに応じて「1」が生まれる。',
  'fixture.gate': '表示された種族・段階の条件を満たす個体だけ通れる。門の上面は足場になり、真上からの出入りはできない。',
  'fixture.exit': '条件に合う個体を救出する。条件違いの個体は通過できる。全員を救出するとクリア。',
  'fixture.plate.hold': '条件に合う仲間か箱が乗る間だけ連動先を開く。',
  'fixture.plate.weight': '表示条件に合う段階の仲間か重さの箱が乗っている間だけ作動する。',
  'fixture.latch': '条件に合う仲間か箱で一度作動させると、離れても開いたまま。',
  'fixture.sequence': '同じ印の板を番号順に新たに作動させる。順違いで最初に戻り、完成後は保持される。',
  'fixture.door': '同じ印の入力が揃うと開く。閉じた時に中にいる仲間は出られるが、閉じた扉へは入れない。',
  'fixture.crumble': '上にいた最後の仲間が離れると消える。下への落下や通路が変わる。',
  'object.crate': '条件以上の段階の仲間が縦横に一マス押せる。表示の「重」は箱の重さで、押す条件とは別。引けず、仲間や閉じた場所へ押せない。針と重力の支えを止め、板にも乗る。',
  'fixture.oneway': '矢印と同じ縦横の向きでだけ入れる。出る向きは自由。',
  'terrain.water': 'さかなとペンギンだけ進入できる。水中では落下せず、水から水へは上向きにも移動できる。',
  'field.current': '水流に操作中のさかなやペンギンが入ると、矢印へ流される。壁などで止まる。',
  'field.bubble': '条件に合う操作中の水の仲間を上に運ぶ。泡の先が閉じていれば、最後の泡で止まる。',
  'terrain.ice': '操作中の仲間が乗ると、進入した向きのまま滑る。氷を出るか、先が塞がると止まる。',
  'field.wind': '条件に合う操作中の仲間を矢印へ運ぶ。風は通行条件をすり抜けない。',
  'field.updraft': '条件に合う操作中の仲間を上へ運ぶ。次の段に進めなければ気流の中で止まる。',
  'fixture.warp': '操作中の仲間を同じ印の空いた対へ運ぶ。同じ対は一手につき一度だけ。埋まっていれば転送せず、入り直すと再試行できる。',
  'fixture.burrow': '条件と入口の矢印が合う操作中の仲間を、同じ印の出口へ一方向に運ぶ。出口が空いている必要がある。',
  'terrain.tunnel': '表示された条件に合う仲間だけが入れる地中の細道。',
  'field.wave': '周期の合う相でこのマスに入ると、操作中の水の仲間が矢印へ流れる。',
  'npc.owl': '条件に合う訪問役が止まり、指定された相棒が上下左右に隣接すると、同じ印の連動先を開く。ふくろうは操作しない。',
  'fixture.phase': '表示された周期の一相でだけ進入できる。成功した一手ごとに一相進む。',
  'fixture.toggle': '条件に合う仲間か箱が新たに入るたびに連動を反転する。乗り続けても反転しない。',
  'fixture.signalLamp': '同じ印の仕掛けが作動している時に光る。通行には影響しない。'
});

function prepare(board) {
  const tiles = (board.tiles || []).map((t, i) => ({
    ...t,
    params: { id: `tile-${i + 1}`, ...t.params }
  }));
  const byType = {};
  const byCell = {};
  for (const tile of tiles) {
    (byType[tile.catalogId] ??= []).push(tile);
    (byCell[tileKey(tile)] ??= []).push(tile);
  }
  const groups = {};
  for (const t of byType['fixture.sequence'] || []) {
    const { groupId, step } = t.params;
    groups[groupId] = Math.max(groups[groupId] || 0, step);
  }
  let period = 1;
  for (const type of ['fixture.phase', 'field.wave']) {
    for (const { params: p } of byType[type] || []) period = period * p.period / gcd(period, p.period);
  }
  return { tiles, byType, byCell, groups, period, initialActors: board.actors };
}

const get = (s, id) => s.layout.byType[id] || [];
const on = (s, x, y) => s.layout.byCell[where(x, y)] || [];
const has = (s, x, y, id) => on(s, x, y).some(t => t.catalogId === id);

export function createGameState(board) {
  const s = createState({
    walls: [], spikes: [], gates: [], exits: [], gravity: false,
    ...board,
    gravityRules: 'supported-v1',
    movementRules: 'contact-v2',
    terrainRules: 'magic-gate-v2',
    splitRules: 'recombine-once-v1',
    splitPriority: 'D',
    timeHand: { maxSteps: 7, resetHeading: false, passGenerated: false }
  });
  s.baseWalls = s.walls;
  s.layout = prepare(s);
  s.crates = Object.fromEntries(get(s, 'object.crate').map(t => [t.params.id, { x: t.x, y: t.y }]));
  s.flags = {};
  s.sequenceProgress = {};
  s.pressed = {};
  s.collapsed = {};
  controls(s);
  syncWalls(s);
  return s;
}

export function cloneGameState(s) {
  return {
    ...s,
    actors: s.actors.map(a => ({ ...a })),
    gates: s.gates.map(g => ({ ...g })),
    rescuedBySpecies: { ...s.rescuedBySpecies },
    crates: { ...s.crates },
    flags: { ...s.flags },
    sequenceProgress: { ...s.sequenceProgress },
    pressed: { ...s.pressed },
    collapsed: { ...s.collapsed }
  };
}

function doorOpen(s, p) {
  const active=id=>Object.hasOwn(s.flags,id)&&s.flags[id]===true;
  return Boolean(p.needs?.length && p.needs.every(active) || p.any?.some(active));
}

function isShut(s, t) {
  return t.catalogId === 'fixture.door' && !doorOpen(s, t.params)
    || t.catalogId === 'fixture.phase' && !openPhase(s, t.params);
}

function syncWalls(s) {
  const walls = [...s.baseWalls];
  for (const id of ['fixture.door', 'fixture.phase']) {
    for (const t of get(s, id)) {
      if (isShut(s, t) && !at(s.actors, t.x, t.y)) walls.push([t.x, t.y]);
    }
  }
  for (const t of get(s, 'fixture.crumble')) {
    if (!s.collapsed[t.params.id]) walls.push([t.x, t.y]);
  }
  for (const { x, y } of Object.values(s.crates)) walls.push([x, y]);
  s.walls = walls;
}

function controls(s, events = []) {
  for (const type of controlIds) {
    for (const t of get(s, type)) {
      const p = t.params;
      const actor = at(s.actors, t.x, t.y);
      const crate = !p.species && get(s, 'object.crate').find(c => tileKey(s.crates[c.params.id]) === tileKey(t));
      const pressed = Boolean(actor && fits(actor, p) || crate && fits({ level: crate.params.weight ?? 2 }, p));
      const rising = pressed && !s.pressed[p.id];
      s.pressed[p.id] = pressed;
      const before = s.flags[p.id];
      if (type === 'fixture.plate.hold' || type === 'fixture.plate.weight') s.flags[p.id] = pressed;
      if (type === 'fixture.latch' && rising) s.flags[p.id] = true;
      if (type === 'fixture.toggle' && rising) s.flags[p.id] = !before;
      if (type === 'fixture.sequence' && rising && !s.flags[p.groupId]) {
        const expected = (s.sequenceProgress[p.groupId] || 0) + 1;
        const progress = expected === p.step ? p.step : Number(p.step === 1);
        s.sequenceProgress[p.groupId] = progress;
        if (progress === s.layout.groups[p.groupId]) {
          s.flags[p.groupId] = true;
          events.push({ type: 'mechanism', key: p.groupId, active: true });
        }
      }
      if (before !== s.flags[p.id] && s.flags[p.id] !== undefined) {
        events.push({ type: 'mechanism', key: p.id, x: t.x, y: t.y, active: s.flags[p.id] });
      }
    }
  }
  for (const t of get(s, 'npc.owl')) {
    const p = t.params;
    const visitor = at(s.actors, t.x, t.y);
    if (s.flags[p.id] || !visitor || !fits(visitor, p)) continue;
    if (!s.actors.some(a => a.species === p.partner && Math.abs(a.x - t.x) + Math.abs(a.y - t.y) === 1)) continue;
    s.flags[p.id] = true;
    events.push({ type: 'companion', catalogId: t.catalogId, key: p.id, x: t.x, y: t.y, active: true });
  }
}

function canOccupyFrom(s, a, x, y, from=a) {
  for (const t of on(s, x, y)) {
    if (isShut(s, t)) return false;
    if (t.catalogId === 'terrain.water' && !canSwim(a)) return false;
    if (t.catalogId === 'terrain.tunnel' && !fits(a, t.params)) return false;
    if (t.catalogId === 'fixture.oneway' && (x!==from.x||y!==from.y) && letter(x - from.x, y - from.y) !== t.params.orientation) return false;
  }
  return true;
}

function canEnter(s,a,x,y,real=s){
  // D creates a virtual actor array as it traces births. Its last appended
  // virtual child is the true origin of the next edge, not the parent spike.
  const last=s!==real&&s.actors.length>real.actors.length?s.actors.at(-1):null;
  const source=s!==real?{...a,level:1,x:last?.x??a.x,y:last?.y??a.y}:a;
  if(!canOccupyFrom(s,source,x,y,source))return false;
  const dx=x-source.x,dy=y-source.y;
  if(Math.abs(dx)===1&&Math.abs(dy)===1){
    const blocked=(px,py,from)=>wall(s,px,py)||!gateAllows(s,source,px,py)||!canOccupyFrom(s,source,px,py,from);
    const p={x,y:source.y},q={x:source.x,y};
    if((blocked(p.x,p.y,source)||blocked(x,y,p))&&(blocked(q.x,q.y,source)||blocked(x,y,q)))return false;
  }
  return true;
}

function appliesField(s,a,t,heading){
 return Object.hasOwn(priority,t.catalogId)&&fits(a,t.params)
  &&(t.catalogId!=='fixture.burrow'||t.params.role==='entrance'&&t.params.orientation===letter(...heading))
  &&(t.catalogId!=='field.wave'||openPhase(s,t.params))
  &&(!['field.current','field.bubble','field.wave'].includes(t.catalogId)||canSwim(a));
}

function refreshDynamics(s,prior,events){
 for(const t of get(s,'fixture.crumble'))if(!s.collapsed[t.params.id]&&at(prior,t.x,t.y-1)&&!at(s.actors,t.x,t.y-1)){
   s.collapsed[t.params.id]=true;events.push({type:'crumble',key:t.params.id,x:t.x,y:t.y});
 }
 controls(s,events);syncWalls(s);
}

function movementPolicy(real,id,events,heading){
 let prior=real.actors.map(a=>({...a}));
 return {
  canEnter:(s,a,x,y)=>canEnter(s,a,x,y,real),
  canFall(s,a){
   const before=prior.find(v=>v.id===id),now=s.actors.find(v=>v.id===id);
   if(before&&now&&now.x===before.x&&now.y>before.y){heading[0]=0;heading[1]=1;}
   refreshDynamics(s,prior,events);prior=s.actors.map(v=>({...v}));
   if(a.id===id&&on(s,a.x,a.y).some(t=>appliesField(s,a,t,heading)))return false;
   return policy.canFall(s,a);
  }
 };
}

function physicalStep(s,id,dx,dy,events){
 const heading=[dx,dy],prior=s.actors.map(a=>({...a}));
 const result=externalMove(s,id,dx,dy,movementPolicy(s,id,events,heading));
 if(result.ok)refreshDynamics(s,prior,events);
 return {...result,heading};
}

const policy = {
  canEnter,
  canFall(s, a) {
    const tiles = on(s, a.x, a.y);
    return !(canSwim(a) && tiles.some(t => t.catalogId === 'terrain.water'))
      && !tiles.some(t => floatField(t) && fits(a, t.params) && (t.catalogId !== 'field.bubble' || canSwim(a)));
  }
};

function pushCrate(s, a, dx, dy, events) {
  const crate = get(s, 'object.crate').find(t => {
    const position = s.crates[t.params.id];
    return position.x === a.x + dx && position.y === a.y + dy;
  });
  if (!crate) return true;
  const from = s.crates[crate.params.id];
  const x = from.x + dx;
  const y = from.y + dy;
  if (Math.abs(dx) + Math.abs(dy) !== 1 || !fits(a, crate.params)
    || wall(s, x, y) || at(s.actors, x, y) || at(s.gates, x, y)
    || at(s.spikes, x, y) || at(s.exits, x, y)
    || on(s, x, y).some(t => isShut(s, t) || t.catalogId === 'terrain.water'
      || t.catalogId === 'fixture.oneway' && t.params.orientation !== letter(dx, dy))) return false;
  s.crates[crate.params.id] = { x, y };
  syncWalls(s);
  events.push({ type: 'push', id: a.id, crate: crate.params.id, from, to: { x, y } });
  return true;
}

function settleWithPolicy(s, id, events) {
  // The chapter's public settle hook accepts the same optional event context as move.
  return settle(s, { activeId: id, policy:movementPolicy(s,id,events,[0,1]), events: [], fired: new Set(), families: new Map(), family: 0 });
}

function updateBoard(s, prior, id, events) {
  for (const t of get(s, 'fixture.crumble')) {
    if (!s.collapsed[t.params.id] && at(prior, t.x, t.y - 1) && !at(s.actors, t.x, t.y - 1)) {
      s.collapsed[t.params.id] = true;
      events.push({ type: 'crumble', key: t.params.id, x: t.x, y: t.y });
    }
  }
  controls(s, events);
  syncWalls(s);
  if (!s.gravity) return;
  const before = s.actors.map(a => ({ ...a }));
  const falls = settleWithPolicy(s, id, events);
  if (falls.length) {
    events.push(...falls);
    updateBoard(s, before, id, events);
  }
}

function resolveFields(s, id, heading, events) {
  const seen = new Set();
  const warped = new Set();
  while (true) {
    const actor = s.actors.find(a => a.id === id);
    if (!actor) return true;
    const tile = on(s, actor.x, actor.y).filter(t => Object.hasOwn(priority, t.catalogId))
      .sort((a, b) => priority[a.catalogId] - priority[b.catalogId])
      .find(t => fits(actor, t.params)
        && (!travelTile(t) || !warped.has(t.params.pairId))
        && (t.catalogId !== 'fixture.burrow' || t.params.role === 'entrance' && t.params.orientation === letter(...heading))
        && (t.catalogId !== 'field.wave' || openPhase(s, t.params))
        && (!['field.current', 'field.bubble', 'field.wave'].includes(t.catalogId) || canSwim(actor)));
    if (!tile) return true;
    const signature = JSON.stringify([stateKey(s), actor.x, actor.y, actor.species, actor.level, heading, [...warped]]);
    if (seen.has(signature) || seen.size >= 128) return false;
    seen.add(signature);
    const before = s.actors.map(a => ({ ...a }));
    if (travelTile(tile)) {
      const target = get(s, tile.catalogId).find(t => t !== tile && t.params.pairId === tile.params.pairId);
      if (tile.catalogId === 'fixture.burrow' && target?.params.role !== 'exit') return true;
      if (!target || wall(s, target.x, target.y) || !gateAllows(s, actor, target.x, target.y)
        || !canEnter(s, actor, target.x, target.y) || at(s.actors, target.x, target.y)
        || at(s.gates, target.x, target.y) || at(s.exits, target.x, target.y) || at(s.spikes, target.x, target.y)) return true;
      warped.add(tile.params.pairId);
      events.push({ type: 'warp', catalogId: tile.catalogId, id, pair: tile.params.pairId, from: { x: actor.x, y: actor.y }, to: { x: target.x, y: target.y } });
      actor.x = target.x;
      actor.y = target.y;
    } else {
      const direction = orientations[tile.params.orientation] || (floatField(tile) ? orientations.N : heading);
      const destination = floatField(tile) ? cloneGameState(s) : s;
      const result = physicalStep(destination, id, ...direction, events);
      if (!result.ok) return result.reason !== 'gravity-cycle';
      // A lift that drops directly back into its own plume has reached its resting height.
      if (floatField(tile)) {
        if (stateKey(destination) === stateKey(s)) return true;
        Object.assign(s, destination);
      }
      heading = result.heading;
      events.push({ type: 'effect', id, catalogId: tile.catalogId, x: tile.x, y: tile.y, dx: direction[0], dy: direction[1] }, ...result.events);
    }
    updateBoard(s, before, id, events);
  }
}

export function gameMove(s, id, dx, dy) {
  const reject = reason => ({ ok: false, reason, events: [] });
  const origin = s.actors.find(a => a.id === id);
  if (!origin || !Number.isInteger(dx) || !Number.isInteger(dy) || Math.max(Math.abs(dx), Math.abs(dy)) !== 1) return reject('step');
  const q = cloneGameState(s);
  const events = [];
  if (!pushCrate(q, origin, dx, dy, events)) return reject('crate');
  const freeSwim = q.gravity && canSwim(origin) && has(q, origin.x, origin.y, 'terrain.water')
    && has(q, origin.x + dx, origin.y + dy, 'terrain.water');
  if (!freeSwim && !canAscend(q, origin, dx, dy)) return reject('foothold');
  const result = physicalStep(q, id, dx, dy, events);
  if (!result.ok) return reject(result.reason);

  // The whole forced chain uses the phase the player saw before committing the turn.
  events.push(...result.events);
  try {
    updateBoard(q, s.actors, id, events);
    if (!resolveFields(q, id, result.heading, events)) return reject('effect-cycle');
  } catch (error) {
    if (error.message === 'gravity-cycle') return reject('gravity-cycle');
    throw error;
  }
  q.moves++;
  syncWalls(q);
  if (mass(q) !== mass(s)) throw new Error('mass mismatch');
  Object.assign(s, q);
  return { ...result, events };
}

export const isComplete = complete;

export function stateKey(s) {
  const actors = s.actors.map(a => `${a.x},${a.y},${a.species},${a.level}`).sort().join(';');
  const flags = Object.entries(s.flags).filter(([, active]) => active).map(([id]) => id).sort().join(',');
  const plates = Object.entries(s.pressed).filter(([, active]) => active).map(([id]) => id).sort().join(',');
  const sequences = Object.keys(s.layout.groups).map(id => s.sequenceProgress[id] || 0).join(',');
  const crates = Object.values(s.crates).map(tileKey).join(';');
  const collapsed = Object.keys(s.collapsed).sort().join(',');
  return [actors, flags, plates, sequences, crates, collapsed, s.moves % s.layout.period].join('|');
}

const normalizedDirections = p => {
  const [dx, dy] = orientations[p.orientation] || [0, 0];
  return p.orientation ? { dx, dy, direction: p.orientation } : {};
};

export function describeTiles(boardOrState) {
  const s = boardOrState.layout ? boardOrState : createGameState(boardOrState);
  const base = new Set(s.baseWalls.map(p => where(...p)));
  const tiles = [];
  for (let y = 0; y < s.h; y++) {
    for (let x = 0; x < s.w; x++) {
      const id = base.has(where(x, y)) ? 'terrain.wall' : 'terrain.floor';
      if (id !== 'terrain.floor' || !has(s, x, y, 'terrain.ice') && !has(s, x, y, 'terrain.tunnel')) tiles.push({ catalogId: id, x, y, params: {} });
    }
  }
  for (const [type, fixtures] of [['fixture.spike', s.spikes], ['fixture.gate', s.gates], ['fixture.exit', s.exits]]) {
    for (const { x, y, open, ...params } of fixtures) {
      tiles.push({ catalogId: type, x, y, params: { ...params, ...(type === 'fixture.gate' ? { active: Boolean(open) } : {}) } });
    }
  }
  for (const t of s.layout.tiles) {
    const p = t.params;
    const position = t.catalogId === 'object.crate' ? s.crates[p.id] : t;
    const connection = p.connection || p.groupId || p.pairId || p.needs?.join('+') || p.any?.join('/') || p.id;
    const params = { ...p, ...normalizedDirections(p), connection };
    if (t.catalogId === 'fixture.door') params.active = doorOpen(s, p);
    if (t.catalogId === 'fixture.phase' || t.catalogId === 'field.wave') {
      params.active = openPhase(s, p);
      params.current = s.moves % p.period;
    }
    if (t.catalogId === 'fixture.crumble') params.active = !s.collapsed[p.id];
    if (controlIds.has(t.catalogId)) params.active = t.catalogId === 'fixture.sequence' ? Boolean(s.flags[p.groupId] || s.sequenceProgress[p.groupId] >= p.step) : Boolean(s.flags[p.id]);
    if (t.catalogId === 'fixture.signalLamp') params.active = Boolean(s.flags[p.needs?.[0]]);
    if (t.catalogId === 'npc.owl') params.active = Boolean(s.flags[p.id]);
    if (fieldIds.has(t.catalogId) && t.catalogId !== 'field.wave') params.active = true;
    tiles.push({ catalogId: t.catalogId, x: position.x, y: position.y, params });
  }
  return tiles;
}

function layerFor(id) {
  if (id === 'terrain.wall') return 'solid';
  if (id === 'terrain.water') return 'medium';
  if (terrain.has(id)) return 'ground';
  if (fieldIds.has(id)) return 'field';
  if (id === 'object.crate') return 'object';
  if (id === 'npc.owl') return 'npc';
  if (decoration.has(id)) return 'decoration';
  return 'fixture';
}

export function serializeBoard(boardOrState) {
  const board = boardOrState.layout ? {
    ...boardOrState,
    walls: boardOrState.baseWalls,
    gates: boardOrState.gates.map(({ open, ...gate }) => gate),
    actors: boardOrState.layout.initialActors,
    layout: undefined
  } : boardOrState;
  const instances = describeTiles(board).map((tile, i) => {
    const { id, connection, direction, dx, dy, active, current, needs, any, ...params } = tile.params;
    return { instanceId: id || `cell-${i + 1}`, catalogId: tile.catalogId, x: tile.x, y: tile.y, layer: layerFor(tile.catalogId), params };
  });
  const layout = prepare(board);
  const links = [];
  for (const t of layout.tiles) {
    for (const [kind, fromIds] of [['all', t.params.needs], ['any', t.params.any]]) {
      for (const from of fromIds || []) links.push({ from, fromPort: 'active', to: t.params.id, toPort: kind, type: 'boolean' });
    }
  }
  const logicNodes = Object.entries(layout.groups).map(([id, count]) => ({ id, op: 'SEQUENCE', inputCount: count }));
  for (const t of layout.byType['fixture.sequence'] || []) {
    links.push({ from: t.params.id, fromPort: 'press', to: t.params.groupId, toPort: String(t.params.step), type: 'event' });
  }
  return {
    schemaVersion: 1,
    registryVersion: '2.0.0-draft',
    rulesetVersion: 'time-hand-D-supported-v1-contact-v2-naopoyo-100-v1',
    board: { width: board.w, height: board.h, gravity: Boolean(board.gravity) },
    metadata: { title: board.title || board.id, boardId: board.id },
    instances,
    links,
    startActors: board.actors.map(a => ({ ...a })),
    exits: instances.filter(t => t.catalogId === 'fixture.exit').map(t => t.instanceId),
    routes: [],
    effectGroups: [],
    logicNodes
  };
}


export function deserializeBoard(data) {
  if (data?.schemaVersion !== 1 || data.registryVersion !== '2.0.0-draft'
    || data.rulesetVersion !== 'time-hand-D-supported-v1-contact-v2-naopoyo-100-v1'
    || data.board?.width !== 8 || data.board.height !== 8
    || !Array.isArray(data.instances) || data.instances.length>512 || !Array.isArray(data.startActors) || !data.startActors.length || data.startActors.length>64 || !Array.isArray(data.links)||data.links.length>512) {
    throw new Error('Invalid Naopoyo 100 stage exchange');
  }
  const validPosition = ({ x, y }) => Number.isInteger(x) && Number.isInteger(y) && x >= 0 && x < 8 && y >= 0 && y < 8;
  const safeId=id=>typeof id==='string'&&/^[A-Za-z0-9_-]{1,80}$/.test(id)&&!['__proto__','prototype','constructor','toString','valueOf','hasOwnProperty'].includes(id);
  const allowedParams=new Set(['exact','min','max','species','power','weight','orientation','period','phase','pairId','groupId','step','role','partner']);
  const species=['dog','frog','fish','penguin'];
  function validateParams(p,catalogId){
   if(!p||typeof p!=='object'||Array.isArray(p)||Object.keys(p).some(k=>!allowedParams.has(k)))throw Error('Invalid tile parameters');
   for(const k of ['exact','min','max','power','weight','step'])if(p[k]!==undefined&&(!Number.isInteger(p[k])||p[k]<1||p[k]>8))throw Error('Invalid numeric condition');
   if(p.min!==undefined&&p.max!==undefined&&p.min>p.max)throw Error('Invalid range');
   for(const k of ['species','partner'])if(p[k]!==undefined&&!species.includes(p[k]))throw Error('Invalid species');
   for(const k of ['pairId','groupId'])if(p[k]!==undefined&&!safeId(p[k]))throw Error('Invalid group');
   if(p.orientation!==undefined&&!Object.hasOwn(orientations,p.orientation))throw Error('Invalid direction');
   if(p.role!==undefined&&!['entrance','exit'].includes(p.role))throw Error('Invalid burrow role');
   if(['fixture.phase','field.wave'].includes(catalogId)&&(!Number.isInteger(p.period)||p.period<2||p.period>8||!Number.isInteger(p.phase)||p.phase<0||p.phase>=p.period))throw Error('Invalid period');
   if(['fixture.warp','fixture.burrow'].includes(catalogId)&&!safeId(p.pairId))throw Error('Missing paired route');
   if(catalogId==='fixture.sequence'&&(!safeId(p.groupId)||!Number.isInteger(p.step)))throw Error('Invalid sequence');
   if(catalogId==='fixture.spike'&&!Number.isInteger(p.power))throw Error('Invalid split power');
  }
  const board = {
    id: data.metadata?.boardId || 'imported-board', title: data.metadata?.title,
    w: 8, h: 8, gravity: Boolean(data.board.gravity), walls: [], gates: [], spikes: [], exits: [], tiles: [],
    actors: data.startActors.map(a => ({ ...a }))
  };
  const ids = new Set();
  const linked = new Map();
  const cells=new Set();
  for (const { instanceId, catalogId, x, y, params={} } of data.instances) {
    if (!Object.hasOwn(materialRules,catalogId) || !safeId(instanceId) || ids.has(instanceId) || !validPosition({ x, y })) throw new Error('Invalid tile');
    validateParams(params,catalogId);
    const signature=`${catalogId}:${x},${y}`;if(cells.has(signature))throw Error('Duplicate tile');cells.add(signature);
    ids.add(instanceId);
    if (catalogId === 'terrain.wall') board.walls.push([x, y]);
    else if (catalogId === 'fixture.exit') board.exits.push({ ...params, x, y });
    else if (catalogId === 'fixture.gate') board.gates.push({ ...params, x, y });
    else if (catalogId === 'fixture.spike') board.spikes.push({ ...params, x, y });
    else if (catalogId !== 'terrain.floor') {
      const tile = { catalogId, x, y, params: { ...params, id: instanceId } };
      board.tiles.push(tile);
      linked.set(instanceId, tile);
    }
  }
  const groups=new Set(board.tiles.filter(t=>t.catalogId==='fixture.sequence').map(t=>t.params.groupId));
  if([...groups].some(id=>ids.has(id)))throw Error('Group collides with instance');
  const sources=new Set([...groups,...board.tiles.filter(t=>controlIds.has(t.catalogId)||t.catalogId==='npc.owl').map(t=>t.params.id)]);
  for (const { from, to, toPort, type } of data.links) {
    if(!safeId(from)||!safeId(to))throw Error('Invalid circuit identity');
    if (type === 'event') {const source=linked.get(from);if(source?.catalogId!=='fixture.sequence'||source.params.groupId!==to||String(source.params.step)!==toPort)throw Error('Invalid sequence link');continue;}
    if(type!=='boolean'||!sources.has(from))throw Error('Unknown circuit source');
    const target = linked.get(to);
    if (!target || !['all', 'any'].includes(toPort)) throw new Error('Invalid circuit link');
    (target.params[toPort === 'all' ? 'needs' : 'any'] ??= []).push(from);
  }
  const actorIds=new Set(),actorCells=new Set();
  if (board.actors.some(a => {
    const invalid=!validPosition(a)||!species.includes(a.species)||!Number.isInteger(a.level)||a.level<1||a.level>8||!safeId(a.id)||actorIds.has(a.id)||actorCells.has(tileKey(a))||board.walls.some(([x,y])=>x===a.x&&y===a.y)||board.tiles.some(t=>t.x===a.x&&t.y===a.y&&t.catalogId==='object.crate');
    actorIds.add(a.id);actorCells.add(tileKey(a));return invalid;
  })||!board.exits.length)throw new Error('Invalid actor or missing exit');
  for(const type of ['fixture.warp','fixture.burrow']){
   const pairs=new Map();for(const t of board.tiles.filter(t=>t.catalogId===type))(pairs.get(t.params.pairId)||pairs.set(t.params.pairId,[]).get(t.params.pairId)).push(t);
   for(const pair of pairs.values())if(pair.length!==2||type==='fixture.burrow'&&(pair.filter(t=>t.params.role==='entrance').length!==1||pair.filter(t=>t.params.role==='exit').length!==1))throw Error('Invalid paired route');
  }
  return board;
}
