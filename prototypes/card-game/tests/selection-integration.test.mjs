import test from 'node:test';import assert from 'node:assert/strict';import * as e from '../engine.mjs';
function fixture(){const s=e.createGame(71);s.choice=null;s.pending=[];s.phase='normal';s.players.A.time=10;s.players.B.time=10;return s;}
function put(s,a,id,zone='hand'){const p=s.players[a],x=p.deck.shift();s.cards[x].cardId=id;p[zone].push(x);return x;}
function field(s,a,id){const x=put(s,a,id);s.players[a].hand.pop();s.players[a].board.main=x;s.cards[x].generation++;return x;}
function go(s,kind,p=()=>true){const a=e.legalActions(s).find(a=>a.kind===kind&&p(a));assert.ok(a,'missing '+kind);return e.act(s,e.actor(s),s.revision,a.id);}
function resolve(s){return go(go(s,'pass'),'pass');}
function picks(s){let i=0;while(s.choice&&i++<30)s=go(s,'choose',a=>a.value!=='cancel');return s;}
test('multi-target selection commits only after both targets, captures generations',()=>{
 let s=fixture();field(s,'A','M-antlion-01');field(s,'B','M-beetle-01');const source=put(s,'A','G-sky-shooter');const before=s.players.A.time;s=go(s,'programPlay',a=>a.source===source);assert.equal(s.choice.kind,'activation_selection');assert.equal(s.players.A.time,before);assert.equal(s.chain.length,0);assert.equal(e.view(s,'B').choice,null);s=picks(s);assert.equal(s.chain.length,1);s=resolve(s);assert.equal(e.stats(s,'A').power,3);assert.equal(e.stats(s,'B').power,1);e.validate(s);
});
test('multi-hand cost keeps order and is paid exactly once before response',()=>{
 let s=fixture();const source=put(s,'A','G-falling-block-puzzle');put(s,'A','C-box');put(s,'A','W-deepsea');put(s,'A','I-c_coin2');const hand=s.players.A.hand.length;s=go(s,'programPlay',a=>a.source===source);s=picks(s);assert.equal(s.players.A.hand.length,hand-4);assert.equal(s.chain.length,1);s=resolve(s);assert.equal(s.players.A.hand.length,hand);e.validate(s);
});
test('cancel selection preserves cards and cost, stale/forged choice rejected',()=>{
 let s=fixture();field(s,'A','M-antlion-01');field(s,'B','M-beetle-01');const source=put(s,'A','G-sky-shooter'),before=structuredClone(s.players);s=go(s,'programPlay',a=>a.source===source);assert.throws(()=>e.act(s,'A',s.revision,'forged'));s=go(s,'choose',a=>a.value==='cancel');assert.deepEqual(s.players,before);assert.equal(s.phase,'normal');
});
test('a field target that leaves for discard is not retrieved from a different zone',()=>{
 let s=fixture();const trap=put(s,'B','G-real-fishing');s.players.B.hand.pop();s.players.B.board.prepared.push({id:trap,faceDown:true});const source=put(s,'A','G-tank-battle');s=go(s,'programPlay',a=>a.source===source);s.players.B.board.prepared=[];s.players.B.discard.push(trap);s=resolve(s);assert.ok(s.players.B.discard.includes(trap));assert.ok(!s.players.B.hand.includes(trap));
});
test('removing a challenge participant ends comparison without crash or award',()=>{
 let s=fixture();field(s,'A','M-antlion-01');const target=field(s,'B','M-beetle-01');s=go(s,'challenge');s.players.B.board.main=null;s.players.B.discard.push(target);s=resolve(s);assert.equal(s.window,'challenge_end');assert.equal(s.players.A.growth,20);assert.equal(s.players.B.growth,20);s=resolve(s);assert.equal(s.challenge,null);
});
test('effect ordering is chosen after responses, not in target selection',()=>{
 let s=fixture();const source=put(s,'A','E-naoto');const cards=['C-box','P-cliff_goat','W-deepsea'].map(id=>put(s,'A',id,'discard'));s=go(s,'programPlay',a=>a.source===source);for(const id of cards)s=go(s,'choose',a=>a.value===id);assert.equal(s.phase,'response');s=resolve(s);assert.equal(s.choice.kind,'selected_order');s=go(s,'choose',a=>a.value===cards[2]);s=go(s,'choose',a=>a.value===cards[0]);s=go(s,'choose',a=>a.value===cards[1]);assert.deepEqual(s.players.A.deck.slice(-3),[cards[2],cards[0],cards[1]]);assert.equal(s.players.A.growth,25);
});
test('resolution-time same-type selection uses the hand after responses',()=>{
 let s=fixture();const source=put(s,'A','G-puzzle-2048'),one=put(s,'A','C-box'),two=put(s,'A','C-owl');s=go(s,'programPlay',a=>a.source===source);assert.equal(s.choice,null);s=resolve(s);assert.equal(s.choice.kind,'resolve_selection');s=go(s,'choose',a=>a.value===one);s=go(s,'choose',a=>a.value===two);assert.ok(s.players.A.deck.includes(one));assert.ok(s.players.A.deck.includes(two));e.validate(s);
});
test('dependent cost and target selection rejects dead-end payment types',()=>{
 let s=fixture();const main=field(s,'A','M-mushroom-02');const payment=put(s,'A','C-box'),target=put(s,'A','C-owl','discard');s=go(s,'programAbility',a=>a.source===main);assert.ok(e.legalActions(s).some(a=>a.value===payment));assert.ok(e.legalActions(s).filter(a=>a.kind==='choose'&&a.value!=='cancel').every(a=>e.CARDS[s.cards[a.value].cardId].type==='companion'));s=go(s,'choose',a=>a.value===payment);s=go(s,'choose',a=>a.value===target);s=resolve(s);assert.equal(s.players.A.deck[0],target);e.validate(s);
});
test('search follow-up selects from the original inspected remainder',()=>{
 let s=fixture();const main=field(s,'A','M-mushroom-07'),payment=put(s,'A','C-box','discard');s=go(s,'programAbility',a=>a.source===main);s=go(s,'choose',a=>a.value===payment);const peek=s.players.A.deck.slice(0,3);s=resolve(s);s=go(s,'choose',a=>a.value===peek[0]);assert.equal(s.choice.kind,'search_take');assert.ok(!s.choice.options.some(o=>o.id===peek[0]));s=go(s,'choose',a=>a.value===peek[1]);s=go(s,'choose',a=>a.value===peek[2]);assert.ok(s.players.A.hand.includes(peek[0]));assert.ok(s.players.A.discard.includes(peek[1]));assert.equal(s.players.A.deck.at(-1),peek[2]);e.validate(s);
});
test('recovery target and source stat target remain separate through resolution choice',()=>{
 let s=fixture();const main=field(s,'A','M-man-07'),target=put(s,'A','C-box','discard');s=go(s,'programAbility',a=>a.source===main&&a.target===target);s=resolve(s);assert.equal(s.choice.kind,'stat_parameter');s=go(s,'choose',a=>a.value==='wisdom');assert.equal(s.players.A.deck.at(-1),target);const stat=s.effects.find(x=>x.kind==='stat');assert.equal(stat.target,main);assert.equal(stat.wisdom,2);e.validate(s);
});
