// Reuse chapter1 constructive witness; import substitutions only.
// Verification tooling only: constructive routes are never loaded by the game.
import assert from 'node:assert/strict';
import {WorldSession} from './session.mjs';
import {clone,move,mass,validState,complete} from './engine.mjs';
const dirs=[[1,0],[1,-1],[1,1],[0,-1],[0,1],[-1,0],[-1,-1],[-1,1]];
export function execute(q,c){
 if(c.wait!==undefined){q.advance(c.wait);return}
 const a=q.state.actors.find(a=>a.id===c.id); assert.ok(a,JSON.stringify(c));
 assert.ok(q.begin(a.id,{x:a.x+.5,y:a.y+.5}));
 const r=q.travel({x:a.x+.5+c.dx,y:a.y+.5+c.dy});q.end();assert.equal(r.at(-1)?.ok,true,JSON.stringify(c));
}
export function solve(stage){
 const q=new WorldSession(stage),commands=[],total=mass(q.state);
 function verify(){assert.equal(mass(q.state),total);assert.ok(validState(stage,q.state),stage.id+' valid');const restored=new WorldSession(stage,q.serialize());assert.ok(restored.restored,stage.id+' restores');assert.deepEqual(restored.snapshot(),q.snapshot())}
 function act(c){execute(q,c);commands.push(c);verify()}
 function route(id,goal,label='route'){
  const nodes=[{s:clone(q.state),parent:-1}],seen=new Set();let found=-1;
  for(let i=0;i<nodes.length&&i<15000;i++){
   const n=nodes[i],a=n.s.actors.find(a=>a.id===id);if(goal(n.s,a)){found=i;break}if(!a)continue;
   for(const [dx,dy] of dirs){
    const s=clone(n.s);const r=move(s,id,dx,dy,q.policy());if(!r.ok || (label==='rescue' && (r.merged || r.split)))continue;
    // Search during irradiation must include actual beam semantics.
    if(q.stage.events.some(e=>e.kind==='beam')){const sim=new WorldSession(stage);sim.apply({...q.snapshot(),state:s});sim.active={id,logical:{...s.actors.find(a=>a.id===id)},intent:{},cursor:{}};sim.beams();Object.assign(s,sim.state)}
    const key=JSON.stringify([s.actors.map(a=>[a.id===id?'held':a.species,a.x,a.y,a.level]).sort(),s.rescuedBySpecies]);
    if(seen.has(key))continue;seen.add(key);nodes.push({s,parent:i,c:{id,dx,dy}});
   }
  }
  if(found<0)throw Error(`${stage.id} ${label} ${id} unproven; ${nodes.length} states; ${JSON.stringify(q.state.actors)}`);
  const path=[];for(let i=found;nodes[i].parent>=0;i=nodes[i].parent)path.unshift(nodes[i].c);path.forEach(act);
 }
 const level=(n)=>(s,a)=>a?.level===n;
 const pos=(x,y)=>(s,a)=>a?.x===x&&a?.y===y;
 const rescue=id=>route(id,(s,a)=>!a,'rescue');
 const find=(n,species)=>q.state.actors.find(a=>a.level===n&&(!species||a.species===species))?.id;
 const joinOnes=()=>{const ones=q.state.actors.filter(a=>a.level===1);assert.ok(ones.length>=2);route(ones[0].id,level(2),'recombine ones');return ones[0].id};
 switch(stage.id){
 case 'light-arrival':rescue('a');break;
 case 'light-together':route('a',level(2));rescue('a');break;
 case 'light-addition':route('a',level(3));rescue('a');break;
 case 'light-unravel':route('a',level(2));rescue('a');rescue(find(1));break;
 case 'light-key':route('a',level(3));rescue('a');break;
 case 'light-remainder':route('a',level(8));rescue('a');rescue(find(3));break;
 case 'light-threads':route('a',pos(3,5));assert.equal(q.state.actors.find(a=>a.id==='a').level,4);rescue('a');{const id=joinOnes();route(id,level(3));rescue(id);}break;
 case 'light-order':route('a',level(4));route('a',pos(4,4));route('a',level(2));rescue('a');rescue(joinOnes());break;
 case 'light-knot':route('a',level(5));route('a',pos(4,4));route('a',pos(5,4));rescue('a');{const id=joinOnes();route(id,level(3));rescue(id);}break;
 case 'light-owl-trial':route('a',level(8));route('a',pos(5,2));{const id=find(3);route(id,pos(5,6));route('a',pos(6,4));assert.equal(q.state.actors.find(a=>a.id==='a').level,5);rescue('a');route(id,level(6));rescue(id);}break;
 }
 assert.ok(complete(q.state),stage.id);verify();
 const end=q.snapshot();assert.ok(q.undo());assert.ok(!complete(q.state));q.paused=false;const last=commands.at(-1);execute(q,last);assert.deepEqual(q.snapshot(),end,'final Undo replay');q.retry();assert.deepEqual(q.state,new WorldSession(stage).state);
 return {stage:stage.id,complete:true,mass:total,commands,moves:end.state.moves,time:end.time,shortestProven:false};
}
