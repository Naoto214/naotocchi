import test from 'node:test';import assert from 'node:assert/strict';
import {render} from '../render.mjs';import {ForestSession} from '../session.mjs';import {ForestProgress,KEY,CONTACT_KEY} from '../progress.mjs';import {stages} from '../stages.mjs';
const stage={...stages[0],actors:[],walls:[],gates:[{x:3,y:4,exact:8}],exits:[],spikes:[]};
function paint(q){
 const calls=[],gradient={addColorStop(){}},stack=[];let t={sx:1,sy:1,x:0,y:0,font:'10px sans-serif'};
 const c=new Proxy({
  save(){stack.push({...t})},restore(){t=stack.pop()},setTransform(a,b,c,d,e,f){t={...t,sx:a,sy:d,x:e,y:f}},
  scale(x,y){t.sx*=x;t.sy*=y},translate(x,y){t.x+=x*t.sx;t.y+=y*t.sy},
  fillText(text,x,y){calls.push({text:String(text),x:t.x+x*t.sx,y:t.y+y*t.sy,size:parseFloat(t.font.split(' ')[1])*t.sy})},
  createLinearGradient:()=>gradient,measureText:()=>({width:1})
 },{get:(o,k)=>k in o?o[k]:()=>{},set:(o,k,v)=>{if(k==='font')t.font=v;o[k]=v;return true}});
 render({getBoundingClientRect:()=>({width:320}),getContext:()=>c},q);return calls;
}
test('gate numbers 1–8 remain large and centered in the actual cell after Canvas transforms',()=>{
 for(let exact=1;exact<=8;exact++){
  const q=new ForestSession({...stage,gates:[{x:3,y:4,exact}]}),before=q.serialize(),calls=paint(q);
  assert.ok(calls.some(n=>n.text===String(exact)&&Math.abs(n.x-140)<.01&&n.y>176&&n.y<188&&n.size>=18.4));
  assert.equal(q.serialize(),before,'painting must not change the board or save');
 }
});
test('contact progress migrates without board/Undo or writes to old key',()=>{for(const qa of [false,true]){const oldKey='naopoyo.komorebi.contact.20261025.v1'+(qa?'.qa':''),id=stages[8].id,raw=JSON.stringify({version:1,cleared:[id],unlocked:[id],boards:{[id]:{sentinel:1}}}),m=new Map([[oldKey,raw],[oldKey+'.board.'+id,'old-undo']]);const p=new ForestProgress({getItem:k=>m.get(k)||null,setItem:(k,v)=>m.set(k,v)},{qa});assert.notEqual(p.actualKey,oldKey);assert.ok(p.data.cleared.includes(id));assert.equal(p.data.boards[id],undefined);p.clear(id);assert.equal(m.get(oldKey),raw);assert.equal(m.get(oldKey+'.board.'+id),'old-undo');}assert.equal(KEY,'naopoyo.komorebi.magic-rock.20261025.v1');});
test('phase glow is transient, reduced motion clears it, Undo restores board',()=>{const b={...stage,gravity:false,actors:[{id:'a',species:'dog',x:2,y:4,level:8}]},q=new ForestSession(b),old=structuredClone(q.state);q.begin('a',{x:2.5,y:4.5});assert.ok(q.travel({x:3.5,y:4.5})[0].ok);q.end();assert.ok(q.motion[0].events.some(e=>e.type==='phase'));const r=new ForestSession(b,q.serialize());assert.ok(r.restored);assert.deepEqual(r.motion,[]);q.animate(1,true);assert.deepEqual(q.motion,[]);assert.ok(q.undo());assert.deepEqual(q.state,old);});
