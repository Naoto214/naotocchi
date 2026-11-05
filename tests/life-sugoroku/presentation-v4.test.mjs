import test from 'node:test';import assert from 'node:assert/strict';
import {BOARD,TILE_SCHEMA} from '../../prototypes/life-sugoroku/tiles-v4.mjs';
let P={};try{P=await import('../../prototypes/life-sugoroku/presentation-v4.mjs');}catch(e){if(e.code!=='ERR_MODULE_NOT_FOUND')throw e;}
test('V4 tile shape label icon and accessible description come from the effect schema',()=>{
 for(const n of BOARD){const d=TILE_SCHEMA[n.type],svg=P.tileSvg(n);assert.ok(svg.includes(`data-shape="${d.shape}"`));assert.ok(svg.includes(d.icon));assert.ok(svg.includes(d.label));assert.ok(!svg.includes('tile-number'));assert.ok(P.tileSvg(n,undefined,undefined,{debug:true}).includes('tile-number'));}
});
test('three friends trail around terrain edges, partner stands beside main',()=>{
 const b=[{x:0,y:0},{x:100,y:0},{x:100,y:100}],p={pos:2,walkPath:[0,1,2],friends:['a','b','c'],partner:'d',married:true};
 const before=structuredClone(p),f=P.followerPositions(p,b);assert.equal(f.length,4);assert.deepEqual(f.slice(0,3).map(f=>[f.x,f.y]),[[100,68],[100,36],[100,4]]);assert.equal(f[3].slot,'partner');assert.equal(f[3].marker,'💍');assert.equal(Math.hypot(f[3].x-100,f[3].y-100),32);assert.deepEqual(p,before);
});
test('followers are distinct at spawn and after departure; motion ends at saved destination layout',()=>{
 const b=[{x:100,y:100},{x:200,y:100},{x:200,y:200}],p={pos:0,walkPath:[0],friends:['a','b','c'],partner:'d',married:false};
 const f=P.followerPositions(p,b);assert.equal(new Set(f.map(f=>`${f.x},${f.y}`)).size,4);
 p.pos=1;p.walkPath=[0,1];const motion=P.followerMotion(p,b,2),from=P.followerPositions(p,b),to=P.followerPositions({...p,pos:2,walkPath:[0,1,2]},b);
 motion.forEach((m,i)=>assert.equal(m.frames.at(-1).transform,`translate(${to[i].x-from[i].x}px,${to[i].y-from[i].y}px)`));assert.ok(motion[0].frames.length>2);
 p.friends.splice(1,1);p.partner=null;assert.equal(P.followerPositions(p,b).length,2);
});
