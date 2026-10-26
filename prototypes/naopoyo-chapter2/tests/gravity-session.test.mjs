import test from 'node:test';import assert from 'node:assert/strict';
import {ForestProgress,KEY,QA_KEY} from '../progress.mjs';import {ForestSession,visualActors} from '../session.mjs';import {stages} from '../stages.mjs';
const legacy='naopoyo.komorebi.pilot.20261024.v1';
test('new rules retain old normal/QA saves byte for byte and import progress only',()=>{
 for(const qa of [false,true]){
  const oldKey=legacy+(qa?'.qa':''),id=stages[6].id,old=JSON.stringify({version:1,cleared:[id],unlocked:[id],current:id,boards:{[id]:{version:1,old:true}},hints:{[id]:2},read:[]}),m=new Map([[oldKey,old],[oldKey+'.board.'+id,'old board']]);
  const p=new ForestProgress({getItem:k=>m.get(k)||null,setItem:(k,v)=>m.set(k,v)},{qa});
  assert.notEqual(p.actualKey,oldKey);assert.ok(p.data.cleared.includes(id));assert.ok(p.allowed(stages[7].id));assert.equal(p.data.current,id);assert.equal(p.data.boards[id],undefined);p.clear(id);assert.equal(m.get(oldKey),old);assert.equal(m.get(oldKey+'.board.'+id),'old board');
 }
 assert.notEqual(KEY,QA_KEY);
});
test('every chapter2 board explicitly selects supported physics',()=>{for(const s of stages)assert.equal(s.gravityRules,'supported-v1')});
test('newborn fragments animate from placement to their gravity landing',()=>{
 const stage={id:'child-fall',w:8,h:8,gravity:true,gravityRules:'supported-v1',walls:[[2,5]],gates:[],exits:[],spikes:[{x:3,y:4,power:3}],water:[],events:[],guests:[],actors:[{id:'a',x:2,y:4,level:6,species:'dog'}]},q=new ForestSession(stage);
 q.begin('a',{x:2.5,y:4.5});q.travel({x:3.5,y:4.5});const births=q.lastResults[0].children;
 const falling=births.find(b=>q.state.actors.find(a=>a.id===b.id)?.y>b.y);assert.ok(falling);
 const shown=visualActors(q).find(a=>a.id===falling.id);assert.equal(shown.y,falling.y);q.animate(400);assert.equal(visualActors(q).find(a=>a.id===falling.id).y,q.state.actors.find(a=>a.id===falling.id).y);
});
test('shipped stage19 transient child is visible between its birth and absorption',async()=>{
 const {readFileSync}=await import('node:fs');const data=JSON.parse(readFileSync(new URL('../../../docs/naopoyo-gate-v8-20261026/solutions.json',import.meta.url)));
 const stage=stages.find(s=>s.number===19),path=data.stages.find(s=>s.id===stage.id).path,q=new ForestSession(stage);let checked=0;
 for(const p of path){const a=q.state.actors.find(a=>a.x===p.at[0]&&a.y===p.at[1]);q.begin(a.id,{x:a.x+.5,y:a.y+.5});q.travel({x:a.x+.5+p.d[0],y:a.y+.5+p.d[1]});q.end();
  const f=q.motion[0],births=f.events.flatMap(e=>e.children||[]);for(const b of births.filter(b=>!f.after.actors.some(a=>a.id===b.id))){q.motion[0].elapsed=f.duration*.5;const drawn=visualActors(q).find(a=>a.id===b.id);assert.ok(drawn,'transient child '+b.id);assert.ok(drawn.opacity>0&&drawn.opacity<1);assert.ok(Number.isFinite(drawn.x)&&Number.isFinite(drawn.y));checked++;}q.animate(1000);
 }assert.ok(checked>0,'witness must exercise a transient fragment');
});
test('new physics fast/slow held drag matches across split and falling; one Undo restores start',()=>{
 const stage={id:'speed-split',w:8,h:8,gravity:true,gravityRules:'supported-v1',walls:[[2,5]],gates:[],exits:[],spikes:[{x:3,y:4,power:3}],water:[],events:[],guests:[],actors:[{id:'a',x:2,y:4,level:6,species:'dog'}]};
 const run=n=>{const q=new ForestSession(stage),before=structuredClone(q.state);q.begin('a',{x:2.5,y:4.5});for(let i=1;i<=n;i++)q.travel({x:2.5+3*i/n,y:4.5});q.end();assert.equal(q.history.length,1);return{q,before};};
 const fast=run(1),slow=run(60);assert.deepEqual(fast.q.state,slow.q.state);assert.deepEqual(fast.q.history,slow.q.history);assert.ok(fast.q.motion.some(f=>f.events.some(e=>e.type==='split')));assert.ok(fast.q.motion.some(f=>f.events.some(e=>e.type==='fall')));assert.ok(fast.q.undo());assert.deepEqual(fast.q.state,fast.before);
});
