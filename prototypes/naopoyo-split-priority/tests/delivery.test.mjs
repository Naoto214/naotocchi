import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {candidateDetails,compass,fixedOffsets} from '../priorities.mjs';
import {fixture,simulate,scenarios,edit} from '../model.mjs';
import {mass,move,createState,settle,complete,validState} from '../engine.mjs';
import {stages} from '../../naopoyo-chapter2/stages.mjs';
import {stateKey} from '../search-core.mjs';
const root=new URL('../',import.meta.url),docs=new URL('../../../docs/naopoyo-split-priority-20261030/',import.meta.url);
test('standalone builder and atlas exist',()=>{for(const f of ['build-preview.mjs','atlas.mjs','atlas.html'])assert.ok(fs.existsSync(new URL(f,root)),f);});
test('exact search key retains identity and next child counter',()=>{const a=fixture(),b=structuredClone(a);b.actors[0].id='other';assert.notEqual(stateKey(a,{exact:true}),stateKey(b,{exact:true}));b.actors[0].id='parent';b.nextId++;assert.notEqual(stateKey(a,{exact:true}),stateKey(b,{exact:true}));});
for(const mode of ['A','B','C'])test(`${mode} obstacle boards rotate 90 degrees including gates`,()=>{
 const turn=([x,y])=>[7-y,x];const s=fixture('gate');edit(s,2,3,'friend');const t=structuredClone(s);t.walls=t.walls.map(turn);for(const k of ['actors','gates','exits','spikes'])for(const p of t[k])[p.x,p.y]=turn([p.x,p.y]);
 // Gate roofs are gravity-relative, so rotate geometry only with no gate-surface physics.
 s.terrainRules=t.terrainRules='magic-rock-v1';
 for(let h=0;h<8;h++){const p=s.actors[0],q=t.actors[0];const a=candidateDetails(s,p.x,p.y,...compass[h],p,{},mode),b=candidateDetails(t,q.x,q.y,...compass[(h+2)%8],q,{},mode);assert.deepEqual(b.map(v=>[v.x,v.y]),a.map(v=>turn([v.x,v.y])));}
});
test('C ring frame shifts two perimeter slots per 45 degree heading',()=>{for(let h=0;h<8;h++){const a=fixedOffsets(...compass[h]).slice(8),b=fixedOffsets(...compass[(h+1)%8]).slice(8);assert.deepEqual(b,[...a.slice(2),...a.slice(0,2)]);}});
for(const mode of ['A','B','C'])test(`${mode} 160 scenarios preserve mass and one successful split per spike`,()=>{for(const [name]of scenarios)for(const gravity of [false,true])for(let h=0;h<8;h++){const s=fixture(name,{gravity}),r=simulate(s,mode,h);assert.equal(mass(s),mass(r.final));assert.ok(r.final.actors.every(a=>a.level>=1&&a.level<=8));const keys=(r.result.events||[]).filter(e=>e.type==='split').map(e=>`${e.x},${e.y}`);assert.equal(new Set(keys).size,keys.length);for(const p of r.candidates){assert.ok(p.path.length<=3);assert.ok(p.x>=0&&p.x<8&&p.y>=0&&p.y<8);}}});
for(const mode of ['A','B','C'])test(`${mode} all remaining levels and no-space behavior`,()=>{for(let level=1;level<=8;level++){const r=simulate(fixture('empty',{level}),mode);assert.equal(r.spawns[0]?.children.length||0,level-1);assert.equal(mass(r.final),level);}const s=fixture();for(let y=1;y<=5;y++)for(let x=1;x<=5;x++)edit(s,x,y,'wall');const r=simulate(s,mode);assert.equal(r.result.split,0);assert.equal(r.final.actors[0].level,8);});
test('all experimental witnesses replay through engine',()=>{for(const f of fs.readdirSync(docs).filter(f=>/^alternative-\d+-[BC]\.json$/.test(f))){const w=JSON.parse(fs.readFileSync(new URL(f,docs))),stage=stages.find(s=>s.id===w.id),s=createState({...stage,splitPriority:w.mode});settle(s);for(const step of w.path){const a=s.actors.find(a=>a.x===step.at[0]&&a.y===step.at[1]&&a.level===step.level);assert.ok(a,f);assert.ok(move(s,a.id,...step.d).ok,f);assert.ok(validState(stage,s),f);}assert.ok(complete(s),f);}});
