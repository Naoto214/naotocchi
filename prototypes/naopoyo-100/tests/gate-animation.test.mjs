import test from 'node:test';import assert from 'node:assert/strict';
import {GateTransitions,gateTarget,GATE_TRANSITION_MS} from '../../naopoyo-shared/gate-animation.mjs';
import {createGameState,gameMove} from '../engine.mjs';
const gate={x:3,y:3,exact:2},dog={id:'dog',x:2,y:3,level:2,species:'dog'};
test('visual opening completes in 280ms and reverses from its current position',()=>{
 const t=new GateTransitions();assert.equal(GATE_TRANSITION_MS,280);
 assert.equal(t.sample('g',false,0).opening,0);assert.equal(t.sample('g',true,10).opening,0);
 const mid=t.sample('g',true,150);assert.ok(mid.opening>.4&&mid.opening<.6);assert.ok(mid.glow>0);
 assert.equal(t.sample('g',false,150).opening,mid.opening);assert.equal(t.sample('g',false,430).opening,0);assert.equal(t.active,false);
 t.sample('g',true,440);assert.equal(t.sample('g',true,720).opening,1);assert.equal(t.active,false);
});
test('reduced motion snaps, resets isolate boards, and repaint does not restart',()=>{const t=new GateTransitions();t.sample('g',false,0);assert.equal(t.sample('g',true,1,true).opening,1);assert.equal(t.sample('g',true,500).glow,0);assert.equal(t.sample('g',false,501,true).opening,0);t.clear();assert.equal(t.sample('g',true,0).opening,1)});
test('gate target follows selected eligible actor and preserves species and roof conditions',()=>{
 const s={actors:[dog]};assert.equal(gateTarget(s,gate,'dog'),true);assert.equal(gateTarget(s,gate,null),false);
 assert.equal(gateTarget(s,{...gate,min:4,exact:undefined},'dog'),false);assert.equal(gateTarget(s,{...gate,species:'frog'},'dog'),false);
 assert.equal(gateTarget({actors:[{...dog,y:2,x:3}]},gate,'dog'),false);
 assert.equal(gateTarget({actors:[{...dog,x:3}]},gate,null),true);
 assert.equal(gateTarget({actors:[{...dog,x:3,level:1}]},gate,null),false);
});
test('gate is passable immediately before animation has advanced; render cannot edit state',()=>{
 const s=createGameState({w:8,h:8,actors:[dog],gates:[gate],walls:[],spikes:[],exits:[{x:6,y:3}],gravity:false});
 const snapshot=structuredClone(s),t=new GateTransitions();t.sample('g',false,0);t.sample('g',gateTarget(s,gate,'dog'),1);assert.deepEqual(s,snapshot);
 assert.equal(gameMove(s,'dog',1,0).ok,true);assert.equal(t.sample('g',true,1).opening,0);
 const invalid=createGameState({...snapshot,actors:[{...dog,level:1}]});assert.equal(gameMove(invalid,'dog',1,0).ok,false);
});

import fs from 'node:fs';import {createHash} from 'node:crypto';import {drawGate} from '../../naopoyo-chapter2/gate-art.mjs';
function trace(g){const ops=[],props={globalAlpha:1};const gradient={addColorStop(...a){ops.push(['stop',...a])}};const c=new Proxy(props,{get(t,k){if(k in t)return t[k];if(k==='createLinearGradient')return(...a)=>{ops.push([k,...a]);return gradient};return(...a)=>ops.push([k,...a])},set(t,k,v){t[k]=v;if(typeof v!=='function')ops.push(['set',k,v]);return true}});drawGate(c,g);return {hash:createHash('sha256').update(JSON.stringify(ops)).digest('hex'),ops}}
test('saved formal A painter operation traces stay identical, including digits and occupancy',()=>{for(const {gate,hash}of JSON.parse(fs.readFileSync(new URL('./gate-art-baseline.json',import.meta.url)))){assert.equal(trace(gate).hash,hash);assert.equal(trace({...gate,opening:0,glow:0}).hash,hash)}});
test('aperture animates without moving or changing the numeral',()=>{const closed=trace(gate).ops,opened=trace({...gate,opening:1,glow:0}).ops;assert.deepEqual(opened.filter(o=>o[0]==='fillText'||o[0]==='strokeText'),closed.filter(o=>o[0]==='fillText'||o[0]==='strokeText'));assert.ok(opened.some(o=>o[0]==='translate'&&o[1]===-.215&&o[2]===0));assert.ok(opened.some(o=>o[0]==='translate'&&o[1]===.215&&o[2]===0))});
import {Presentation} from '../presentation.mjs';
test('real presentation opens on selection and reset removes pending gate motion',()=>{const s=createGameState({w:8,h:8,actors:[dog],gates:[gate],walls:[],spikes:[],exits:[{x:6,y:3}],gravity:false});const p=new Presentation();p.reset(s);assert.equal(p.frame(0).gates[0].opening,0);p.focus='dog';assert.equal(p.frame(10).gates[0].opening,0);assert.ok(p.gateTransitions.active);assert.equal(p.frame(290).gates[0].opening,1);p.focus=null;assert.equal(p.frame(300).gates[0].opening,1);assert.equal(p.frame(580).gates[0].opening,0);p.reset(s);assert.equal(p.gateTransitions.active,false)});
