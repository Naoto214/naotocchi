import test from 'node:test';
import assert from 'node:assert/strict';
import {drawCondition} from '../fixtures.mjs';
import * as render from '../render.mjs';
// Canvas recorder checks the strings actually sent to the drawing API.
const recorder=()=>{const texts=[];const c=new Proxy({fillText:(...args)=>texts.push(args)}, {get:(o,k)=>o[k]??(()=>{})});return {c,texts};};
for(const species of [undefined,'dog','fish','penguin','frog'])test(`unrestricted ${species||'any'} draws ALL`,()=>{
 const {c,texts}=recorder();drawCondition(c,{x:0,y:0,species});assert.equal(texts[0][0],'ALL');
});
test('drag enlargement stays inside board at all four edges without changing actor coordinates',()=>{
 assert.equal(typeof render.actorVisual,'function','presentation geometry must be independently verifiable');
 for(const scale of [1,1.2,1.4,1.6])for(const [x,y]of [[0,0],[7,0],[0,5],[7,5]]){
  const a={x,y},before=JSON.stringify(a),b=render.actorVisual(a,{w:8,h:6},scale);
  assert.ok(b.x>=0&&b.y>=0&&b.x+b.w<=8&&b.y+b.h<=6);assert.equal(JSON.stringify(a),before);
 }
});

test('renderer enlarges only while dragging, follows current cell immediately, then shrinks without changing state',async()=>{
 const {loadSprites}=await import('../sprites.mjs');
 globalThis.Image=class{set src(v){this.srcValue=v;queueMicrotask(()=>this.onload())}};
 await loadSprites();globalThis.matchMedia=()=>({matches:false});globalThis.devicePixelRatio=1;
 const images=[],gradient={addColorStop(){}};
 const c=new Proxy({drawImage:(...a)=>images.push(a),createLinearGradient:()=>gradient,createRadialGradient:()=>gradient},{get:(o,k)=>o[k]??(()=>{})});
 const canvas={width:336,height:252,getContext:()=>c,getBoundingClientRect:()=>({width:336})};
 const draw=render.renderer(canvas),s={id:'test',w:8,h:6,walls:[],exits:[],spikes:[],gates:[],actors:[{id:'a',x:1,y:2,level:1,species:'dog'}],rescued:0};
 const before=JSON.stringify(s);draw(s,'a',0,null);const normal=images.at(-1)[7];
 for(let t=20;t<=160;t+=20)draw(s,'a',t,'a');
 assert.ok(images.at(-1)[7]>normal*1.2,'drag must enlarge the actual drawn PNG');
 assert.equal(JSON.stringify(s),before,'render must not change saved game state');
 s.actors[0].x=6;draw(s,'a',180,'a');assert.ok(images.at(-1)[5]>5.8,'fast drag must reach the new cell without easing lag');
 for(let t=200;t<=700;t+=20)draw(s,'a',t,null);
 assert.ok(Math.abs(images.at(-1)[7]-normal)<.001,'persistent selection after release must not keep enlargement');
 s.gates=[{x:6,y:2,min:1}];draw(s,'a',720,'a');
 assert.ok(images.at(-1)[0].srcValue.endsWith('/owl.png'),'occupied gate guardian must remain above the enlarged actor');
});
