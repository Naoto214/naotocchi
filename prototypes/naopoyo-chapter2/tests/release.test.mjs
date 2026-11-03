import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {stages} from '../stages.mjs';
import {ForestSession} from '../session.mjs';
import {ForestProgress,KEY} from '../progress.mjs';
import {ExamplePosition} from '../example-position.mjs';
import {ExampleReplay} from '../example-replay.mjs';
import {complete,mass,totals,validState} from '../../naopoyo-v2/engine.mjs';
const OLD='naopoyo.komorebi.recombine-once.20261028.v1';
const memory=(entries=[])=>{const data=new Map(entries);return {data,getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v)}};
const answer=s=>JSON.parse(fs.readFileSync(new URL(`../examples/${s.number}.json`,import.meta.url))).path;
test('release enables contact-v2 for all ten unchanged chapter2 boards',()=>{
 assert.equal(stages.length,10);for(const s of stages)assert.equal(s.movementRules,'contact-v2');
 assert.notEqual(KEY,OLD);
});
test('example cursor identity includes stage, answer and physics rule',()=>{
 const m=memory(),s=stages[9],path=answer(s);
 new ExamplePosition(m,s.id,path,'contact-v1').save(50);
 const next=new ExamplePosition(m,s.id,path,'contact-v2');assert.equal(next.index,0);next.save(51);
 assert.equal(new ExamplePosition(m,s.id,path,'contact-v2').index,51);
 assert.equal(new ExamplePosition(m,s.id,path,'contact-v1').index,0);
 assert.equal(new ExamplePosition(m,stages[8].id,path,'contact-v2').index,0);
 const altered=structuredClone(path);altered[0].level++;
 assert.equal(new ExamplePosition(m,s.id,altered,'contact-v2').index,0);
});
test('old V11/V12 boards and Undo survive byte-for-byte, only progress migrates',()=>{
 const s=stages[0],legacy=new ForestSession({...s,movementRules:'contact-v1'});
 const step=answer(s)[0],a=legacy.state.actors.find(a=>a.x===step.at[0]&&a.y===step.at[1]);
 legacy.begin(a.id,{x:a.x+.5,y:a.y+.5});legacy.travel({x:a.x+.5+step.d[0],y:a.y+.5+step.d[1]});legacy.end();
 const raw=legacy.serialize();assert.equal(legacy.history.length,1);
 const entries=[[OLD,JSON.stringify({version:1,current:s.id,cleared:[s.id],unlocked:[s.id],boards:{[s.id]:JSON.parse(raw)}})],[OLD+'.board.'+s.id,raw],[OLD+'.cleared.'+s.id,'1'],['naotocchi-save','sentinel'],['card-save','sentinel']];
 const m=memory(entries),p=new ForestProgress(m);
 assert.ok(p.data.cleared.includes(s.id));assert.ok(p.allowed(stages[1].id));
 assert.equal(p.data.boards[s.id],undefined);
 assert.equal(new ForestSession(s,raw).restored,false);
 p.board(s.id,JSON.parse(new ForestSession(s).serialize()));p.clear(stages[1].id);
 for(const [k,v] of entries)assert.equal(m.getItem(k),v,k);
});
test('corrupt current board is retained before replacement; append-only clears survive',()=>{
 const s=stages[0],m=memory([[KEY+'.board.'+s.id,'{damaged'],[KEY+'.cleared.'+s.id,'1']]);
 const p=new ForestProgress(m);assert.ok(p.allowed(stages[1].id));
 p.board(s.id,JSON.parse(new ForestSession(s).serialize()));
 assert.equal(m.getItem(KEY+'.board.'+s.id+'.damaged'),'{damaged');
 assert.ok(new ForestProgress(m).data.cleared.includes(s.id));
});
for(const [i,s] of stages.entries())test(`release ${s.number}: exact witness, normal input, restore and Undo every step`,()=>{
 const path=answer(s);assert.equal(path.length,[5,5,10,11,23,38,26,19,78,97][i]);
 const replay=new ExampleReplay(s,path),q=new ForestSession(s),start=totals(q.state);
 for(const [n,step] of path.entries()){
  const before=q.snapshot(),a=q.state.actors.find(a=>a.x===step.at[0]&&a.y===step.at[1]);assert.equal(a.level,step.level);
  const p={x:a.x+.5,y:a.y+.5};assert.ok(q.begin(a.id,p));const r=q.travel({x:p.x+step.d[0],y:p.y+step.d[1]});q.end();assert.ok(r.length===1&&r[0].ok);
  assert.equal(q.state.moves,n+1);assert.deepEqual(totals(q.state),start);assert.ok(validState(s,q.state));
  replay.next();assert.deepEqual(q.state,replay.session.state);
  const restored=new ForestSession(s,q.serialize());assert.ok(restored.restored);assert.deepEqual(restored.state,q.state);assert.ok(restored.undo());assert.deepEqual(restored.snapshot(),before);assert.equal(restored.paused,false);
  replay.previous();assert.deepEqual(replay.session.state,before.state);replay.next();
 }
 assert.ok(complete(q.state));assert.equal(q.state.rescued,mass(q.state));if(s.number===20)assert.equal(q.state.rescued,16);
});
test('official chapter1 completion opens chapter2 and its complete runtime ships',()=>{
 const first=fs.readFileSync(new URL('../../naopoyo-chapter1/app.mjs',import.meta.url),'utf8');
 assert.ok(first.includes('href="../naopoyo-chapter2/index.html"'));
 assert.ok(!first.includes('第2章「風の森」は、これからのお楽しみ。'));
 const root=new URL('../../../',import.meta.url),manifest=JSON.parse(fs.readFileSync(new URL('tools/pages/allowlist.json',root)));
 for(const name of ['index.html','app.mjs','stages.mjs','expansion-stages.mjs','progress.mjs','session.mjs','render.mjs','style.css','split-motion.mjs','split-preview.mjs','contact-motion.mjs','example-replay.mjs','example-ui.mjs','example-position.mjs','example-clock.mjs',...stages.map(s=>`examples/${s.number}.json`)])assert.ok(manifest.files.includes('prototypes/naopoyo-chapter2/'+name),name);
 assert.ok(!manifest.files.some(p=>/chapter2\/(qa.html|contact-comparison\/)/.test(p)));
});
test('malformed legacy summary still recovers append-only clearance without touching old data',()=>{
 const id=stages[0].id,m=memory([[OLD,'{broken legacy'],[OLD+'.cleared.'+id,'1'],[OLD+'.board.'+id,'old-undo-bytes']]);
 const p=new ForestProgress(m);assert.ok(p.data.cleared.includes(id));assert.ok(p.allowed(stages[1].id));p.flush();
 assert.equal(m.getItem(OLD),'{broken legacy');assert.equal(m.getItem(OLD+'.board.'+id),'old-undo-bytes');
});
test('example uses identical per-step motion timing as normal play',()=>{
 for(const s of stages){const path=answer(s),replay=new ExampleReplay(s,path),q=new ForestSession(s);for(const [i,step] of path.entries()){
  q.motion=[];const a=q.state.actors.find(a=>a.x===step.at[0]&&a.y===step.at[1]),p={x:a.x+.5,y:a.y+.5};q.begin(a.id,p);q.travel({x:p.x+step.d[0],y:p.y+step.d[1]});q.end();
  assert.equal(replay.motions[i].duration,q.motion[0].duration,`${s.number}/${i+1}`);
 }}
});
test('damaged chapter1 summary cannot hide its append-only final clearance',()=>{
 const key='naopoyo.chapter1.20261023.v1',entries=[[key,'{broken'],[key+'.cleared.light-owl-trial','1']],m=memory(entries),p=new ForestProgress(m);
 assert.ok(p.allowed(stages[0].id));assert.equal(p.data.current,stages[0].id);p.flush();for(const [k,v] of entries)assert.equal(m.getItem(k),v);
});
test('stale tab cannot overwrite a newer future board in the latest summary',()=>{
 const id=stages[0].id,m=memory([[KEY,JSON.stringify({version:1,unlocked:[id],boards:{}})]]),p=new ForestProgress(m);
 const future={version:99,history:['protected']},raw=JSON.stringify({version:1,unlocked:[id],boards:{[id]:future}});m.setItem(KEY,raw);
 assert.equal(p.board(id,{version:1}),false);assert.equal(m.getItem(KEY),raw);assert.equal(m.getItem(KEY+'.board.'+id),null);
});
test('future summary board is protected even when a current-version board slot also exists',()=>{
 const id=stages[0].id,future={version:99,history:['protected']},raw=JSON.stringify({version:1,unlocked:[id],boards:{[id]:future}}),m=memory([[KEY,raw],[KEY+'.board.'+id,JSON.stringify({version:1})]]),p=new ForestProgress(m);
 assert.equal(p.board(id,{version:1}),false);assert.equal(m.getItem(KEY),raw);
});
