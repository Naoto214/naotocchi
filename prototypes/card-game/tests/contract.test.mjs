import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
import * as api from '../engine.mjs';
const oracle=JSON.parse(readFileSync(new URL('./python-oracle.json',import.meta.url)));
function fixture(){const s=api.createGame(7);s.choice=null;s.pending=[];s.phase='normal';s.window='normal';s.players.A.time=10;s.players.B.time=10;return s;}
function take(s,a,c){const p=s.players[a];for(const zone of ['deck','hand','discard']){const id=p[zone].find(id=>s.cards[id].cardId===c);if(id){p[zone].splice(p[zone].indexOf(id),1);return id;}}throw Error(c);}
function put(s,a,c,zone){const id=take(s,a,c);s.players[a][zone].push(id);return id;}
function field(s,a,c,slot){const id=take(s,a,c);s.cards[id].generation++;if(slot==='companions')s.players[a].board.companions.push(id);else s.players[a].board[slot]=id;return id;}
function doAction(s,kind,predicate=()=>true){const a=api.legalActions(s).find(a=>a.kind===kind&&predicate(a));assert.ok(a,kind);return api.act(s,api.actor(s),s.revision,a.id);}
function resolve(s){s=doAction(s,'pass');return doAction(s,'pass');}
test('Python oracle: 660 main payment/legality and 48 passive-stat cases',()=>{
 for(const r of oracle.main){const cost=api.mainCost(r.old,r.dest);assert.equal(cost!==null&&cost<=r.time,r.legal);if(r.legal)assert.equal(cost,r.cost);}
 for(const r of oracle.stats){const s=fixture();field(s,'A',r.main,'main');if(r.world)field(s,'A','W-deepsea','world');if(r.both)field(s,'B','W-deepsea','world');if(r.chameleon)field(s,'A','C-chameleon','companions');const p=s.players.A;p.deck.push(...p.hand);p.hand=[];while(p.hand.length<r.hands)p.hand.push(p.deck.shift());assert.deepEqual(api.stats(s,'A'),r.value);}
});
test('Python oracle: 9 hit/blow exact draw, bottom, growth outcomes',()=>{
 for(const r of oracle.hit){let s=fixture(),p=s.players.A;const source=put(s,'A','G-hit-blow','hand'),top=take(s,'A',r.top),next=take(s,'A','W-deepsea');p.discard.push(...p.deck,...p.hand.filter(x=>x!==source));p.hand=[source];p.deck=[top,next];s=doAction(s,'play',a=>a.source===source&&a.declare===r.declare);s=resolve(s);p=s.players.A;const names=xs=>xs.map(id=>id===source?'source':id===top?'top':id===next?'next':id);assert.deepEqual(names(p.deck),r.value.deck);assert.deepEqual(names(p.hand),r.value.hand);assert.equal(p.growth,r.value.growth);assert.equal(p.discard.at(-1),source);}
});
test('coin, first date and end/start equipment choices remain atomic',()=>{
 let s=fixture();const partner=field(s,'A','P-cliff_goat','partner');s.players.A.relationship=0;const date=put(s,'A','E-first-date','hand');const before=s.players.A.hand.length;s=doAction(s,'play',a=>a.source===date);s=resolve(s);assert.equal(s.players.A.growth,25);assert.equal(s.players.A.hand.length,before);
 let coin=put(s,'A','I-c_coin2','hand'),top=take(s,'A','M-beetle-01');s.players.A.deck.unshift(top);s=doAction(s,'play',a=>a.source===coin);s=resolve(s);assert.equal(s.players.A.growth,30);assert.equal(s.players.A.deck.at(-1),top);
 s=fixture();field(s,'A','M-antlion-01','main');const sleep=put(s,'A','I-sleepboost1','hand');s=doAction(s,'place',a=>a.source===sleep);s=resolve(s);s=doAction(s,'pass');s=doAction(s,'pass');assert.equal(s.phase,'trigger');s=doAction(s,'trigger');s=resolve(s);assert.equal(s.choice.kind,'sleep_bottom');const q=s.players.A.hand.length;s=doAction(s,'choose');assert.equal(s.players.A.hand.length,q-1);api.validate(s);
});
test('LIFO chain suspends for mandatory private choice; no response injection',()=>{
 let s=fixture();const target=put(s,'A','C-box','discard'),coin=put(s,'A','I-c_coin2','hand'),shogi=put(s,'A','G-animal-shogi','hand');s=doAction(s,'play',a=>a.source===coin);s=doAction(s,'play',a=>a.source===shogi&&a.target===target);s=resolve(s);assert.equal(s.phase,'choice');assert.equal(s.chain.length,1);assert.equal(s.chain[0].source,coin);assert.ok(api.legalActions(s).every(a=>a.kind==='choose'));assert.equal(api.view(s,'B').choice,null);assert.deepEqual(api.view(s,'B').actions,[]);s=doAction(s,'choose');assert.equal(s.chain.length,0);assert.ok(s.players.A.hand.includes(target));api.validate(s);
});
test('reincarnated equipment target is not destroyed by an old link',()=>{
 let s=fixture();field(s,'A','W-deepsea','world');const main=field(s,'B','M-beetle-01','main'),equip=take(s,'B','I-bowtie');s.players.B.board.prepared.push({id:equip,target:main,targetGeneration:s.cards[main].generation});const bow=put(s,'A','G-archery-3d','hand');s=doAction(s,'play',a=>a.source===bow);s.cards[equip].generation++;s=resolve(s);assert.equal(s.players.B.board.prepared[0].id,equip);
});
test('all card instances conserved, placement limits and insufficient time rejected',()=>{
 let s=fixture();s.players.A.time=0;put(s,'A','I-bowtie','hand');assert.ok(!api.legalActions(s).some(a=>a.kind==='play'||a.slot==='main'||a.slot==='prepared'));
 const c=put(s,'A','C-box','hand');s=doAction(s,'place',a=>a.source===c);s=resolve(s);assert.ok(!api.legalActions(s).some(a=>['companions','partner'].includes(a.slot)));api.validate(s);
 const counts={};for(const c of Object.values(s.cards).filter(c=>c.owner==='A'))counts[c.cardId]=(counts[c.cardId]??0)+1;for(const [c,n]of Object.entries(counts))assert.ok(n<=(api.CARDS[c].rare?1:3));
});
test('100 maintenance excludes current opposing turn and R10 uses final comparison',()=>{
 let s=fixture();s.round=5;s.serial=10;s.turn='B';s.priority='B';s.players.A.growth=100;s.players.A.reached=12;s.phase='response';s.window='end';s=resolve(s);assert.notEqual(s.phase,'finished');assert.equal(s.turn,'A');
 s=fixture();s.round=10;s.turn='B';s.phase='response';s.window='end';s.players.A.growth=100;s.players.A.reached=1;s.players.B.growth=100;s=resolve(s);assert.deepEqual(s.result,{winner:null,reason:'R10最終比較',growth:{A:100,B:100}});
});
test('birth, cat return, full board reward, archery removal and marriage',()=>{
 let s=fixture();const main=put(s,'A','M-beetle-01','hand');s=doAction(s,'place',a=>a.source===main);s=doAction(s,'trigger');s=resolve(s);assert.equal(s.choice.kind,'birth_bottom');const count=s.players.A.hand.length;s=doAction(s,'choose');assert.equal(s.players.A.hand.length,count);
 s=fixture();const cat=field(s,'A','C-cat_friend','companions'),target=put(s,'A','C-box','discard');s=doAction(s,'ability',a=>a.source===cat&&a.target===target);assert.equal(s.players.A.deck.at(-1),cat);s=resolve(s);assert.ok(s.players.A.hand.includes(target));
 s=fixture();const m=field(s,'A','M-antlion-01','main');field(s,'A','P-cliff_goat','partner');s.players.A.relationship=3;field(s,'A','W-deepsea','world');for(const c of ['C-box','C-cat_friend','C-chameleon'])field(s,'A',c,'companions');for(let i=0;i<3;i++){const id=take(s,'A','I-bowtie');s.players.A.board.prepared.push({id,target:m,targetGeneration:s.cards[m].generation});}const area=put(s,'A','G-area-claim','hand');s=doAction(s,'play',a=>a.source===area);s=resolve(s);assert.equal(s.players.A.growth,35);s=resolve(s);s=doAction(s,'relationship');assert.equal(s.players.A.growth,45);assert.equal(s.players.A.relationship,4);
 s=fixture();field(s,'A','W-deepsea','world');const bm=field(s,'B','M-antlion-01','main'),eq=take(s,'B','I-bowtie');s.players.B.board.prepared.push({id:eq,target:bm,targetGeneration:s.cards[bm].generation});const arch=put(s,'A','G-archery-3d','hand');s=doAction(s,'play',a=>a.source===arch);s=resolve(s);assert.ok(s.players.B.discard.includes(eq));api.validate(s);
});
test('bowtie starts after normal draw; empty decks do not lose or crash',()=>{
 let s=fixture();const bm=field(s,'B','M-antlion-01','main'),eq=take(s,'B','I-bowtie');s.players.B.board.prepared.push({id:eq,target:bm,targetGeneration:s.cards[bm].generation});s.players.B.deck.push(...s.players.B.hand);s.players.B.hand=[];s.phase='response';s.window='end';s=resolve(s);assert.equal(s.phase,'trigger');assert.equal(s.players.B.hand.length,1);s=doAction(s,'trigger');s=resolve(s);assert.equal(s.players.B.hand.length,2);
 s=fixture();for(const p of Object.values(s.players)){p.discard.push(...p.deck);p.deck=[];}const c=put(s,'A','I-c_coin2','hand');s=doAction(s,'play',a=>a.source===c);s=resolve(s);assert.equal(s.players.A.growth,20);api.validate(s);
});
