import test from 'node:test';
import assert from 'node:assert/strict';
import {renderer} from '../render.mjs';
import {loadSprites} from '../sprites.mjs';
import {conditionLayout} from '../fixtures.mjs';

test('A/B changes actual sprite drawing by 10 CSS px only, release restores A and no owl is drawn',async()=>{
 globalThis.Image=class{set src(v){this.srcValue=v;queueMicrotask(()=>this.onload())}};
 await loadSprites();globalThis.matchMedia=()=>({matches:true});globalThis.devicePixelRatio=2;
 for(const width of [336,390]){
 const images=[],gradient={addColorStop(){}};
 const c=new Proxy({drawImage:(...a)=>images.push(a),createLinearGradient:()=>gradient,createRadialGradient:()=>gradient},{get:(o,k)=>o[k]??(()=>{})});
 const canvas={width:width*2,height:width*1.5,getContext:()=>c,getBoundingClientRect:()=>({width})};
 const draw=renderer(canvas),s={id:'10',w:8,h:6,walls:[],exits:[],spikes:[],gates:[{x:2,y:2,min:1}],actors:[{id:'a',x:2,y:2,level:1,species:'dog'}],rescued:0};
 const before=JSON.stringify(s);
 draw(s,'a',0,'a','A');const a=images.findLast(i=>i[0].srcValue.includes('/dog/'));
 draw(s,'a',20,'a','B');const b=images.findLast(i=>i[0].srcValue.includes('/dog/'));
 assert.ok(Math.abs((a[6]-b[6])*width/8-10)<1e-6,'B offsets rendered pixels by 10 CSS px');
 assert.equal(a[5],b[5]);assert.equal(a[7],b[7]);assert.equal(a[8],b[8]);
 draw(s,'a',40,null,'B');const released=images.at(-1);
 draw(s,'a',60,null,'A');assert.deepEqual(images.at(-1).slice(5),released.slice(5));
 assert.equal(JSON.stringify(s),before);
 assert.ok(images.every(i=>!i[0].srcValue.includes('owl')),'no guardian images in gameplay');
 }
});
test('condition icons use at least 16px of visible extent and remain centered in the 42px cell',()=>{
 for(const species of ['dog','fish','penguin','frog'])for(const condition of [{min:2},{max:3},{exact:1},{}]){
 const c={measureText:()=>({width:16,actualBoundingBoxAscent:9,actualBoundingBoxDescent:2})};
 const v=conditionLayout(c,{species,...condition});
 assert.ok(Math.max(v.icon.w,v.icon.h)*42>=16);
 assert.ok(v.left>=.025&&v.right<=.975);
 assert.ok(v.icon.y>=.55&&v.icon.y+v.icon.h<=.975);
 assert.ok(Math.abs((v.left+v.right)/2-.5)<1e-8);
 }
});

test('all twelve solutions through pointer movement and A/B rendering preserve identical saved states',async()=>{
 const {stages}=await import('../stages.mjs');
 const {createState,release,complete}=await import('../engine.mjs');
 const {movePointer}=await import('../input.mjs');
 const {pack,restore}=await import('../store.mjs');
 const fs=await import('node:fs');
 const solutions=JSON.parse(fs.readFileSync(new URL('../solutions.json',import.meta.url)));
 globalThis.matchMedia=()=>({matches:false});globalThis.devicePixelRatio=1;
 const gradient={addColorStop(){}},c=new Proxy({createLinearGradient:()=>gradient,createRadialGradient:()=>gradient},{get:(o,k)=>o[k]??(()=>{})});
 const canvas={width:336,height:252,getContext:()=>c,getBoundingClientRect:()=>({width:336})};
 for(const [index,stage]of stages.entries()){
 const results=[];
 for(const mode of ['A','B']){
 const s=createState(stage),draw=renderer(canvas),history=[];let time=0;
 for(const drag of solutions[stage.id]){
 history.push(structuredClone(s));
 for(const [x,y]of drag.path){const a=s.actors.find(a=>a.id===drag.id);assert.ok(a);
 movePointer(s,drag.id,{x:a.x+.5,y:a.y+.5},{x:x+.5,y:y+.5});
 const before=JSON.stringify(s);draw(s,drag.id,time+=30,drag.id,mode);assert.equal(JSON.stringify(s),before);
 }
 assert.ok(release(s));draw(s,drag.id,time+=160,null,mode);
 assert.deepEqual(restore(pack(index,s,history,[])).state,s);
 }
 assert.ok(complete(s),`${stage.id} ${mode} completes`);results.push(pack(index,s,history,[]));
 }
 assert.equal(results[0],results[1],`${stage.id} A/B saved state matches`);
 }
});
