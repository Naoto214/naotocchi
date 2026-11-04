import test from 'node:test';
import assert from 'node:assert/strict';
import {BOARD as OLD_BOARD} from '../../prototypes/life-sugoroku/data.mjs';
import {PLAYER_SPECIES,NPCS} from '../../prototypes/life-sugoroku/canonical.mjs';
let T={},R={};
try {T=await import('../../prototypes/life-sugoroku/tiles-v4.mjs');} catch(e) {if(e.code!=='ERR_MODULE_NOT_FOUND')throw e;}
try {R=await import('../../prototypes/life-sugoroku/rules-v4.mjs');} catch(e) {if(e.code!=='ERR_MODULE_NOT_FOUND')throw e;}
const expected=['shop','growth-plus','event','money-minus','item','quick','money-plus','friend','time','game','growth-plus','growth-minus','shop','money-plus','event','friend','item','quick','growth-plus','growth-minus','transform','event','money-plus','partner','shop','growth-plus','event','money-minus','item','event','quick','partner','time','event','game','growth-minus','shop','money-plus','event','partner','transform','partner-farewell','quick','money-minus','time','friend-farewell','growth-plus','friend'];
const player=()=>({id:0,character:structuredClone(PLAYER_SPECIES[2]),stage:4,sodachi:40,money:30,pos:0,items:['double'],history:[],...R.initialRelations()});
const rng=()=>{let seed=117;return n=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return Math.floor(seed/4294967296*n);};};
const act=(p,type,draw=rng(),round=1)=>R.offer(p,type,draw,round);
const pick=(p,pending,index=0)=>R.select(p,pending,index,1);

test('V4 exact 48-ID allocation retains V3 terrain and graph',()=>{
 assert.equal(T.BOARD?.length,48);assert.equal(Object.keys(T.TILE_SCHEMA).length,15);
 assert.deepEqual(T.BOARD.map(n=>n.type),expected);
 for(const n of T.BOARD){for(const k of ['id','x','y','surface','region','worldRegion','next'])assert.deepEqual(n[k],OLD_BOARD[n.id][k]);assert.ok(T.TILE_SCHEMA[n.type].icon);assert.ok(T.TILE_SCHEMA[n.type].description);}
 assert.deepEqual(Object.fromEntries(Object.entries(Object.groupBy(T.BOARD,n=>n.type)).map(([k,v])=>[k,v.length])),{'shop':4,'growth-plus':5,event:7,'money-minus':3,item:3,quick:4,'money-plus':4,friend:3,time:3,game:2,'growth-minus':3,transform:2,partner:3,'partner-farewell':1,'friend-farewell':1});
 const seen=new Set(),todo=[0];while(todo.length){const id=todo.pop();if(seen.has(id))continue;seen.add(id);todo.push(...T.BOARD[id].next);}assert.equal(seen.size,48);
});
test('three unique official friend candidates exclude current followers and cap at three',()=>{
 assert.equal(typeof R.offer,'function');const p=player(),draw=rng();
 for(let i=0;i<3;i++){const q=act(p,'friend',draw);assert.equal(q.candidates.length,3);assert.equal(new Set(q.candidates).size,3);assert.ok(q.candidates.every(id=>NPCS.some(n=>n.id===id&&n.kind==='companion')&&!p.friends.includes(id)));pick(p,q);}
 assert.equal(p.friends.length,3);assert.equal(p.rerolls,3);const old=structuredClone(p);const q=act(p,'friend',draw);assert.equal(q.kind,'result');assert.deepEqual(p,old);
});
test('friend departure is compulsory, deterministic and consumes only unused reroll',()=>{
 const p=player();for(let i=0;i<3;i++)pick(p,act(p,'friend'));
 const before=p.friends.slice(),sd=p.sodachi,m=p.money;
 const q=act(p,'friend-farewell',()=>1);assert.equal(p.friends.length,2);assert.ok(!p.friends.includes(before[1]));assert.equal(p.rerolls,2);assert.equal(p.sodachi,sd);assert.equal(p.money,m);assert.equal(q.kind,'result');assert.equal(p.history.at(-1).type,'friend-farewell');
 while(p.rerolls)R.spendReroll(p);act(p,'friend-farewell');assert.equal(p.rerolls,0);act(p,'friend-farewell');const none=structuredClone(p);act(p,'friend-farewell');assert.deepEqual(p,none);
});
test('reacquiring a friend never farms new reroll grants',()=>{
 const p=player();let q=act(p,'friend',()=>0),id=q.candidates[0];pick(p,q);R.spendReroll(p);act(p,'friend-farewell',()=>0);q=act(p,'friend',()=>0);assert.equal(q.candidates[0],id);pick(p,q);assert.equal(p.rerolls,0);assert.equal(p.rerollLedger.filter(h=>h.kind==='grant').length,1);assert.throws(()=>R.spendReroll(p));
});
test('partner choices ignore gender, orientation and stage; protection is precisely scoped',()=>{
 const p=player();p.stage=1;p.character.orientationId='aro';const q=act(p,'partner');assert.equal(q.candidates.length,3);assert.ok(q.candidates.every(id=>NPCS.some(n=>n.id===id&&n.kind==='partner')));pick(p,q);assert.equal(p.partnerShield,1);
 assert.equal(R.numeric(p,'money-minus',1).delta.money,-5);assert.equal(p.partnerShield,1);
 const result=R.numeric(p,'growth-minus',1);assert.equal(result.delta.sodachi,0);assert.equal(result.protectedBy,p.partner);assert.equal(p.partnerShield,0);assert.equal(R.numeric(p,'growth-minus',1).delta.sodachi,-5);
 assert.equal(p.history.at(-2).type,'tile');
});
test('marriage protects all normal growth-minus tiles but separation always deducts ten',()=>{
 const p=player();pick(p,act(p,'partner'));const id=p.partner;act(p,'partner');assert.equal(p.married,true);assert.equal(p.partnerShield,0);
 for(let i=0;i<4;i++)assert.equal(R.numeric(p,'growth-minus',1).delta.sodachi,0);
 const old=structuredClone(p);const q=act(p,'partner');assert.equal(q.kind,'result');assert.deepEqual(p,old);
 p.charm=true;const farewell=act(p,'partner-farewell');assert.equal(farewell.delta.sodachi,-10);assert.equal(p.partner,null);assert.equal(p.married,false);assert.equal(p.partnerShield,0);assert.ok(p.history.some(h=>h.type==='marriage'&&h.npc===id));assert.ok(p.history.some(h=>h.type==='partner-farewell'&&h.npc===id));
 assert.equal(R.numeric(p,'growth-minus',1).delta.sodachi,0);assert.equal(p.charm,false);
});
test('unmarried separation deducts five and a new partner restores single protection',()=>{
 const p=player();pick(p,act(p,'partner'));assert.equal(act(p,'partner-farewell').delta.sodachi,-5);const q=act(p,'partner');pick(p,q);assert.equal(p.partnerShield,1);
});
test('time always changes stages and preserves species/resources/relations',()=>{
 for(let stage=1;stage<=8;stage++)for(let sample=0;sample<10;sample++){
 const p=player();p.stage=stage;pick(p,act(p,'partner'));pick(p,act(p,'friend'));const old=structuredClone(p);act(p,'time',n=>sample%n,5);
 assert.notEqual(p.stage,stage);assert.ok(p.stage>=1&&p.stage<=8);for(const k of ['character','sodachi','money','items','friends','partner','rerolls','pos'])assert.deepEqual(p[k],old[k]);
 if(p.stage<stage)assert.equal(p.suppressUntil,6);else assert.equal(p.evolvedRound,5);
 }
 const deltas=[];for(let i=0;i<10;i++){const p=player();act(p,'time',()=>i);deltas.push(p.stage-4);}assert.deepEqual(deltas,[1,1,1,1,-1,-1,-1,-1,2,-2]);
});
test('transform stores three distinct other species and applies once without resource changes',()=>{
 const p=player();pick(p,act(p,'friend'));pick(p,act(p,'partner'));act(p,'partner');const old=structuredClone(p),q=act(p,'transform');assert.equal(q.candidates.length,3);assert.equal(new Set(q.candidates).size,3);assert.ok(!q.candidates.includes(p.character.id));
 const resumed=JSON.parse(JSON.stringify({p,q}));assert.deepEqual(pick(p,q,2),pick(resumed.p,resumed.q,2));assert.deepEqual(p,resumed.p);assert.notEqual(p.character.id,old.character.id);for(const k of ['stage','sodachi','money','items','friends','partner','married','rerolls','pos'])assert.deepEqual(p[k],old[k]);assert.throws(()=>pick(p,q,0));
});
test('numeric tiles are single-effect ±5 in every game length and clamp actual deltas',()=>{
 for(const [type,sd,m]of[['growth-plus',5,0],['growth-minus',-5,0],['money-plus',0,5],['money-minus',0,-5]]){const p=player();assert.deepEqual(R.numeric(p,type,1).delta,{sodachi:sd,money:m});}
 const p=player();p.sodachi=98;p.money=2;assert.equal(R.numeric(p,'growth-plus',1).delta.sodachi,2);assert.equal(R.numeric(p,'money-minus',1).delta.money,-2);
});
test('invalid choices and malformed relationship state cannot be committed',()=>{
 const p=player(),q=act(p,'friend'),before=structuredClone(p);assert.throws(()=>pick(p,q,3));assert.throws(()=>pick(p,q,-1));assert.deepEqual(p,before);assert.equal(R.validate(p),true);
 for(const patch of [{friends:['invalid']},{friends:['river_otter','river_otter']},{rerolls:4},{partner:null,married:true},{partner:null,partnerShield:1},{rerollGranted:['invalid']}])assert.equal(R.validate({...p,...patch}),false);
});
