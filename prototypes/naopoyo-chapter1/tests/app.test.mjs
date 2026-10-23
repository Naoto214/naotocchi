import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';
import {WorldSession,KEY as defaultKey,phase} from '../../naopoyo-world/session.mjs';import {stages as defaultStages} from '../../naopoyo-world/stages.mjs';import {complete,mass} from '../../naopoyo-v2/engine.mjs';import {stages} from '../stages.mjs';
import {Progress,KEY,QA_KEY} from '../progress.mjs';
const key=KEY;
export function harness(options={stages},raw){
 const nodes=new Map(),storage=new Map([[defaultKey,'protected'],['naopoyo.rescue','protected']]);if(raw)storage.set(options.qa?QA_KEY:key,raw);let frame;
 function get(id){if(!nodes.has(id)){const e={style:{},handlers:{},hidden:false,open:false,innerHTML:'',textContent:'',getBoundingClientRect:()=>({x:0,y:0,left:0,top:0,width:344,height:344,toJSON(){return this}}),addEventListener(k,f){this.handlers[k]=f},querySelectorAll:()=>[],setPointerCapture(){},releasePointerCapture(){},showModal(){this.open=true},close(){this.open=false;this.handlers.close?.()}};e.parentElement=e;nodes.set(id,e)}return nodes.get(id)}
 const context={Progress,WorldSession,KEY:defaultKey,stages:defaultStages,defaultKey,phase,defaultStages,complete,mass,render(){},loadSprites:async()=>{},loadGuests:async()=>{},eventCaption:()=>'',devicePixelRatio:1,innerWidth:390,innerHeight:664,requestAnimationFrame(f){frame=f},document:{getElementById:get,hidden:false,addEventListener(){},documentElement:{scrollHeight:664}},window:{addEventListener(){}},localStorage:{getItem:k=>storage.get(k),setItem:(k,v)=>storage.set(k,v)}};
 const code=fs.readFileSync(new URL('../app.mjs',import.meta.url),'utf8').replace(/^import .*;\n/gm,'').replace('export function mount','function mount');
 vm.runInNewContext(code+';globalThis.mountApp=mount',context);const app=context.mountApp(options);return {get,storage,app,tick:()=>frame(100),close:()=>get("close").onclick()};
}

import {solve} from '../witness.mjs';
function replay(h,stage,mode='fast'){
 h.close();const board=h.get('board'),rect=board.getBoundingClientRect();
 const event=(x,y)=>({clientX:x*rect.width/8,clientY:y*rect.height/8,pointerId:7,preventDefault(){}});
 for(const c of solve(stage).commands){const a=h.app.session.state.actors.find(a=>a.id===c.id),x=a.x+.5,y=a.y+.5;board.handlers.pointerdown(event(x,y));const n=mode==='fast'?1:12,samples=[];for(let i=1;i<=n;i++)samples.push(event(x+c.dx*i/n,y+c.dy*i/n));if(mode==='coalesced')board.handlers.pointermove({...samples.at(-1),getCoalescedEvents:()=>samples});else samples.forEach(e=>board.handlers.pointermove(e));board.handlers.pointerup(samples.at(-1));}
 assert.ok(complete(h.app.session.state));h.tick();
}
for(const stage of stages)for(const mode of ['fast','slow','coalesced'])test(`chapter actual app pointer ${stage.id} ${mode}`,()=>{const h=harness({stages,qa:true});h.app.choose(stage.id);replay(h,stage,mode);assert.ok(h.app.progress.data.cleared.includes(stage.id));assert.equal(h.storage.get(defaultKey),'protected');assert.equal(h.storage.has(KEY),false)});
test('normal play unlocks ten sequentially, locked direct entry denied, replay retains highest',()=>{const h=harness();assert.equal(h.app.choose(stages[9].id),false);for(const s of stages){assert.ok(h.app.choose(s.id));replay(h,s)}assert.equal(h.app.progress.data.unlocked.length,10);h.app.choose(stages[0].id);h.get('retry').onclick();assert.equal(h.app.progress.data.unlocked.length,10);assert.equal(h.app.progress.data.cleared.length,10)});
test('story not forced after retry/revisit; hints survive reload; QA key separate',()=>{const h=harness();assert.ok(h.get('dialog').open);h.close();h.app.choose(stages[0].id);assert.equal(h.get('dialog').open,false);h.get('hint').onclick();h.get('hintMore').onclick();h.close();const restored=harness({stages},h.storage.get(KEY));assert.equal(restored.app.progress.data.hints[stages[0].id],2);assert.equal(restored.get('dialog').open,false)});
test('page reload resumes partly played board; retry only resets board',()=>{const h=harness();h.close();const q=h.app.session;q.begin('a',{x:2.5,y:4.5});q.travel({x:3.5,y:4.5});q.end();h.get('hint').onclick();const r=harness({stages},h.storage.get(KEY));assert.equal(r.app.session.state.actors[0].x,3);r.get('retry').onclick();assert.equal(r.app.session.state.actors[0].x,2);assert.equal(r.app.progress.data.hints[stages[0].id],1)});
