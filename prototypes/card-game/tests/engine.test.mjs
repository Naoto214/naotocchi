import test from 'node:test';
import assert from 'node:assert/strict';
let api;try { api=await import('../engine.mjs'); } catch {}
test('human game engine exists',()=>assert.ok(api,'browser engine missing'));
test('40 cards, private projection, stale commands and immutable transitions',()=>{
 const s=api.createGame(123);assert.equal(Object.keys(s.cards).length,80);
 const v=api.view(s,'A');assert.equal(v.players.B.handCount,5);assert.equal(v.players.B.hand,undefined);assert.equal(v.players.A.deck,undefined);
 assert.throws(()=>api.act(s,'B',0,'forged'));
 const before=JSON.stringify(s),a=api.legalActions(s)[0],next=api.act(s,api.actor(s),s.revision,a.id);
 assert.equal(JSON.stringify(s),before);assert.equal(next.revision,1);assert.throws(()=>api.act(next,api.actor(next),0,a.id));
});
test('save replay validates state, commands and restores exact decisions',()=>{
 let s=api.createGame(52);for(let i=0;i<20;i++){const a=api.legalActions(s)[0];s=api.act(s,api.actor(s),s.revision,a.id);}
 assert.deepEqual(api.restore(api.save(s)),s);
 const bad=JSON.parse(api.save(s));bad.commands[0]='forged';assert.throws(()=>api.restore(JSON.stringify(bad)));
});
test('both human command seats complete R10 with legal cards, choices and chains',()=>{
 let s=api.createGame(719),kinds=new Set(),maxChain=0;
 for(let i=0;i<1800 && s.phase!=='finished';i++){
  const actions=api.legalActions(s);assert.ok(actions.length);
  const ranked=[...actions].sort((a,b)=>score(b)-score(a));const a=ranked[0];kinds.add(a.kind);
  s=api.act(s,api.actor(s),s.revision,a.id);maxChain=Math.max(maxChain,s.chain.length);api.validate(s);
 }
 assert.equal(s.phase,'finished');assert.equal(s.round,10);assert.ok(['A','B',null].includes(s.result.winner));
 for(const k of ['choose','place','play','pass','challenge'])assert.ok(kinds.has(k),k);
 assert.ok(maxChain>=2,'must stack multiple effects');
 function score(a){return {choose:100,trigger:95,place:80,relationship:75,challenge:70,ability:65,play:60,skip:1,pass:0}[a.kind]??0;}
});
test('projection preserves physical identity for hand selection',()=>{
 const s=api.createGame(719);assert.deepEqual(api.view(s,'A').players.A.hand.map(c=>c.id),s.players.A.hand);
});
