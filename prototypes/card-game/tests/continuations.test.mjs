import test from 'node:test';
import assert from 'node:assert/strict';
import * as e from '../engine.mjs';
export function fixture(){const s=e.createGame(71);s.choice=null;s.pending=[];s.phase='normal';s.players.A.time=10;s.players.B.time=10;return s;}
export function put(s,a,id,zone='hand'){const p=s.players[a],x=p.deck.shift();s.cards[x].cardId=id;p[zone].push(x);return x;}
export function field(s,a,id,slot='main'){const x=put(s,a,id);s.players[a].hand.pop();const b=s.players[a].board;if(slot==='companions')b.companions.push(x);else b[slot]=x;s.cards[x].generation++;return x;}
export function go(s,kind,p=()=>true){const a=e.legalActions(s).find(a=>a.kind===kind&&p(a));assert.ok(a,'missing '+kind);return e.act(s,e.actor(s),s.revision,a.id);}
export function settle(s){let i=0;while(i++<90&&(s.phase==='trigger'||s.phase==='choice'||s.phase==='response'&&s.chain.length)){s=s.phase==='trigger'?go(s,'skip'):s.phase==='choice'?go(s,'choose',a=>a.value!=='cancel'):go(go(s,'pass'),'pass');}return s;}
test('departure ability belongs to the departed incarnation and survives replacement',()=>{
 let s=fixture();const old=field(s,'A','M-ghost-01');const next=put(s,'A','M-beetle-01');s=go(s,'place',a=>a.source===next);assert.ok(s.pending.some(t=>t.source===old));s=go(s,'trigger',a=>a.source===old);s=settle(s);assert.ok(s.players.A.discard.includes(old));assert.equal(s.players.A.board.main,next);e.validate(s);
});
test('next challenge reservation applies automatically before challenge trigger conditions',()=>{
 let s=fixture();const main=field(s,'A','M-dog-02');field(s,'B','M-beetle-01');const play=put(s,'A','G-dot-eater');s=go(s,'programPlay',a=>a.source===play);s=go(s,'trigger',a=>a.source===main);s=settle(s);const before=e.stats(s,'A').power;s=go(go(s,'pass'),'pass');s=go(s,'challenge',a=>a.parameter==='power');assert.equal(e.stats(s,'A').power,before+1);assert.equal(s.chain.length,0);assert.equal(s.effects.filter(x=>x.kind==='reservation').length,0);e.validate(s);
});
test('source departure does not cancel a next-win reservation; it fires once',()=>{
 let s=fixture();field(s,'A','M-beetle-08');field(s,'B','M-beetle-01');const otter=field(s,'A','C-otter','companions'),play=put(s,'A','G-dot-eater');s=go(s,'programPlay',a=>a.source===play);s=go(s,'trigger',a=>a.source===otter);s=settle(s);s.players.A.board.companions=[];s.players.A.discard.push(otter);s=go(go(s,'pass'),'pass');s=go(s,'challenge');s=settle(s);s=go(go(s,'pass'),'pass');assert.equal(s.players.A.growth,30);assert.equal(s.effects.filter(x=>x.kind==='reservation').length,0);e.validate(s);
});
