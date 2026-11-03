import test from 'node:test';
import assert from 'node:assert/strict';
import {drawBoard} from '../draw.mjs';

test('gravity sign fills A8 beneath an actor, and is absent on flat stages',()=>{
 const marker={complete:true,naturalWidth:256},calls=[];
 const c=new Proxy({font:'12px sans-serif',createLinearGradient:()=>({addColorStop(){}}),createRadialGradient:()=>({addColorStop(){}})},{get:(o,k)=>k in o?o[k]:(...args)=>calls.push([k,...args]),set:(o,k,v)=>(o[k]=v,true)});
 const canvas={getBoundingClientRect:()=>({width:320}),getContext:()=>c};
 const state={gravity:true,walls:[],gates:[],exits:[],spikes:[],actors:[{id:'a',species:'dog',level:1,x:0,y:7}]};
 drawBoard(canvas,state,{gravitySign:marker,reduced:true});
 const sign=calls.findIndex(a=>a[0]==='drawImage'&&a[1]===marker);
 const actor=calls.findIndex(a=>a[0]==='ellipse'&&a[1]===20&&Math.abs(a[2]-312.4)<.001);
 assert.ok(sign>=0,'approved sign is drawn');
 assert.deepEqual(calls[sign].slice(2),[0,7,1,1]);
 assert.ok(actor>sign,'actor in A8 is painted over the sign');
 calls.length=0;
 drawBoard(canvas,{...state,gravity:false},{gravitySign:marker,reduced:true});
 assert.equal(calls.some(a=>a[0]==='drawImage'&&a[1]===marker),false);
});
