import test from 'node:test';import assert from 'node:assert/strict';
import {ForestSession,visualActors,pointerActor} from '../session.mjs';
import {fitSprite,spriteSpec} from '../../naopoyo-rescue/sprites.mjs';
const art=await import('../actor-art.mjs').catch(()=>({}));
const fixture=()=>({id:'komorebi-split-visual',w:8,h:8,gravity:true,gravityRules:'supported-v1',movementRules:'contact-v1',terrainRules:'magic-gate-v2',walls:[[2,5]],gates:[],exits:[],spikes:[{x:3,y:4,power:3}],water:[],events:[],guests:[],actors:[{id:'a',x:2,y:4,level:6,species:'dog'}]});
test('wide and tall official sprites put cropped feet on the same cell baseline',()=>{
 assert.equal(typeof art.actorSpriteBox,'function');
 for(const species of ['dog','fish','penguin','frog'])for(let level=1;level<=8;level++)for(const held of [false,true]){
  const a={species,level,x:2,y:4,landing:0},box=art.actorSpriteBox(a,40,held),r=fitSprite(spriteSpec(species,level).crop,box);
  assert.ok(Math.abs(r.y+r.h-198.4)<.00001,`${species}/${level} feet`);
  assert.ok(r.x>=80&&r.x+r.w<=120);assert.ok(r.h>0&&r.h<=32);
 }
});
test('split children are not visible before the body reaches the spike',()=>{
 const q=new ForestSession(fixture());q.begin('a',{x:2.5,y:4.5});q.travel({x:3.5,y:4.5});const ids=q.lastResults[0].children.map(a=>a.id);assert.equal(ids.length,3);
 q.motion[0].elapsed=q.motion[0].duration*.1;
 for(const a of visualActors(q).filter(a=>ids.includes(a.id)))assert.equal(a.opacity,0,'no pre-contact apparition');
 q.motion[0].elapsed=q.motion[0].duration*.5;
 assert.ok(visualActors(q).some(a=>ids.includes(a.id)&&a.opacity>0));
 q.animate(1000);for(const a of visualActors(q)){const actual=q.state.actors.find(b=>b.id===a.id);assert.equal(a.x,actual.x);assert.equal(a.y,actual.y);assert.equal(a.level,actual.level);}
});
test('falling body shows its split number after contact, not the pre-split number',()=>{
 const q=new ForestSession(fixture());q.begin('a',{x:2.5,y:4.5});q.travel({x:3.5,y:4.5});q.motion[0].elapsed=q.motion[0].duration*.5;
 const a=visualActors(q).find(a=>a.id==='a');assert.equal(a.level,3);
 const before=q.serialize();q.animate(1,true);assert.equal(q.motion.length,0);assert.equal(q.serialize(),before);
});

test('a gravity-triggered split waits until the animated body reaches its actual spike',async()=>{
 const {stages}=await import('../stages.mjs'),{default:fs}=await import('node:fs');
 const paths=JSON.parse(fs.readFileSync(new URL('../../../docs/naopoyo-gate-v8-20261026/solutions.json',import.meta.url)));
 const q=new ForestSession({...stages.find(s=>s.number===18),movementRules:'contact-v1',splitRules:undefined,revision:5});
 for(const step of paths.stages.find(s=>s.number===18).path.slice(0,13)){
  q.animate(1000);const a=q.state.actors.find(a=>a.x===step.at[0]&&a.y===step.at[1]);q.begin(a.id,{x:a.x+.5,y:a.y+.5});q.travel({x:a.x+.5+step.d[0],y:a.y+.5+step.d[1]});q.end();
 }
 const f=q.motion[0],event=f.events.find(e=>e.type==='split');assert.deepEqual([event.x,event.y],[4,6]);
 f.elapsed=f.duration*.3;const bodies=visualActors(q),body=bodies.find(a=>a.id===event.id);assert.ok(body.y<6);assert.equal(body.level,8);
 for(const a of bodies.filter(a=>event.children.some(b=>b.id===a.id)))assert.equal(a.opacity,0);
 let firstVisible=null;for(let i=30;i<100;i++){f.elapsed=f.duration*i/100;const actors=visualActors(q);if(actors.some(a=>event.children.some(b=>b.id===a.id)&&a.opacity>0)){firstVisible=actors.find(a=>a.id===event.id);break;}}
 assert.ok(firstVisible&&firstVisible.y>=6,'birth follows spike contact');
});
test('invisible newborns cannot intercept a regrab at birth or final cell',()=>{
 const q=new ForestSession(fixture());q.begin('a',{x:2.5,y:4.5});q.travel({x:3.5,y:4.5});q.motion[0].elapsed=q.motion[0].duration*.1;
 assert.equal(pointerActor(q,{x:2.5,y:4.5})?.id,'a');assert.equal(pointerActor(q,{x:3.5,y:7.5}),undefined);
});

test('coincident split and later merge keep the intermediate number until the donor arrives',async()=>{
 const {stages}=await import('../stages.mjs'),{default:fs}=await import('node:fs');
 const paths=JSON.parse(fs.readFileSync(new URL('../../../docs/naopoyo-gate-v8-20261026/solutions.json',import.meta.url)));
 const q=new ForestSession({...stages.find(s=>s.number===18),movementRules:'contact-v1',splitRules:undefined,revision:5});
 for(const step of paths.stages.find(s=>s.number===18).path.slice(0,6)){
  q.animate(1000);const a=q.state.actors.find(a=>a.x===step.at[0]&&a.y===step.at[1]);q.begin(a.id,{x:a.x+.5,y:a.y+.5});q.travel({x:a.x+.5+step.d[0],y:a.y+.5+step.d[1]});q.end();
 }
 const f=q.motion[0];let sawSplit=false,sawFinal=false;
 for(let i=0;i<1000;i++){
  f.elapsed=f.duration*i/1000;const actors=visualActors(q),body=actors.find(a=>a.id==='child1'),donor=actors.find(a=>a.id==='child3');
  if(body.level===4)sawSplit=true;
  if(sawSplit&&body.level===6){sawFinal=true;assert.ok(!donor||donor.opacity===0||Math.hypot(donor.x-body.x,donor.y-body.y)<.01,'number must wait for actual contact');}
 }
 assert.ok(sawSplit,'split body 4 must be shown');assert.ok(sawFinal,'later merge 6 must be shown');
});
