import test from 'node:test';import assert from 'node:assert/strict';
import {drawBoard} from '../draw.mjs';
import {actorLayout} from '../../naopoyo-world/render.mjs';
import {createState} from '../engine.mjs';
const state=()=>createState({w:8,h:8,actors:[{id:'a',species:'dog',level:1,x:3,y:4}],walls:[],gates:[],exits:[],spikes:[]});
function record(){const calls=[];const c=new Proxy({font:'12px system-ui',createLinearGradient:()=>({addColorStop(){}}),createRadialGradient:()=>({addColorStop(){}})}, {get:(o,k)=>k in o?o[k]:(...a)=>calls.push([k,...a]),set:(o,k,v)=>(o[k]=v,true)});return {calls,canvas:{getBoundingClientRect:()=>({width:320}),getContext:()=>c}};}
test('normal rendering has no selected rectangle or cell-coordinate labels',()=>{const {calls,canvas}=record();drawBoard(canvas,state(),{selected:[3,4]});assert.equal(calls.filter(c=>c[0]==='strokeRect').length,0);assert.equal(calls.filter(c=>c[0]==='fillText'&&/^[A-H][1-8]$/.test(c[1])).length,0);});
test('debug coordinates remain opt-in',()=>{const {calls,canvas}=record();drawBoard(canvas,state(),{debugCoordinates:true});assert.equal(calls.filter(c=>c[0]==='fillText'&&/^[A-H][1-8]$/.test(c[1])).length,64);});
test('formal selected geometry is larger, bounded and numbers remain visible',()=>{for(const width of [218,296,351,366,406])for(const [x,y]of [[0,0],[7,0],[0,7],[7,7],[3,4]]){const a={x,y},normal=actorLayout(a,false,width/8,width,width),held=actorLayout(a,true,width/8,width,width);assert.ok(held.bw>normal.bw);assert.ok(held.bx>=0&&held.bx+held.bw<=width);assert.ok(held.by>=0&&held.by+held.bh<=width);assert.ok(held.numberY-held.numberSize/2>=0);}});
