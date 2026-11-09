import test from 'node:test';
import assert from 'node:assert/strict';
import { createGameState, describeTiles, deserializeBoard, gameMove, isComplete, serializeBoard, stateKey } from '../prototypes/naopoyo-100/engine.mjs';
import {solve,findWitness} from '../prototypes/naopoyo-100/solver.mjs';

const dog = (x, y, level = 1, id = 'dog') => ({ x, y, level, id, species: 'dog' });
const frog = (x, y, level = 1) => ({ ...dog(x, y, level, 'frog'), species: 'frog' });
const fish = (x, y, level = 1) => ({ ...dog(x, y, level, 'fish'), species: 'fish' });
const tile = (catalogId, x, y, params = {}) => ({ catalogId, x, y, params });
const board = (actors, extra = {}) => ({ id: 'test', w: 8, h: 8, actors, walls: [], spikes: [], gates: [], exits: [], gravity: false, tiles: [], ...extra });
const where = (s, id) => {
  const { x, y, level } = s.actors.find(a => a.id === id);
  return [x, y, level];
};

test('D creates children rearward and then turns clockwise along the wall', () => {
  const s = createGameState(board([dog(4, 4, 4)], {
    walls: [[2, 4]],
    spikes: [{ x: 5, y: 4, power: 3 }]
  }));
  assert.equal(gameMove(s, 'dog', 1, 0).ok, true);
  assert.deepEqual(s.actors.map(({ x, y, level }) => [x, y, level]), [[5, 4, 1], [4, 4, 1], [3, 4, 1], [3, 3, 1]]);
});

test('an invalid merge at a numbered gate leaves all dynamic fields untouched', () => {
  const s = createGameState(board([dog(2, 3, 2), dog(3, 3, 2, 'other')], {
    gates: [{ x: 3, y: 3, exact: 2, open: true }]
  }));
  const snapshot = structuredClone(s);
  assert.equal(gameMove(s, 'dog', 1, 0).ok, false);
  assert.deepEqual(s, snapshot);
});

test('a linked door stays open only while a qualifying actor holds its plate', () => {
  const s = createGameState(board([dog(2, 3), frog(1, 1)], { tiles: [
    tile('fixture.plate.hold', 2, 1, { id: 'P', species: 'frog' }),
    tile('fixture.door', 3, 3, { id: 'D', needs: ['P'] })
  ] }));
  assert.equal(gameMove(s, 'dog', 1, 0).ok, false);
  assert.equal(gameMove(s, 'frog', 1, 0).ok, true);
  assert.equal(gameMove(s, 'dog', 1, 0).ok, true);
  assert.equal(gameMove(s, 'frog', -1, 0).ok, true);
  assert.equal(gameMove(s, 'dog', 1, 0).ok, true);
  assert.equal(gameMove(s, 'dog', -1, 0).ok, false);
  assert.equal(describeTiles(s).find(t => t.catalogId === 'fixture.door').params.active, false);
});

test('sequence resets on wrong order and then retains a correct pair', () => {
  const s = createGameState(board([dog(1, 2)], { tiles: [
    tile('fixture.sequence', 2, 2, { id: 'A', groupId: 'S', step: 1 }),
    tile('fixture.sequence', 4, 2, { id: 'B', groupId: 'S', step: 2 }),
    tile('fixture.door', 5, 2, { id: 'D', needs: ['S'] })
  ] }));
  for (const dx of [1, 1, 1, 1]) assert.equal(gameMove(s, 'dog', dx, 0).ok, true);
  assert.equal(describeTiles(s).find(t => t.catalogId === 'fixture.door').params.active, true);
});

test('a crate pushes one cardinal cell and can hold a plate when its weight qualifies', () => {
  const s = createGameState(board([dog(1, 2, 2)], { tiles: [
    tile('object.crate', 2, 2, { id: 'C', min: 2, weight: 2 }),
    tile('fixture.plate.weight', 3, 2, { id: 'P', exact: 2 }),
    tile('fixture.door', 4, 2, { id: 'D', needs: ['P'] })
  ] }));
  assert.equal(gameMove(s, 'dog', 1, 0).ok, true);
  assert.equal(describeTiles(s).find(t => t.catalogId === 'object.crate').x, 3);
  assert.equal(describeTiles(s).find(t => t.catalogId === 'fixture.door').params.active, true);
});

test('one-way passage checks entry direction, and water filters the actor species', () => {
  const s = createGameState(board([dog(1, 2), fish(3, 2)], { tiles: [
    tile('fixture.oneway', 2, 2, { id: 'O', orientation: 'E' }),
    tile('terrain.water', 4, 2)
  ] }));
  assert.equal(gameMove(s, 'fish', -1, 0).ok, false);
  assert.equal(gameMove(s, 'dog', 1, 0).ok, true);
  assert.equal(gameMove(s, 'fish', 1, 0).ok, true);
  assert.equal(gameMove(s, 'dog', 1, 0).ok, true);
  assert.equal(gameMove(s, 'dog', 1, 0).ok, false);
});

test('ice continues heading through multiple tiles and stops on solid ground', () => {
  const s = createGameState(board([dog(1, 3)], { tiles: [
    tile('terrain.ice', 2, 3), tile('terrain.ice', 3, 3), tile('terrain.ice', 4, 3)
  ] }));
  const result = gameMove(s, 'dog', 1, 0);
  assert.equal(result.ok, true);
  assert.deepEqual(where(s, 'dog'), [5, 3, 1]);
  assert.equal(s.moves, 1);
});

test('a wind-induced loop rejects the whole move and its turn increment', () => {
  const s = createGameState(board([dog(1, 3)], { tiles: [
    tile('field.wind', 2, 3, { orientation: 'E' }),
    tile('field.wind', 3, 3, { orientation: 'W' })
  ] }));
  const saved = structuredClone(s);
  assert.equal(gameMove(s, 'dog', 1, 0).reason, 'effect-cycle');
  assert.deepEqual(s, saved);
});

test('a water current carries fish through a normal numbered rescue', () => {
  const s = createGameState(board([fish(1, 3, 2)], {
    exits: [{ x: 4, y: 3, species: 'fish', exact: 2 }],
    tiles: [
      tile('terrain.water', 2, 3), tile('terrain.water', 3, 3),
      tile('field.current', 2, 3, { orientation: 'E' }),
      tile('field.current', 3, 3, { orientation: 'E' })
    ]
  }));
  assert.equal(gameMove(s, 'fish', 1, 0).ok, true);
  assert.equal(isComplete(s), true);
  assert.equal(s.rescuedBySpecies.fish, 2);
});

test('an updraft raises a qualifying actor against supported gravity', () => {
  const s = createGameState(board([dog(1, 5, 2)], { gravity: true, walls: [[1, 6], [2, 6]], tiles: [
    tile('field.updraft', 2, 5, { min: 2 }), tile('field.updraft', 2, 4, { min: 2 }),
    tile('field.updraft', 2, 3, { min: 2 })
  ] }));
  assert.equal(gameMove(s, 'dog', 1, 0).ok, true);
  assert.deepEqual(where(s, 'dog'), [2, 3, 2]);
});

test('paired warp reserves a blocked receiving cell and never pings back', () => {
  const s = createGameState(board([dog(1, 3), frog(5, 3)], { tiles: [
    tile('fixture.warp', 2, 3, { id: 'W1', pairId: 'W' }),
    tile('fixture.warp', 5, 3, { id: 'W2', pairId: 'W' })
  ] }));
  assert.equal(gameMove(s, 'dog', 1, 0).ok, true);
  assert.deepEqual(where(s, 'dog'), [2, 3, 1]);
  assert.equal(gameMove(s, 'frog', 1, 0).ok, true);
  assert.equal(gameMove(s, 'dog', -1, 0).ok, true);
  assert.equal(gameMove(s, 'dog', 1, 0).ok, true);
  assert.deepEqual(where(s, 'dog'), [5, 3, 1]);
});

test('phase is read before the next accepted step; failed input consumes no turn', () => {
  const s = createGameState(board([dog(1, 3)], { tiles: [tile('fixture.phase', 2, 3, { period: 3, phase: 1 })] }));
  assert.equal(gameMove(s, 'dog', 1, 0).ok, false);
  assert.equal(s.moves, 0);
  assert.equal(gameMove(s, 'dog', 0, 1).ok, true);
  assert.equal(gameMove(s, 'dog', 1, -1).ok, true);
});

test('crumble removes abandoned support and cloned Undo remains independently usable', () => {
  const s = createGameState(board([dog(1, 3)], { gravity: true, walls: [[2, 4]], tiles: [
    tile('fixture.crumble', 1, 4, { id: 'C' })
  ] }));
  const undo = structuredClone(s);
  assert.equal(gameMove(s, 'dog', 1, 0).ok, true);
  assert.equal(describeTiles(s).find(t => t.catalogId === 'fixture.crumble').params.active, false);
  assert.equal(describeTiles(undo).find(t => t.catalogId === 'fixture.crumble').params.active, true);
  assert.notEqual(stateKey(s), stateKey(undo));
});

test('exchange JSON separates catalog, actor and circuit data', () => {
  const s = createGameState(board([dog(1, 3)], { tiles: [
    tile('fixture.latch', 1, 2, { id: 'P' }),
    tile('fixture.door', 2, 3, { id: 'D', needs: ['P'] })
  ], exits: [{ x: 3, y: 3, species: 'dog', exact: 1 }] }));
  const data = serializeBoard(s);
  assert.deepEqual(data.board, { width: 8, height: 8, gravity: false });
  assert.equal(data.startActors[0].id, 'dog');
  assert.equal(data.instances.filter(t => t.catalogId === 'terrain.floor').length, 64);
  assert.deepEqual(data.links.map(({ from, to }) => [from, to]), [['P', 'D']]);
  assert.equal(data.instances.find(t => t.catalogId === 'fixture.exit').params.exact, 1);
});


test('an exchange round trip preserves mixed circuit, species and directional configuration', () => {
  const original = board([dog(1, 2, 2), fish(1, 4)], { gravity: true, tiles: [
    tile('object.crate', 3, 3, { id: 'C', weight: 3 }),
    tile('fixture.sequence', 2, 2, { id: 'P', groupId: 'Q', step: 1, exact: 2 }),
    tile('fixture.latch', 4, 2, { id: 'L' }),
    tile('fixture.door', 3, 2, { id: 'D', needs: ['Q'], any: ['L'] }),
    tile('terrain.water', 2, 4),
    tile('field.current', 2, 4, { orientation: 'E' })
  ], exits: [{ x: 3, y: 4, species: 'fish', exact: 1 }] });
  const exchange = serializeBoard(original);
  assert.deepEqual(serializeBoard(deserializeBoard(JSON.parse(JSON.stringify(exchange)))), JSON.parse(JSON.stringify(exchange)));
});

test('burrow sends a fitting actor into an empty tunnel only in its marked direction', () => {
  const s = createGameState(board([dog(2, 3)], { walls: [[4, 3]], tiles: [
    tile('fixture.burrow', 3, 3, { pairId: 'A', role: 'entrance', orientation: 'E', max: 1 }),
    tile('fixture.burrow', 5, 3, { pairId: 'A', role: 'exit' }),
    tile('terrain.tunnel', 5, 3, { max: 1 })
  ] }));
  assert.equal(gameMove(s, 'dog', 1, 0).ok, true);
  assert.deepEqual(where(s, 'dog'), [5, 3, 1]);
  assert.equal(gameMove(s, 'dog', 1, 0).ok, true);
  assert.equal(gameMove(s, 'dog', -1, 0).ok, true);
  assert.deepEqual(where(s, 'dog'), [5, 3, 1]);
});

test('the tide travels only at its active phase, using the phase visible before the move', () => {
  const s = createGameState(board([fish(1, 3)], { tiles: [
    tile('terrain.water', 2, 3),
    tile('field.wave', 2, 3, { orientation: 'E', period: 2, phase: 1 })
  ] }));
  assert.equal(gameMove(s, 'fish', 1, 0).ok, true);
  assert.deepEqual(where(s, 'fish'), [2, 3, 1]);
  assert.equal(gameMove(s, 'fish', -1, 0).ok, true);
  assert.equal(gameMove(s, 'fish', 0, 1).ok, true);
  assert.equal(gameMove(s, 'fish', 1, -1).ok, true);
  assert.deepEqual(where(s, 'fish'), [3, 3, 1]);
});

test('owl help latches only with its visitor and a neighboring specified partner', () => {
  const s = createGameState(board([dog(1, 3), frog(2, 5)], { tiles: [
    tile('npc.owl', 2, 3, { id: 'O', species: 'dog', partner: 'frog' }),
    tile('fixture.door', 3, 3, { id: 'D', needs: ['O'] })
  ] }));
  assert.equal(gameMove(s, 'dog', 1, 0).ok, true);
  assert.equal(gameMove(s, 'dog', 1, 0).ok, false);
  assert.equal(gameMove(s, 'frog', 0, -1).ok, true);
  assert.equal(gameMove(s, 'dog', 1, 0).ok, true);
  assert.equal(s.flags.O, true);
});

test('species-blocked orthogonal water prevents diagonal corner cutting',()=>{
 const s=createGameState(board([dog(1,1)],{tiles:[tile('terrain.water',2,1),tile('terrain.water',1,2)]}));
 assert.equal(gameMove(s,'dog',1,1).ok,false);
});
test('D births use each actual trace edge for a directional passage',()=>{
 const s=createGameState(board([dog(4,4,3)],{spikes:[{x:5,y:4,power:2}],tiles:[tile('fixture.oneway',3,4,{orientation:'W'})]}));
 assert.equal(gameMove(s,'dog',1,0).ok,true);
 assert.ok(s.actors.some(a=>a.x===3&&a.y===4&&a.level===1));
});
test('overflow staying in an already occupied one-way origin is not a fresh entry',()=>{
 const s=createGameState(board([dog(2,3,8),dog(3,3,8,'other')],{tiles:[tile('fixture.oneway',2,3,{orientation:'E'})]}));
 assert.equal(gameMove(s,'dog',1,0).ok,true);
 assert.equal(s.actors.length,2);
});
test('vacating a hold plate closes its door before a subsequent gravity step',()=>{
 const s=createGameState(board([fish(2,2)],{gravity:true,exits:[{x:2,y:5,exact:1}],tiles:[tile('terrain.water',2,2),tile('fixture.plate.hold',2,2,{id:'P'}),tile('fixture.door',2,4,{id:'D',needs:['P']})]}));
 assert.equal(gameMove(s,'fish',0,1).ok,true);
 assert.equal(isComplete(s),false);assert.deepEqual(where(s,'fish'),[2,3,1]);assert.equal(s.flags.P,false);
});
test('falling across a latch records contact before leaving it',()=>{
 const s=createGameState(board([dog(1,2)],{gravity:true,walls:[[1,3],[2,6]],tiles:[tile('fixture.latch',2,3,{id:'P'})]}));
 assert.equal(gameMove(s,'dog',1,0).ok,true);assert.equal(s.flags.P,true);
});
test('wind and warp activate before the controlled actor falls past their entry',()=>{
 for(const kind of ['field.wind','fixture.warp']){
  const tiles=kind==='field.wind'?[tile(kind,2,2,{orientation:'E'})]:[tile(kind,2,2,{pairId:'W'}),tile(kind,3,2,{pairId:'W'})];
  const s=createGameState(board([dog(1,2)],{gravity:true,walls:[[1,3],[3,3]],tiles}));
  assert.equal(gameMove(s,'dog',1,0).ok,true);assert.deepEqual(where(s,'dog'),[3,2,1]);
 }
});
test('equal-overflow wind progression is not mistaken for a field cycle',()=>{
 const s=createGameState(board([dog(1,3,8),dog(2,3,8,'b'),dog(3,3,8,'c')],{exits:[{x:4,y:3,exact:8}],tiles:[tile('field.wind',2,3,{orientation:'E'}),tile('field.wind',3,3,{orientation:'E'})]}));
 assert.equal(gameMove(s,'dog',1,0).ok,true);assert.equal(s.rescued,8);
});
test('ice uses the direction of landing after a fall',()=>{
 const s=createGameState(board([dog(1,2)],{gravity:true,walls:[[1,3],[2,4]],exits:[{x:3,y:3}],tiles:[tile('terrain.ice',2,3)]}));
 assert.equal(gameMove(s,'dog',1,0).ok,true);assert.equal(s.rescued,0);assert.deepEqual(where(s,'dog'),[2,3,1]);
});
test('search caps preserve adjacent goal detection and never claim depth truncation exhausted',()=>{
 const b=board([dog(1,1)],{exits:[{x:1,y:2,exact:1}]});
 assert.equal(solve(b,{limit:1,maxDepth:1}).status,'shortest');
 const distant=board([dog(1,1)],{exits:[{x:3,y:3,exact:1}]});
 assert.equal(findWitness(distant,{maxDepth:1}).status,'limit');
});
test('exchange rejects invented sources, empty actors, parameter coordinates and prototype names',()=>{
 const data=serializeBoard(board([dog(1,2)],{tiles:[tile('fixture.latch',2,2,{id:'P'}),tile('fixture.door',3,2,{id:'D',needs:['P']})],exits:[{x:4,y:2,exact:1}]}));
 for(const mutate of [d=>d.links[0].from='constructor',d=>d.startActors=[],d=>d.instances.find(t=>t.catalogId==='fixture.exit').params.x=123,d=>d.instances[0].catalogId='toString',d=>d.startActors.push({...d.startActors[0]}),d=>d.instances.find(t=>t.catalogId==='fixture.door').instanceId='__proto__']){
  const invalid=structuredClone(data);mutate(invalid);assert.throws(()=>deserializeBoard(invalid));
 }
});
