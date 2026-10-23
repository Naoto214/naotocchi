import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';
import {WorldSession,KEY as defaultKey,phase} from '../../naopoyo-world/session.mjs';import {stages as defaultStages} from '../../naopoyo-world/stages.mjs';import {complete,mass} from '../../naopoyo-v2/engine.mjs';import {stages} from '../stages.mjs';
const key='naopoyo.insight.pilot.20261023.v1';
export function harness(options={stages,key,fixedBoard:true,label:'発想型7面'},raw){
 const nodes=new Map(),storage=new Map([[defaultKey,'protected'],['naopoyo.rescue','protected']]);if(raw)storage.set(key,raw);
 function get(id){if(!nodes.has(id)){const e={style:{},handlers:{},hidden:false,open:false,innerHTML:'',textContent:'',getBoundingClientRect:()=>({x:0,y:0,left:0,top:0,width:344,height:344,toJSON(){return this}}),addEventListener(k,f){this.handlers[k]=f},querySelectorAll:()=>[],setPointerCapture(){},releasePointerCapture(){},showModal(){this.open=true},close(){this.open=false;this.handlers.close?.()}};e.parentElement=e;nodes.set(id,e)}return nodes.get(id)}
 const context={WorldSession,KEY:defaultKey,stages:defaultStages,defaultKey,phase,defaultStages,complete,mass,render(){},loadSprites:async()=>{},loadGuests:async()=>{},eventCaption:()=>'',devicePixelRatio:1,innerWidth:390,innerHeight:664,requestAnimationFrame(){},document:{getElementById:get,hidden:false,addEventListener(){},documentElement:{scrollHeight:664}},window:{addEventListener(){}},localStorage:{getItem:k=>storage.get(k),setItem:(k,v)=>storage.set(k,v)}};
 const code=fs.readFileSync(new URL('../../naopoyo-world/app.mjs',import.meta.url),'utf8').replace(/^import .*;\n/gm,'').replace('export function mount','function mount');
 vm.runInNewContext(code+';globalThis.mountApp=mount',context);const app=context.mountApp(options);return {get,storage,app};
}
test('shared app mounts supplied catalog with independent key and fixed 8x8',()=>{
 const h=harness();assert.equal(h.app.session.stage.id,'I01');assert.equal(h.get('compare').hidden,true);h.get('retry').onclick();assert.equal(JSON.parse(h.storage.get(key)).stageId,'I01');assert.equal(h.storage.get(defaultKey),'protected');
});
test('hint reveals one tier at a time and caps at three without solving',()=>{
 const h=harness();const before=h.app.session.serialize();h.get('hint').onclick();assert.ok(h.get('content').innerHTML.includes(stages[0].hints[0]));assert.ok(!h.get('content').innerHTML.includes(stages[0].hints[1]));h.get('hintMore').onclick();assert.ok(h.get('content').innerHTML.includes(stages[0].hints[1]));assert.ok(!h.get('content').innerHTML.includes(stages[0].hints[2]));h.get('hintMore').onclick();assert.ok(h.get('content').innerHTML.includes(stages[0].hints[2]));assert.equal(h.app.session.serialize(),before);
});
test('default mount retains original world stages/key and comparison',()=>{
 const h=harness({});assert.equal(h.app.session.stage.id,'A');assert.equal(h.get('compare').hidden,false);h.get('retry').onclick();assert.equal(JSON.parse(h.storage.get(defaultKey)).stageId,'A');
});
import {solve} from '../witness.mjs';
for(const stage of stages)for(const mode of ['fast','slow','coalesced'])test(`actual shared app pointer replay ${stage.id} ${mode}`,()=>{
 const h=harness({stages:[stage],key,fixedBoard:true});const board=h.get('board'),rect=board.getBoundingClientRect();
 const event=(x,y)=>({clientX:x*rect.width/8,clientY:y*rect.height/8,pointerId:7,preventDefault(){}});
 for(const c of solve(stage).commands){if(c.wait!==undefined){h.app.session.advance(c.wait);continue}const a=h.app.session.state.actors.find(a=>a.id===c.id),x=a.x+.5,y=a.y+.5;board.handlers.pointerdown(event(x,y));const n=mode==='fast'?1:12,samples=[];for(let i=1;i<=n;i++)samples.push(event(x+c.dx*i/n,y+c.dy*i/n));if(mode==='coalesced')board.handlers.pointermove({...samples.at(-1),getCoalescedEvents:()=>samples});else samples.forEach(e=>board.handlers.pointermove(e));board.handlers.pointerup(samples.at(-1));}
 assert.ok(complete(h.app.session.state));assert.equal(h.storage.get(defaultKey),'protected');const resumed=harness({stages:[stage],key,fixedBoard:true},h.storage.get(key));assert.ok(resumed.app.session.restored);assert.ok(complete(resumed.app.session.state));
});
