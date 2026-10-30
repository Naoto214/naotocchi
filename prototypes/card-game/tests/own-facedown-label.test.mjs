// 伏せ札の表示：持ち主には自分の伏せ札の名前を出し、相手には出さない（表示だけ。効果・伏せ札ルールは変えない）。
// 修正前は、相手が同じ名前の札を伏せていると、文字列の置き換えで持ち主の札まで「しかけたカード」になっていた。
import test from 'node:test';import assert from 'node:assert/strict';
import * as e from '../engine.mjs';
import {observeCpu} from '../cpu-observation.mjs';import {chooseCpuAction} from '../cpu-policy.mjs';
import {CATALOG} from '../full-catalog.mjs';

const HIDDEN='しかけたカード',name=id=>CATALOG[id].name;
function fixture(){const s=e.createGame(71);s.choice=null;s.pending=[];s.phase='normal';s.window='normal';s.players.A.time=10;s.players.B.time=10;return s;}
function take(s,a,c){const x=s.players[a].deck.shift();s.cards[x].cardId=c;return x;}
function field(s,a,c,slot='main'){const id=take(s,a,c);s.cards[id].generation++;s.players[a].board[slot]=id;return id;}
function trap(s,a,c){const id=take(s,a,c);s.players[a].board.prepared.push({id,faceDown:true,setSerial:0});return id;}
const act=(s,a)=>{assert.ok(a,'action not legal');return e.act(s,e.actor(s),s.revision,a.id);};
// A・B とも同じ名前の札（ボンバー・ほんかくさかなつり）を伏せる。A のターンを終え、B のターン開始時の A のボンバーの誘発まで進める。
function mirror(){const s0=fixture();field(s0,'A','M-dog-03');field(s0,'B','M-dog-01');
 const ids={bombA:trap(s0,'A','G-bomber-maze'),fishA:trap(s0,'A','G-real-fishing'),bombB:trap(s0,'B','G-bomber-maze'),fishB:trap(s0,'B','G-real-fishing')};
 let s=s0,g=0;while(!e.legalActions(s).some(a=>a.kind==='trigger'&&a.source===ids.bombA)){assert.ok(g++<40);const acts=e.legalActions(s);s=act(s,acts.find(x=>x.kind==='end')??acts.find(x=>x.kind==='pass')??acts.find(x=>x.kind==='skip')??acts[0]);}
 return {s,...ids};}
const viewAction=(s,viewer,pred)=>{const v=e.view(s,viewer),raw=e.legalActions(s);return v.actions.filter((_,i)=>pred(raw[i]));};

test('持ち主の誘発：相手が同じ名前の札を伏せていても、自分のボンバーの名前が出る',()=>{
 const {s,bombA}=mirror();assert.equal(e.actor(s),'A');
 const labels=viewAction(s,'A',a=>a.source===bombA).map(a=>a.label);assert.ok(labels.length>=1);
 assert.ok(labels.every(l=>l.startsWith(name('G-bomber-maze'))&&!l.includes(HIDDEN)),labels.join(' / '));
});
test('持ち主の対象選択：自分の伏せ札は名前、相手の伏せ札は「しかけたカード」',()=>{
 let {s,bombA,fishA,fishB,bombB}=mirror();s=act(s,e.legalActions(s).find(a=>a.kind==='trigger'&&a.source===bombA));
 const own=viewAction(s,'A',a=>a.kind==='choose'&&a.value===fishA)[0];assert.ok(own);assert.match(own.label,new RegExp(name('G-real-fishing')));assert.ok(!own.label.includes(HIDDEN),own.label);
 s=act(s,e.legalActions(s).find(a=>a.kind==='choose'&&a.value===fishA));
 const other=viewAction(s,'A',a=>a.kind==='choose'&&[fishB,bombB].includes(a.value)).map(a=>a.label);assert.equal(other.length,2);
 for(const l of other){assert.ok(l.includes(HIDDEN),l);assert.ok(!l.includes(name('G-real-fishing'))&&!l.includes(name('G-bomber-maze')),l);}
});
test('連鎖の対象：持ち主は自分の札の名前、相手の伏せ札は「しかけたカード」。相手（B）からは A の伏せ札が見えない',()=>{
 let {s,bombA,fishA,fishB}=mirror();s=act(s,e.legalActions(s).find(a=>a.kind==='trigger'&&a.source===bombA));
 s=act(s,e.legalActions(s).find(a=>a.kind==='choose'&&a.value===fishA));s=act(s,e.legalActions(s).find(a=>a.kind==='choose'&&a.value===fishB));
 assert.ok(s.chain.length>=1);
 const a=e.view(s,'A').chain.at(-1).target,b=e.view(s,'B').chain.at(-1).target;
 assert.equal(a,name('G-real-fishing')+' / '+HIDDEN);assert.equal(b,HIDDEN+' / '+name('G-real-fishing'));
});
test('相手（B）の画面：A の伏せ札は名前も本文も出ない（盤面・行動・選択とも）',()=>{
 const {s}=mirror();const v=e.view(s,'B');
 for(const c of v.players.A.board.prepared){assert.equal(c.name,HIDDEN);assert.equal(c.hidden,true);assert.equal(c.cardId,undefined);}
 assert.deepEqual(v.actions,[]);assert.equal(v.choice,null);
});
// CPU同士の対戦の全局面で、相手の伏せ札の名前が（閲覧者に見えている同名の札がない限り）行動・選択・連鎖に出ないこと。
const x=spec=>Object.entries(spec).flatMap(([id,n])=>Array(n).fill(id));
const DECK_A=x({'G-bomber-maze':3,'G-takoyaki-grill':3,'G-real-fishing':3,'I-bowtie':3,'W-snow':3,'W-countryside':3,'M-dog-01':3,'M-dog-02':3,'M-dog-03':3,'M-dog-04':3,'M-dog-05':2,'M-beetle-01':3,'C-panda':3,'I-c_coin2':2});
const DECK_B=x({'G-frogger-road':3,'G-tank-battle':3,'G-bomber-maze':3,'I-bowtie':3,'W-snow':3,'W-countryside':3,'M-dog-01':3,'M-dog-02':3,'M-dog-03':3,'M-dog-04':3,'M-dog-05':2,'M-beetle-01':3,'C-panda':3,'I-c_coin2':2});
function visibleNames(s,viewer){const v=e.view(s,viewer),names=new Set();const walk=o=>{if(Array.isArray(o))o.forEach(walk);else if(o&&typeof o==='object'){if(o.cardId&&o.name)names.add(o.name);Object.values(o).forEach(walk);}};walk(v.players);for(const l of s.chain)names.add(CATALOG[s.cards[l.source].cardId].name);for(const t of s.log)for(const c of Object.values(CATALOG))if(t.includes(c.name))names.add(c.name);return names;}
test('CPU対戦（初級・中級）の全局面：相手の伏せ札の名前は、行動・選択・連鎖の表示に出ない',()=>{
 let checked=0,ownShown=0;for(const difficulty of ['beginner','intermediate'])for(const seed of [3,4]){let s=e.createGame(seed,{A:DECK_A,B:DECK_B});let g=0;
  while(s.phase!=='finished'&&g++<6000){const a=e.actor(s);
   for(const viewer of ['A','B']){const o=viewer==='A'?'B':'A',seen=visibleNames(s,viewer);
    const secret=[...new Set(s.players[o].board.prepared.filter(p=>p.faceDown).map(p=>CATALOG[s.cards[p.id].cardId].name))].filter(n=>!seen.has(n));
    const v=e.view(s,viewer),text=JSON.stringify({actions:v.actions.map(x=>x.label),chain:v.chain,choice:v.choice});
    for(const n of secret){assert.ok(!text.includes(n),`${viewer} sees ${n} at ${seed}/${s.revision}`);checked++;}}
   for(const [i,q] of e.legalActions(s).entries()){const own=s.players[a].board.prepared.find(p=>p.faceDown&&p.id===q.source);if(own&&e.view(s,a).actions[i].label.startsWith(CATALOG[s.cards[q.source].cardId].name))ownShown++;}
   const o=observeCpu(s,a),d=chooseCpuAction(o,{difficulty,seed:seed+(a==='A'?1:2),step:s.revision});s=e.act(s,a,s.revision,d.id);}
  assert.equal(s.phase,'finished');}
 assert.ok(checked>50,'checked '+checked);assert.ok(ownShown>0,'持ち主の伏せ札の誘発が名前で出る場面がある');
});
test('同じ名前の札を伏せ合う実際の対戦（CPU）：持ち主には自分の伏せ札の名前が出る。保存→復帰後も表示は同じ',()=>{
 let ownShown=0,restored=0;for(const seed of [5,6]){let s=e.createGame(seed,{A:DECK_A,B:DECK_A});let g=0;
  while(s.phase!=='finished'&&g++<6000){const a=e.actor(s),raw=e.legalActions(s),v=e.view(s,a);
   for(const [i,q] of raw.entries()){const own=s.players[a].board.prepared.find(p=>p.faceDown&&p.id===q.source);if(own&&q.kind==='trigger'){assert.ok(v.actions[i].label.startsWith(CATALOG[s.cards[q.source].cardId].name),v.actions[i].label);ownShown++;}}
   if(s.revision%20===0){const back=e.restore(e.save(s));for(const viewer of ['A','B'])assert.equal(JSON.stringify(e.view(back,viewer)),JSON.stringify(e.view(s,viewer)));restored++;}
   const o=observeCpu(s,a),d=chooseCpuAction(o,{difficulty:'intermediate',seed:seed+(a==='A'?1:2),step:s.revision});s=e.act(s,a,s.revision,d.id);}
  assert.equal(s.phase,'finished');}
 assert.ok(ownShown>0&&restored>5,`${ownShown} ${restored}`);
});
