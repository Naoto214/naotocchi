import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {stages} from '../stages.mjs';
import * as engine from '../engine.mjs';
import * as store from '../store.mjs';
import {movePointer} from '../input.mjs';
import {legacyStages} from '../legacy-stages.mjs';
const source=fs.readFileSync(new URL('../app.mjs',import.meta.url),'utf8').replace(/^import[^\n]*\n/gm,'');
const solutions=JSON.parse(fs.readFileSync(new URL('../solutions.json',import.meta.url)));
// Headless DOM adapter only: the shipped app's coordinate mapping, event listeners,
// coalescing, travel, finish, save and Undo run unmodified. Rendering is not tested.
function app(index,width,raw=store.pack(index,engine.createState(stages[index]),[],[])){
 const nodes=new Map(),storage=new Map([[store.KEY,raw]]);
 const element=()=>({handlers:{},style:{},dataset:{},parentElement:{},addEventListener(k,f){this.handlers[k]=f},setAttribute(){},replaceChildren(){},setPointerCapture(){},close(){},showModal(){},getBoundingClientRect(){return {left:13,top:47,width:width-32,height:(width-32)*6/8}}});
 const get=id=>{if(!nodes.has(id))nodes.set(id,element());return nodes.get(id)};
 const context={...engine,...store,stages,legacyStages,movePointer,fitBoard(){},renderer:()=>()=>{},loadSprites:async()=>[],speciesNames:{},requestAnimationFrame(){},document:{getElementById:get,createElement:element,querySelectorAll:()=>[],addEventListener(){}},window:{addEventListener(){}},localStorage:{getItem:k=>storage.get(k),setItem:(k,v)=>storage.set(k,v)},fetch:async()=>({json:async()=>solutions})};
 vm.runInNewContext(source,context);
 const board=get('board'),rect=board.getBoundingClientRect();
 const event=(x,y)=>({clientX:rect.left+x*rect.width/8,clientY:rect.top+y*rect.height/6,pointerId:7,preventDefault(){}});
 const state=()=>JSON.parse(storage.get(store.KEY));
 return {get,state,raw:()=>storage.get(store.KEY),drag(id,path,mode='fast'){
  let a=state().state.actors.find(a=>a.id===id),from=[a.x+.5,a.y+.5];board.handlers.pointerdown(event(...from));
  for(const target of path){const to=[target[0]+.5,target[1]+.5],n=mode==='fast'?1:17,samples=[];
   for(let i=1;i<=n;i++)samples.push(event(from[0]+(to[0]-from[0])*i/n,from[1]+(to[1]-from[1])*i/n));
   if(mode==='coalesced')board.handlers.pointermove({...samples.at(-1),getCoalescedEvents:()=>samples});else for(const sample of samples)board.handlers.pointermove(sample);
   from=to;
  }
  board.handlers.pointerup(event(...from));return state();
 }};
}
test('actual app pointer listeners: stage07 gate round trip, no split, Undo and reload at phone widths',()=>{
 for(const width of [375,390,430])for(const mode of ['fast','slow','coalesced']){
 const h=app(6,width);h.drag('a',[[2,2],[3,2]],mode);const gate=h.state().state;
 h.drag('a',[[4,1]],mode);assert.deepEqual(h.state().state.actors,[{id:'a',x:4,y:1,level:2,species:'dog'}]);
 h.get('undo').onclick();assert.deepEqual(h.state().state,gate);
 h.drag('a',[[4,3]],mode);h.drag('a',[[3,2]],mode);assert.deepEqual(h.state().state.actors,gate.actors);
 const restored=app(6,width,h.raw());assert.deepEqual(restored.state(),h.state());
 restored.drag('a',[[4,2]],mode);assert.equal(restored.state().state.actors.length,2);
 }
});
for(const stage of stages)test(`actual app pointer listeners: solution ${stage.id} in fast, slow and coalesced streams`,()=>{
 let expected;
 for(const mode of ['fast','slow','coalesced']){
 const h=app(Number(stage.id)-1,390);
 for(const d of solutions[stage.id]){
 const before=h.state().state;h.drag(d.id,d.path,mode);const after=h.state().state;
 assert.ok(store.restore(h.raw()));h.get('undo').onclick();assert.deepEqual(h.state().state,before);
 h.drag(d.id,d.path,mode);assert.deepEqual(h.state().state,after);
 }
 assert.ok(engine.complete(h.state().state));if(expected)assert.deepEqual(h.state().state,expected);else expected=h.state().state;
 }
});
test('actual app reload keeps former terrain and Undo; retry creates new terrain without erasing clears',()=>{
 const walls={6:[[3,0],[2,1],[2,3],[3,4],[3,5]],9:[[3,0],[2,1],[3,3],[3,5],[4,3],[5,3]],11:[[3,0],[4,1],[4,3],[3,4],[3,5]]};
 for(const index of [6,9,11]){
 const state=engine.createState({...stages[index],walls:walls[index]}),before=engine.clone(state);
 state.actors[0].x=3;state.actors[0].y=1;
 const raw=store.pack(index,state,[before],['01','02']);
 const h=app(index,390,raw);assert.equal(h.raw(),raw);
 h.get('undo').onclick();assert.deepEqual(h.state().state,before);
 h.get('retry').onclick();assert.deepEqual(h.state().state,engine.createState(stages[index]));
 assert.deepEqual(h.state().history,[]);assert.deepEqual(h.state().cleared,['01','02']);
 }
});
test('stage19 early foothold rescue blocks the planned ascent; Undo restores a complete solution',()=>{
 const h=app(18,375),initial=h.state().state;
 h.drag('a',[[1,3],[0,4]]);
 assert.equal(h.state().state.actors.length,1);
 assert.equal(h.state().state.rescued,2);
 h.drag('r',[[2,3]]);
 assert.deepEqual(h.state().state.actors.map(a=>[a.id,a.x,a.y]),[['r',1,4]]);
 h.get('undo').onclick();assert.deepEqual(h.state().state,initial);
 for(const d of solutions['19'])h.drag(d.id,d.path);
 assert.ok(engine.complete(h.state().state));
});
