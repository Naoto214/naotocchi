import test from 'node:test';import assert from 'node:assert/strict';import * as e from '../engine.mjs';import * as old from '../legacy-engine.mjs';import {RULES} from '../rules.mjs';import * as fx from '../effects.mjs';
function fixture(){const s=e.createGame(99);s.choice=null;s.phase='normal';s.pending=[];s.players.A.time=10;s.players.B.time=10;return s;}
function put(s,a,id,zone='hand'){const p=s.players[a],x=p.deck.shift();s.cards[x].cardId=id;p[zone].push(x);return x;}
function field(s,a,id,slot='main'){const x=put(s,a,id);s.players[a].hand.pop();s.players[a].board[slot]=x;s.cards[x].generation++;return x;}
function go(s,kind,fn=()=>true){const a=e.legalActions(s).find(a=>a.kind===kind&&fn(a));assert.ok(a,`missing ${kind}`);return e.act(s,e.actor(s),s.revision,a.id);}
function resolve(s){s=go(s,'pass');return go(s,'pass');}
function choices(s){let n=0;while(s.choice&&n++<100)s=go(s,'choose');return s;}
test('custom decks reject unsupported and copy limits; legacy saves remain exact',()=>{
 const d=[...e.DEFAULT_DECK];d[0]='M-beetle-07';assert.equal(e.validateDeck(d),true);assert.equal(e.createGame(1,{A:d,B:e.DEFAULT_DECK}).decks.A[0],'M-beetle-07');d[0]='UNKNOWN-CARD';assert.throws(()=>e.validateDeck(d));assert.throws(()=>e.validateDeck(Array(40).fill('C-box')));assert.deepEqual(e.restore(old.save(old.createGame(7))),old.createGame(7));
});
test('higher main birth and time skip use stage/difference payments',()=>{
 let s=fixture();const source=put(s,'A','M-beetle-07');s=go(s,'place',a=>a.source===source);assert.equal(s.players.A.time,3);assert.deepEqual(e.stats(s,'A'),{power:10,wisdom:4});
 s=fixture();field(s,'A','M-beetle-01');const next=put(s,'A','M-beetle-07');s=go(s,'place',a=>a.source===next);assert.equal(s.players.A.time,4);
});
test('search requires private selection and explicit bottom ordering',()=>{
 let s=fixture();const source=put(s,'A','G-crane-game-3d');put(s,'A','I-bowtie','deck');const item=s.players.A.deck.pop();s.players.A.deck.unshift(item);s=go(s,'programPlay',a=>a.source===source);s=resolve(s);assert.equal(s.choice.kind,'search_take');assert.equal(e.view(s,'B').choice,null);assert.equal(e.view(s,'B').actions.length,0);s=choices(s);assert.equal(s.chain.length,0);assert.ok(s.players.A.hand.includes(item));e.validate(s);
});
test('stat changes apply, expire, and disappear after reincarnation',()=>{
 let s=fixture();field(s,'B','M-antlion-01');const source=put(s,'A','E-big-illness');s=go(s,'programPlay',a=>a.source===source);s=resolve(s);assert.deepEqual(e.stats(s,'B'),{power:0,wisdom:1});s.cards[s.players.B.board.main].generation++;assert.deepEqual(e.stats(s,'B'),{power:2,wisdom:3});
});
test('scheduled growth occurs after next own start and survives source departure',()=>{
 let s=fixture();const source=put(s,'A','E-midlife-flower');s=go(s,'programPlay',a=>a.source===source);s=resolve(s);assert.equal(s.players.A.growth,20);assert.equal(s.scheduled.length,1);
 for(let i=0;i<100&&s.serial<3;i++){s=s.choice?go(s,'choose'):go(s,'pass');}
 s=choices(s);assert.equal(s.serial,3);assert.equal(s.players.A.growth,25);assert.equal(s.scheduled.length,0);
});
test('facedown trap is not disclosed by board, targeting labels or action IDs',()=>{
 let s=fixture();const trap=put(s,'A','G-real-fishing');s=go(s,'place',a=>a.source===trap);assert.equal(s.players.A.board.prepared[0].faceDown,true);s=go(s,'pass');put(s,'B','G-tank-battle');const v=e.view(s,'B'),str=JSON.stringify(v);assert.ok(!str.includes('G-real-fishing'));assert.ok(!str.includes('ほんかくさかなつり'));const attack=v.actions.find(a=>a.kind==='programPlay');assert.ok(attack);s=e.act(s,'B',s.revision,attack.id);assert.ok(!JSON.stringify(e.view(s,'B')).includes('ほんかくさかなつり'));assert.ok(!JSON.stringify(e.view(s,null)).includes('ほんかくさかなつり'));s=resolve(s);assert.ok(s.players.A.hand.includes(trap));
});
test('start trap activates once, consumes prepared source and allows response',()=>{
 let s=fixture();const trap=put(s,'A','G-real-fishing');s=go(s,'place',a=>a.source===trap);for(let i=0;i<100&&s.serial<3;i++)s=s.choice?go(s,'choose'):go(s,'pass');s=choices(s);assert.equal(s.phase,'trigger');s=go(s,'trigger',a=>a.source===trap);assert.equal(s.players.A.board.prepared.length,0);assert.equal(s.chain.length,1);s=resolve(s);s=choices(s);assert.ok(s.players.A.discard.includes(trap));e.validate(s);
});
test('replacement partner relationship loss and equipment cleanup apply centrally',()=>{
 let s=fixture();const partner=field(s,'B','P-cliff_goat','partner');s.players.B.relationship=0;const source=put(s,'A','E-misunderstanding');s=go(s,'programPlay',a=>a.source===source);s=resolve(s);assert.ok(s.players.B.hand.includes(partner));assert.equal(s.players.B.growth,10);assert.equal(s.players.B.relationship,null);
});
test('new custom decks complete R10 and replay exactly after choices',()=>{
 const deck=[...e.DEFAULT_DECK];deck[0]='M-beetle-07';deck[3]='M-cat-03';deck[10]='G-real-fishing';deck[15]='G-crane-game-3d';deck[18]='E-midlife-flower';deck[25]='G-dot-eater';let s=e.createGame(719,{A:deck,B:deck});
 for(let i=0;i<2000&&s.phase!=='finished';i++){const score={choose:100,trigger:90,place:80,relationship:75,challenge:70,programPlay:65,play:60,skip:1,pass:0};const a=e.legalActions(s).sort((a,b)=>(score[b.kind]??0)-(score[a.kind]??0))[0];assert.ok(a);s=e.act(s,e.actor(s),s.revision,a.id);}assert.equal(s.phase,'finished');assert.deepEqual(e.restore(e.save(s)),s);
});

test('search reveals only selected cards, never the inspected set',()=>{
 let s=fixture();const source=put(s,'A','I-c_friend');s=go(s,'programPlay',a=>a.source===source);const before=s.log.length;s=resolve(s);assert.ok(!s.log.slice(before).some(x=>x.includes('公開：')));s=choices(s);assert.ok(s.log.slice(before).filter(x=>x.includes('公開：')).length<=1);
});
test('trap setup does not meet face-up play conditions',()=>{
 let s=fixture();const trap=put(s,'A','G-real-fishing'),rhythm=put(s,'A','G-rhythm-highway-3d');s=go(s,'place',a=>a.source===trap);assert.ok(!e.legalActions(s).some(a=>a.source===rhythm));
});

test('companion effect enables beach volley only after successful resolution',()=>{
 let s=fixture();field(s,'A','M-antlion-01');const owl=put(s,'A','C-owl');s.players.A.hand.pop();s.players.A.board.companions.push(owl);const volley=put(s,'A','G-beach-volley');assert.ok(!e.legalActions(s).some(a=>a.source===volley));s=go(s,'programAbility',a=>a.source===owl);assert.ok(!e.legalActions(s).some(a=>a.source===volley));s=choices(resolve(s));assert.ok(e.legalActions(s).some(a=>a.source===volley));
});
test('reversi lasts through challenge end but ends with turn',()=>{
 let s=fixture();field(s,'A','M-antlion-01');const illness=put(s,'B','E-big-illness');s.priority='B';s.phase='response';s=go(s,'programPlay',a=>a.source===illness);s=resolve(s);s.priority='A';s.phase='normal';const source=put(s,'A','G-reversi-6');s=resolve(go(s,'programPlay',a=>a.source===source));assert.equal(s.effects.at(-1).duration,'turn');
});

test('explicit public searches reveal the inspected set',()=>{
 let s=fixture();const source=put(s,'A','G-sushi-belt'),names=s.players.A.deck.slice(0,3).map(id=>e.CARDS[s.cards[id].cardId].name);s=resolve(go(s,'programPlay',a=>a.source===source));for(const name of names)assert.ok(e.view(s,'B').log.some(x=>x.includes(name)));assert.equal(e.view(s,'B').choice,null);
});

test('registered descriptors reference implemented predicates, targets and passive values',()=>{
 for(const [id,r]of Object.entries(RULES)){
  let s=fixture();field(s,'A','M-antlion-01');field(s,'B','M-beetle-01');const source=put(s,'A',id);const type=e.CARDS[id].type;s.players.A.hand.pop();if(['main','partner','world'].includes(type)){const old=s.players.A.board[type];if(old)s.players.A.discard.push(old);s.players.A.board[type]=source;}else if(type==='companion')s.players.A.board.companions.push(source);else s.players.A.board.prepared.push({id:source,target:s.players.A.board.main,targetGeneration:0});
  s.challenge={parameter:'power',participants:{A:s.players.A.board.main,B:s.players.B.board.main}};
  for(const d of [r.active,...(r.triggers??[]),...(Array.isArray(r.passive)?r.passive:typeof r.passive==='object'?[r.passive]:[])].filter(Boolean)){assert.doesNotThrow(()=>fx.condition(s,'A',d.condition,{source,event:{kind:'cardPlayed',actor:'A',source,faceUp:true,method:'すぐつかう'}}),id);if(d.target)assert.doesNotThrow(()=>fx.targets(s,'A',d.target,source),id);}
  assert.doesNotThrow(()=>e.stats(s,'A'),id);
 }
});
test('activation hand cost is paid atomically before response and cannot be omitted',()=>{
 let s=fixture();field(s,'A','M-antlion-01');const world=field(s,'A','W-desert','world');s.players.A.time=0;const a=e.legalActions(s).find(a=>a.kind==='programAbility'&&a.source===world);assert.ok(a);const before=s.players.A.hand.length;s=e.act(s,'A',s.revision,a.id);assert.equal(s.players.A.hand.length,before-1);assert.equal(s.players.A.deck.at(-1),a.costCard);assert.equal(s.phase,'response');s=choices(resolve(s));e.validate(s);
});
test('trigger cost requires both time and hand card at activation',()=>{
 let s=fixture();const c=put(s,'A','C-clock');s.players.A.hand.pop();s.players.A.board.companions.push(c);s.players.A.time=0;assert.equal(fx.triggerRows(s,{kind:'end',actor:'A'}).filter(t=>t.source===c).length,0);s.players.A.time=1;const rows=fx.triggerRows(s,{kind:'end',actor:'A'});assert.equal(rows.filter(t=>t.source===c).length,1);s.pending=rows;s.phase='trigger';const a=e.legalActions(s).find(a=>a.kind==='trigger'&&a.source===c);const before=s.players.A.hand.length;s=e.act(s,'A',s.revision,a.id);assert.equal(s.players.A.time,0);assert.equal(s.players.A.hand.length,before-1);assert.equal(s.players.A.deck.at(-1),a.costCard);
});
test('automatic scheduled companion draws do not count as a new ability effect',()=>{
 let s=fixture();const c=put(s,'A','C-clock');s.players.A.hand.pop();s.players.A.board.companions.push(c);s.pending=fx.triggerRows(s,{kind:'end',actor:'A'});s.phase='trigger';s=resolve(go(s,'trigger',a=>a.source===c));assert.equal(s.scheduled.length,1);
 for(let i=0;i<100&&s.serial<3;i++)s=s.choice?go(s,'choose'):go(s,'pass');s=choices(s);assert.equal(s.serial,3);assert.equal(fx.condition(s,'A','companionEffect'),false);
});
