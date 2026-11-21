import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createRequire} from 'node:module';
import {restoreEpisode,source,sx,sy} from './episode-scene.mjs';
const require=createRequire(import.meta.url);
const read=name=>JSON.parse(fs.readFileSync(new URL(name,import.meta.url)));
const baseline=process.env.UNMODIFIED_V9==='1';
const native=baseline?source:require('./movement.cjs').patchMovement(source);
const distance=(a,b)=>Math.hypot((a.x-b.x)*sx,(a.y-b.y)*sy);
function rays(t,key){
 const b=t.model.probe.actors().find(a=>a.key===key);let count=0;
 for(let i=0;i<48;i++){
  const angle=i*Math.PI/24,z={x:b.x+8*Math.cos(angle)/sx,y:b.y+8*Math.sin(angle)/sy};
  if(t.model.probe.yieldLeg(b,b,z,new Map()))count++;
 }
 return count;
}
function issue(t){
 // The observer captured the post-command target of the mover, including
 // accepted native requests. Restore THIS individual to the pre-command state.
 t.a.manualUntil=0;const before={...t.a};assert.ok(t.model.move(t.a.key,t.goal,'ambient'));
 for(let i=0;i<100&&t.a.target;i++)t.model.step(.05);
 return {walk:distance(t.a,before),gain:distance(before,t.goal)-distance(t.a,t.goal)};
}
test('the measured ordinary move at 117.412s advances its own intention while keeping the neighbor’s last 8px exit',()=>{
 const t=restoreEpisode(read('closing-request.json'),native);
 const initial=new Map(t.model.probe.actors().map(a=>[a.key,rays(t,a.key)]));assert.equal(initial.get('pet:dog'),8);
 const result=issue(t);assert.ok(result.walk>=8-1e-6&&result.gain>.75,JSON.stringify(result));
 for(const [key,n] of initial)if(key!==t.a.key&&n)assert.ok(rays(t,key)>0,key+' lost its last exit');
});
test('when the crowd opens at 559.760s an old intention completes a normal walk ≥8 CSS px',()=>{
 const row=read('dog-episode.json').requests.find(r=>r.index===793),t=restoreEpisode(row,native);
 const result=issue(t);assert.ok(result.walk>=8-1e-6&&result.gain>.75,JSON.stringify(result));assert.equal(t.a.ambientEscape,false);
});
