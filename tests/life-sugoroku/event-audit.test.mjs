import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {createHash} from 'node:crypto';
import {EVENTS} from '../../prototypes/life-sugoroku/events.mjs';
import {PARTNER_PROFILES} from '../../prototypes/life-sugoroku/profiles.mjs';
import {BOARD} from '../../prototypes/life-sugoroku/data.mjs';
import {createGame,dispatch,eventText,canRomance} from '../../prototypes/life-sugoroku/engine.mjs';
const audit=JSON.parse(fs.readFileSync(new URL('../../docs/life-sugoroku/V3-EVENT-AUDIT.json',import.meta.url),'utf8'));
const context=vm.createContext({});
vm.runInContext(fs.readFileSync(new URL('../../character-world-master.v1.js',import.meta.url),'utf8')+';globalThis.master=NAOTOCCHI_CHARACTER_WORLD_MASTER_V1;',context);
const master=context.master;
const npcs=[...master.companions.normal,...master.companions.rare,...master.partners];
const signature=e=>({id:e.id,category:e.category,stages:e.stages,regions:e.regions,npc:e.npc,once:e.once,choices:e.choices.map(({sodachi,money,evolve,time,redo})=>({sodachi,money,evolve,time,redo}))});
const hash=events=>createHash('sha256').update(JSON.stringify(events.map(signature))).digest('hex');
// Captured before the V3 narrative edits; updating audit.before cannot hide a balance change.
const BASELINE='86b7057a67a0d36f70ead5a9fa76ca4a828386b4e1d84ce07df2cb42c5ab9e50';
const state=character=>createGame({seed:315,rounds:15,players:Array.from({length:4},(_,i)=>({character:character||{id:'dog',label:'いぬ'},human:i===0}))});

test('all original event mechanics and ordering match the independent V2 fingerprint',()=>{
 assert.equal(EVENTS.length,46);assert.equal(new Set(EVENTS.map(e=>e.id)).size,46);
 assert.equal(hash(EVENTS),BASELINE);assert.equal(hash(audit.events.map(e=>e.before)),BASELINE);
 assert.deepEqual(audit.events.map(e=>e.after),EVENTS);
});

test('audit covers every condition, NPC identity, branch and economic cause',()=>{
 for(const record of audit.events){
  const e=record.after;assert.equal(record.id,e.id);
  assert.deepEqual(record.conditions.stageRange,e.stages);assert.deepEqual(record.conditions.regions,e.regions);
  assert.equal(record.conditions.oncePerPlayer,true);assert.equal(record.choices.length,2);
  assert.ok(e.stages[0]>=1&&e.stages[1]<=8);assert.ok(e.regions.every(r=>BOARD.some(t=>t.region===r)));
  assert.equal(record.conditions.previousRelationshipRequired,false);
  assert.ok(record.findings.length>10);assert.ok(record.relationshipRecommendation.next.length>10);
  if(e.npc){const npc=npcs.find(n=>n.id===e.npc);assert.ok(npc,e.id);assert.equal(record.npc.label,npc.label);assert.equal(record.npc.personality,npc.behavior||npc.hook||'言葉のない箱。台詞を発しない。');assert.deepEqual(record.npc.profile,PARTNER_PROFILES[e.npc]||null);}
  for(const [index,c] of e.choices.entries()){
   const item=record.choices[index];assert.equal(item.meaning,c.label);assert.equal(item.result,c.text);
   assert.deepEqual(item.baseDelta,{sodachi:c.sodachi,money:c.money});assert.equal(item.evolution,c.evolve||0);assert.equal(item.time,c.time||0);assert.equal(item.redo,c.redo||false);
   assert.ok(item.moneyCause.length>5);assert.doesNotMatch(item.moneyCause,/要確認|TODO/);
   assert.equal(item.friendshipResult,c.friendshipText||null);
  }
 }
 assert.equal(audit.events.flatMap(e=>e.choices).filter(c=>c.baseDelta.money!==0).length,64);
});

test('all 92 authored choices award the preserved base amounts without consuming RNG',()=>{
 for(const e of EVENTS)for(let index=0;index<2;index++){
  const s=state(),p=s.players[0];p.stage=e.stages[0];p.pos=BOARD.find(t=>t.region===e.regions[0]).id;
  s.phase='event';s.pending={eventId:e.id};const rng=s.rng,c=e.choices[index];
  const after=dispatch(s,{type:'choose',index,revision:s.revision,actor:s.active});
  assert.equal(after.players[0].sodachi,20+c.sodachi,`${e.id}/${index}: growth`);
  assert.equal(after.players[0].money,20+c.money,`${e.id}/${index}: money`);
  assert.equal(after.rng,rng,`${e.id}/${index}: RNG`);
  assert.equal(after.players[0].stage,Math.max(1,Math.min(8,e.stages[0]+(c.evolve||c.time||0))));
  assert.ok(after.players[0].seen.includes(e.id));
 }
});

test('every original romance branch has complete equal-economics friendship rendering',()=>{
 for(const e of EVENTS.filter(e=>e.category==='romance')){
  assert.ok(e.friendshipTitle&&e.friendshipText);
  const incompatible={id:'dog',label:'いぬ',gender:'female',orientationId:'aro'};
  for(const c of e.choices){assert.ok(c.friendshipText);assert.equal(eventText({character:incompatible},e,c),c.friendshipText);}
  if(!e.npc){assert.equal(canRomance({id:'dog',gender:'female',orientationId:'pan'},e),false);continue;}
  const profile=PARTNER_PROFILES[e.npc];
  const compatible={id:'dog',label:'いぬ',gender:profile.orientationId==='gay'?profile.gender:'female',orientationId:'pan'};
  assert.equal(canRomance(compatible,e),true,e.id);
  for(let index=0;index<2;index++){
   assert.equal(eventText({character:compatible},e,e.choices[index]),e.choices[index].text);
   const run=character=>{const s=state(character);s.players[0].stage=e.stages[0];s.phase='event';s.pending={eventId:e.id};return dispatch(s,{type:'choose',index,revision:s.revision,actor:0});};
   const a=run(compatible),b=run(incompatible);
   assert.equal(a.players[0].money,b.players[0].money);assert.equal(a.players[0].sodachi,b.players[0].sodachi);
  }
  assert.equal(canRomance({id:e.npc,...profile},e),false,'self romance');
 }
});
