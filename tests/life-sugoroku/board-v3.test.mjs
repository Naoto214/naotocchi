import test from 'node:test';
import assert from 'node:assert/strict';
import {BOARD} from '../../prototypes/life-sugoroku/data.mjs';
import {terrainSvg,tileSvg} from '../../prototypes/life-sugoroku/board-art.mjs';

test('48 playable places carry distinct world geography and legible spacing',()=>{
 assert.equal(BOARD.length,48);
 for(const n of BOARD){assert.ok(n.worldRegion,`node ${n.id}: world geography`);assert.ok(n.surface);assert.ok(n.x>=35&&n.x<=865&&n.y>=40&&n.y<=750);for(const b of BOARD)if(n.id!==b.id)assert.ok(Math.hypot(n.x-b.x,n.y-b.y)>=48,`${n.id}/${b.id} overlap`);}
 assert.equal(BOARD[0].worldRegion,'home');
});
test('every directed node is reachable, every fork retains four steps per arm',()=>{
 for(const start of BOARD){const seen=new Set(),pending=[start.id];while(pending.length){const id=pending.pop();if(seen.has(id))continue;seen.add(id);pending.push(...BOARD[id].next);}assert.equal(seen.size,48);}
 for(let base=0;base<48;base+=12){assert.deepEqual(BOARD[base+1].next,[base+2,base+6]);for(const arm of [base+2,base+6]){let id=arm,count=0;while(id!==base+10&&count<10){id=BOARD[id].next[0];count++;}assert.equal(count,4);}assert.deepEqual(BOARD[base+11].next,[(base+12)%48]);}
});
test('normal tiles hide numbers; explicit debug reveals audit number',()=>{
 assert.doesNotMatch(tileSvg(BOARD[0]),/class="tile-number"|>1<\/text>/);
 assert.match(tileSvg(BOARD[0],undefined,undefined,{debug:true}),/class="tile-number"/);
});
test('terrain draws separate rivers, a source lake, mountain ranges and a watershed',()=>{
 const art=terrainSvg();for(const id of ['tenryu','shonai','source-lake','west-range','east-range','divide','bay','coast'])assert.match(art,new RegExp(`data-feature="${id}"`));
 assert.doesNotMatch(art,/draft|https?:/i);
});

import {TILE_SCHEMA,tileDefinition} from '../../prototypes/life-sugoroku/tiles.mjs';
import {JAPAN_STAGE,getStage} from '../../prototypes/life-sugoroku/stages.mjs';
import {EVENTS} from '../../prototypes/life-sugoroku/data.mjs';
import {createGame,dispatch} from '../../prototypes/life-sugoroku/engine.mjs';
const landOn=(id,{rounds=15,charm=false,full=false}={})=>{
 const s=createGame({seed:103,rounds,players:Array.from({length:4},()=>({character:{id:'dog',label:'いぬ'},human:true}))});
 const before=BOARD.find(n=>n.next.includes(id)),p=s.players[0];p.pos=before.id;p.walkPath=[before.id];p.charm=charm;p.stage=4;if(full)p.items=['clock','slow','double'];
 s.phase=before.next.length===1?'moving':'branch';s.pending={dice:[1],remaining:1,path:[before.id],staged:true};
 return dispatch(s,{type:s.phase==='branch'?'branch':'step',to:id,revision:s.revision});
};
test('all 48 visual meanings match real landing effects across all round modes',()=>{
 const literal={plus:[2,5],minus:[-2,-5],facility:[3,3],item:[2,0]};
 for(const rounds of [10,15,20])for(const n of BOARD){
  const tile=tileDefinition(n.type),svg=tileSvg(n),s=landOn(n.id,{rounds}),p=s.players[0];
  assert.ok(svg.includes(`fill="${tile.fill}"`));assert.ok(svg.includes(`data-shape="${tile.shape}"`));assert.ok(svg.includes(`>${tile.icon}</text>`));
  if(literal[n.type]){let [sd,money]=literal[n.type];if(rounds===20&&sd>0)sd=Math.floor(sd*.75);assert.equal(p.sodachi,20+sd,`${n.id} ${rounds} growth`);assert.equal(p.money,20+money,`${n.id} ${rounds} money`);assert.equal(tile.effect.money,literal[n.type][1]);assert.equal(tile.effect.sodachi,literal[n.type][0]);}
  else {assert.equal(s.phase,'event',`${n.id}: event tile opens an event`);const e=EVENTS.find(e=>e.id===s.pending.eventId);if(n.type==='fate')assert.equal(e.category,'fate');if(n.type==='social')assert.equal(e.category,'friend');}
 }
});
test('negative tile protection and full item inventory match their explanations',()=>{
 const minus=landOn(3,{charm:true});assert.equal(minus.players[0].money,20);assert.equal(minus.players[0].sodachi,20);assert.equal(minus.players[0].charm,false);
 const item=landOn(4,{full:true});assert.equal(item.players[0].money,25);assert.equal(item.players[0].sodachi,22);assert.equal(item.players[0].items.length,3);assert.equal(item.pending.delta.money,5);
});
test('roads have no false junctions and all edges are drawn exactly once',()=>{
 const edges=BOARD.flatMap(n=>n.next.map(to=>[n,BOARD[to]])),cross=(a,b,c)=>(b.x-a.x)*(c.y-a.y)-(b.y-a.y)*(c.x-a.x),svg=terrainSvg();
 assert.equal(edges.length,52);assert.equal((svg.match(/data-edge=/g)||[]).length,52);
 for(let i=0;i<edges.length;i++)for(let j=i+1;j<edges.length;j++){const[a,b]=edges[i],[c,d]=edges[j];if(new Set([a.id,b.id,c.id,d.id]).size<4)continue;assert.ok(!(cross(a,b,c)*cross(a,b,d)<0&&cross(c,d,a)*cross(c,d,b)<0),`${a.id}-${b.id} crosses ${c.id}-${d.id}`);}
});
test('stage registration resolves only the implemented Japan stage',()=>{
 assert.equal(getStage().id,'meguru-japan');assert.throws(()=>getStage('overseas'),RangeError);
 assert.deepEqual(JAPAN_STAGE.assets.overseasAssets,[]);assert.equal(JAPAN_STAGE.board.nodeCount,BOARD.length);
 for(const n of BOARD)assert.ok(JAPAN_STAGE.geography.worldRegions.includes(n.worldRegion));
 assert.throws(()=>tileDefinition('unknown'),RangeError);
});

test('new Japan games draw events from landscape while migrated V2 keeps its old pool',async()=>{const {eligibleEvents}=await import('../../prototypes/life-sugoroku/engine.mjs');const s=createGame({players:Array.from({length:4},()=>({character:{id:'dog'},human:true}))});s.players[0].stage=5;s.players[0].pos=14;assert.equal(BOARD[14].worldRegion,'forest');assert.equal(BOARD[14].region,'sea');assert.ok(eligibleEvents(s).every(e=>e.regions.includes('forest')));s.rulesVersion=2;assert.ok(eligibleEvents(s).every(e=>e.regions.includes('sea')));});
