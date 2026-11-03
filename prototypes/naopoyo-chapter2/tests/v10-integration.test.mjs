import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {stages} from '../stages.mjs';import {ForestSession,visualActors} from '../session.mjs';
import {ForestProgress,KEY,QA_KEY} from '../progress.mjs';import {simulateSplit} from '../split-preview.mjs';
import * as E from '../../naopoyo-v2/engine.mjs';
const witnesses=JSON.parse(fs.readFileSync(new URL('../../../docs/naopoyo-v10-20261028/source-witnesses.json',import.meta.url))).stages;
test('V10 opts in every Chapter 2 stage without changing Chapter 1',async()=>{for(const s of stages)assert.equal(s.splitRules,'recombine-once-v1');const {stages:old}=await import('../../naopoyo-chapter1/stages.mjs');for(const s of old)assert.equal(s.splitRules,undefined);});
test('V9 clears migrate read-only; V9 boards and Undo remain isolated in normal and QA',()=>{
 for(const qa of [false,true]){const old='naopoyo.komorebi.gate-surface.20261026.v1'+(qa?'.qa':''),id=stages[8].id,raw=JSON.stringify({version:1,current:id,cleared:[id],unlocked:[id],boards:{[id]:{version:1,opaque:'v9'}}});const m=new Map([[old,raw],[old+'.board.'+id,'old-undo'],[old+'.cleared.'+stages[7].id,'1']]),storage={getItem:k=>m.get(k)||null,setItem:(k,v)=>m.set(k,v)},p=new ForestProgress(storage,{qa});assert.notEqual(p.actualKey,old);assert.ok(p.data.cleared.includes(id));assert.ok(p.data.cleared.includes(stages[7].id));assert.equal(p.data.boards[id],undefined);assert.ok(p.allowed(stages[9].id));p.clear(id);p.flush();assert.equal(m.get(old),raw);assert.equal(m.get(old+'.board.'+id),'old-undo');}
 assert.equal(KEY,'naopoyo.komorebi.contact-v2.20261030.v1');assert.equal(QA_KEY,KEY+'.qa');
});
test('V9 serialized board/history cannot restore into V10 session',()=>{const st=E.clone(stages[9]);delete st.splitRules;const old=new ForestSession(st),q=new ForestSession(stages[9],old.serialize());assert.equal(q.restored,false);});
for(const w of witnesses)test(`V10 ${w.number} saved B-once witness: preview, stability, session save/undo/retry`,()=>{
 const st=stages.find(s=>s.number===w.number);let q=new ForestSession(st);const initial=E.clone(q.state),totals=E.totals(q.state);
 for(const [i,p] of w.path.entries()){
  const a=q.state.actors.find(a=>a.x===p.at[0]&&a.y===p.at[1]);assert.ok(a,`actor ${i}`);assert.equal(a.level,p.level);const before=E.clone(q.state),serialized=q.serialize(),preview=simulateSplit(q.state,a.id,...p.d,q.policy());assert.equal(q.serialize(),serialized);
  assert.ok(q.begin(a.id,{x:a.x+.5,y:a.y+.5}));const r=q.travel({x:a.x+.5+p.d[0],y:a.y+.5+p.d[1]})[0];assert.ok(r.ok,`${i}: ${r.reason}`);q.end();if(preview)assert.deepEqual(preview.state,q.state);assert.deepEqual(E.totals(q.state),totals);assert.ok(E.validState(st,q.state));
  for(const v of q.state.actors)assert.ok(E.supportsAt(q.state,v.x,v.y+1,v,v.id));
  const saved=q.serialize(),restored=new ForestSession(st,saved);assert.ok(restored.restored);assert.deepEqual(restored.state,q.state);assert.ok(restored.undo());assert.deepEqual(restored.state,before);q=new ForestSession(st,saved);
 }
 assert.ok(E.complete(q.state));q.retry();assert.deepEqual(q.state,initial);assert.equal(q.history.length,0);
});

test('V10 stage20: the upper 1 reaches 5 before the number becomes 6',()=>{
 const data=JSON.parse(fs.readFileSync(new URL('../../../docs/naopoyo-v10-20261028/repro-source.json',import.meta.url)));
 const before={...data.before,splitRules:'recombine-once-v1'},after=E.clone(before),id=after.actors.find(a=>a.x===data.action.at[0]&&a.y===data.action.at[1]).id,r=E.move(after,id,...data.action.d);
 assert.ok(r.ok);assert.equal(r.events.filter(e=>e.type==='split').length,1);assert.ok(after.actors.some(a=>a.x===4&&a.y===6&&a.level===6));assert.ok(!after.actors.some(a=>a.x===4&&a.y===5));
 const q=new ForestSession(stages[9]);q.state=after;q.motion=[{before,after,events:r.events,id,dx:data.action.d[0],dy:data.action.d[1],elapsed:0,duration:340}];let saw5=false,sawChild=false,saw6=false;
 for(let i=0;i<=1000;i++){q.motion[0].elapsed=340*i/1000;const drawn=visualActors(q),body=drawn.find(a=>a.id===id),child=drawn.find(a=>a.id==='child2');if(body.level===5)saw5=true;if(child?.opacity>0){sawChild=true;assert.equal(child.level,1);}if(saw5&&body.level===6){saw6=true;assert.ok(!child||child.opacity===0||Math.hypot(body.x-child.x,body.y-child.y)<.01);}}
 assert.ok(saw5&&sawChild&&saw6);const saved=q.serialize();q.animate(1,true);assert.equal(q.motion.length,0);assert.equal(q.serialize(),saved);
});

test('V10 current with a V9 Undo snapshot is refused atomically',()=>{
 const st=stages[9],q=new ForestSession(st),saved=JSON.parse(q.serialize()),old=E.clone(saved.current);delete old.state.splitRules;saved.history=[old];
 const restored=new ForestSession(st,JSON.stringify(saved));assert.equal(restored.restored,false);assert.deepEqual(restored.state,q.state);assert.equal(restored.history.length,0);
});
