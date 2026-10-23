import test from 'node:test';import assert from 'node:assert/strict';import {stages} from '../stages.mjs';import {WorldSession} from '../../naopoyo-world/session.mjs';import {clone,move,complete,mass} from '../../naopoyo-v2/engine.mjs';import {execute} from '../witness.mjs';
test('I05 legitimate no-remerge alternative: two irradiations then all five use the one-star exit',()=>{
 const q=new WorldSession(stages[4]);execute(q,{id:'a',dx:1,dy:0});execute(q,{id:'a',dx:1,dy:0});q.advance(3000);q.advance(8000);assert.ok(q.state.actors.every(a=>a.level===1));assert.equal(q.state.actors.length,5);
 while(q.state.actors.length){const id=q.state.actors[0].id,nodes=[{s:clone(q.state),path:[]}],seen=new Set();let path;
  for(let i=0;i<nodes.length&&i<1000;i++){const n=nodes[i];if(!n.s.actors.some(a=>a.id===id)){path=n.path;break}for(let dx=-1;dx<=1;dx++)for(let dy=-1;dy<=1;dy++){if(!dx&&!dy)continue;const s=clone(n.s),r=move(s,id,dx,dy,q.policy());if(!r.ok||r.merged)continue;const k=JSON.stringify(s.actors);if(seen.has(k))continue;seen.add(k);nodes.push({s,path:[...n.path,{id,dx,dy}]})}}
  assert.ok(path);for(const c of path)execute(q,c);
 }
 assert.ok(complete(q.state));assert.equal(mass(q.state),5);
});
for(const id of ['I01','I04','I07'])test(id+' sole mandatory gate is an eight-neighbor cut',()=>{const s=stages.find(s=>s.id===id),g=s.gates[0],seen=new Set(),todo=s.actors.map(a=>[a.x,a.y]);while(todo.length){const [x,y]=todo.pop(),k=`${x},${y}`;if(x<0||x>7||y<0||y>7||seen.has(k)||s.walls.some(p=>p[0]===x&&p[1]===y)||(x===g.x&&y===g.y))continue;seen.add(k);for(let dx=-1;dx<=1;dx++)for(let dy=-1;dy<=1;dy++)if(dx||dy)todo.push([x+dx,y+dy])}assert.ok(s.exits.every(e=>!seen.has(`${e.x},${e.y}`)));assert.ok(s.spikes.every(e=>!seen.has(`${e.x},${e.y}`)));assert.ok(s.events.filter(e=>e.kind==='beam').every(e=>e.cells.every(([x,y])=>!seen.has(`${x},${y}`))))});
