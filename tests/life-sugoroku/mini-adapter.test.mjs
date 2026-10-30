import test from 'node:test';
import assert from 'node:assert/strict';

let mini = {};
try { mini = await import('../../prototypes/life-sugoroku/minigame-adapter.mjs'); }
catch (e) { if (e.code !== 'ERR_MODULE_NOT_FOUND') throw e; }
const rng = seed => n => { seed = (Math.imul(seed,1664525)+1013904223)>>>0; return Math.floor(seed/4294967296*n); };
const copy = x => JSON.parse(JSON.stringify(x));

test('V3 adapter exposes truthful provenance and no official reaction claim', () => {
  assert.equal(typeof mini.makeMiniChallenge, 'function');
  assert.equal(mini.MINI_RULES[0].officialId, null);
  assert.equal(mini.MINI_RULES[1].officialId, 'memory-cards');
  assert.equal(mini.MINI_RULES[2].officialId, 'lights-out');
});
test('seeded generators have replayable balanced decks and solvable minimal-par lights', () => {
  for (let seed=1;seed<=80;seed++) for (let kind=0;kind<3;kind++) {
    const c=mini.makeMiniChallenge(kind,rng(seed));
    assert.deepEqual(c,mini.makeMiniChallenge(kind,rng(seed)));
    assert.equal(mini.validateMiniAttempt(kind,c,mini.startMiniAttempt(kind,c)),true);
    if(kind===1) for(let card=0;card<4;card++) assert.equal(c.deck.filter(v=>v===card).length,2);
    if(kind===2) { assert.equal(c.par,mini.solveShortLights(c.cells).length); assert.ok(c.par>0&&c.par<=3); }
  }
});
test('cross toggle never wraps rows and solving twice restores the original', () => {
  const empty=Array(9).fill(0), board=mini.toggleShortLights(empty,2);
  assert.deepEqual(board,[0,1,1,0,0,1,0,0,0]);
  assert.deepEqual(mini.toggleShortLights(board,2),empty);
  assert.deepEqual(empty,Array(9).fill(0));
  assert.throws(()=>mini.toggleShortLights(empty,9));
});
test('reaction early tap is zero and JSON-restored result is terminal', () => {
  const c={delay:1500}, a=mini.startMiniAttempt(0,c);
  assert.equal(mini.applyMiniInput(0,c,a,{type:'input',ms:-1}).score,0);
  const r=mini.applyMiniInput(0,c,a,{type:'input',ms:200});
  assert.equal(r.score,80); assert.equal(a.done,false);
  assert.throws(()=>mini.applyMiniInput(0,c,copy(r.attempt),{type:'input',ms:200}));
});
test('memory locks the third tap, restores pending pairs and settles once', () => {
  const c={deck:[0,0,1,1,2,2,3,3]}; let a=mini.startMiniAttempt(1,c);
  const run=command=>{const r=mini.applyMiniInput(1,c,a,command);a=r.attempt;return r;};
  run({type:'input',index:0});run({type:'input',index:1});
  a=copy(a); assert.equal(mini.validateMiniAttempt(1,c,a),true);
  assert.throws(()=>run({type:'input',index:2}));
  run({type:'settle',elapsed:349});assert.equal(a.matched.length,0);
  run({type:'settle',elapsed:1});assert.deepEqual(a.matched,[0,1]);assert.equal(a.tries,1);
  run({type:'settle',elapsed:350});assert.equal(a.matched.length,2);
  for(const index of [2,3,4,5,6,7]) { run({type:'input',index}); if(a.open.length===2)run({type:'settle',elapsed:350}); }
  assert.equal(a.done,true);assert.equal(a.score,100);assert.equal(a.tries,4);
});
test('memory mismatch remains locked for 900ms and timeout does not award unresolved pair', () => {
  const c={deck:[0,1,0,1,2,2,3,3]}; let a=mini.startMiniAttempt(1,c);
  a=mini.applyMiniInput(1,c,a,{type:'input',index:0}).attempt;
  a=mini.applyMiniInput(1,c,a,{type:'input',index:1}).attempt;
  a=mini.applyMiniInput(1,c,a,{type:'settle',elapsed:800}).attempt;assert.equal(a.open.length,2);
  a=mini.applyMiniInput(1,c,copy(a),{type:'settle',elapsed:100}).attempt;assert.equal(a.open.length,0);
  const r=mini.applyMiniInput(1,c,a,{type:'tick',elapsed:30000});assert.equal(r.score,10);assert.equal(r.attempt.done,true);
});
test('lights scores canonical efficiency with a declared one-board normalization', () => {
  const c=mini.makeMiniChallenge(2,rng(23));let a=mini.startMiniAttempt(2,c);
  const solution=mini.solveShortLights(c.cells);
  for(const index of solution)a=mini.applyMiniInput(2,c,a,{type:'input',index,elapsed:50}).attempt;
  assert.equal(a.score,100);assert.equal(a.done,true);
  const b=mini.startMiniAttempt(2,c);assert.equal(mini.applyMiniInput(2,c,b,{type:'tick',elapsed:30000}).score,10);
  assert.equal(mini.scoreShortLights({solved:true,moves:5,par:3}),94);
});
test('canonical score extracts retain official reference values', () => {
  assert.equal(mini.scoreOfficialLights({solved:0,totalMoves:0,totalPar:3}),10);
  assert.equal(mini.scoreOfficialLights({solved:1,totalMoves:3,totalPar:3}),52);
  assert.equal(mini.scoreOfficialLights({solved:3,totalMoves:12,totalPar:12}),100);
  assert.equal(mini.scoreMemoryPairs({matched:4,tries:4,elapsed:3000,pairs:4}),99);
  assert.equal(mini.scoreMemoryPairs({matched:3,tries:8,elapsed:30000,pairs:4}),31);
});
test('snapshot validation rejects corruption, impossible counters and legacy sequence shape', () => {
  const c={deck:[0,0,1,1,2,2,3,3]},a=mini.startMiniAttempt(1,c);
  assert.throws(()=>mini.validateMiniAttempt(1,{sequence:[0,1,2,3,0]},a));
  for(const mutate of [s=>s.open=[0,0],s=>s.matched=[0,2],s=>s.elapsed=NaN,s=>s.tries=-1,s=>s.done=true]) {
    const bad=copy(a);mutate(bad);assert.throws(()=>mini.validateMiniAttempt(1,c,bad));
  }
  assert.throws(()=>mini.applyMiniInput(1,c,a,{type:'tick',elapsed:-1}));
  assert.throws(()=>mini.makeMiniChallenge(1,()=>9));
});
test('every 3x3 board has an executable minimal solution and constant RNG terminates', () => {
  for(let mask=0;mask<512;mask++) {
    const cells=Array.from({length:9},(_,i)=>(mask>>i)&1);
    let solved=[...cells];for(const i of mini.solveShortLights(cells))solved=mini.toggleShortLights(solved,i);
    assert.deepEqual(solved,Array(9).fill(0));
  }
  assert.equal(mini.makeMiniChallenge(2,()=>0).par,3);
});
test('move exhaustion and timeout resolve once, including a saved pending final pair', () => {
  const c=mini.makeMiniChallenge(2,()=>0);let a=mini.startMiniAttempt(2,c);
  for(let i=0;i<20;i++)a=mini.applyMiniInput(2,c,a,{type:'input',index:8}).attempt;
  assert.equal(a.score,10);assert.equal(mini.validateMiniAttempt(2,c,copy(a)),true);
  assert.throws(()=>mini.applyMiniInput(2,c,a,{type:'tick',elapsed:1}));
  const cards={deck:[0,0,1,1,2,2,3,3]};let m=mini.startMiniAttempt(1,cards);
  for(let i=0;i<6;i++) {m=mini.applyMiniInput(1,cards,m,{type:'input',index:i}).attempt;if(i%2)m=mini.applyMiniInput(1,cards,m,{type:'settle',elapsed:350}).attempt;}
  m=mini.applyMiniInput(1,cards,m,{type:'tick',elapsed:28900}).attempt;
  for(const index of [6,7])m=mini.applyMiniInput(1,cards,m,{type:'input',index}).attempt;
  m=mini.applyMiniInput(1,cards,copy(m),{type:'settle',elapsed:350}).attempt;
  assert.equal(m.score,31);assert.equal(m.matched.length,6);assert.equal(mini.validateMiniAttempt(1,cards,m),true);
});
