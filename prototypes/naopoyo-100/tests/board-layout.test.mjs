import test from 'node:test';import assert from 'node:assert/strict';
import {boardSize} from '../board-layout.mjs';
import {TouchController} from '../interaction.mjs';
for(const viewport of [320,375,390,430])test(`board and canonical hit mapping at ${viewport}px, including resize and scroll`,()=>{
 const width=boardSize(viewport-12);assert.equal(width,viewport-12);
 let rect={left:8,top:170,width:width-4,height:width-4};
 const point=e=>TouchController.prototype.point.call({canvas:{getBoundingClientRect:()=>rect}},e);
 for(const size of [width-4,viewport-40])for(const top of [170,-80]){rect={...rect,width:size,height:size,top};for(let y=0;y<8;y++)for(let x=0;x<8;x++){const p=point({clientX:rect.left+(x+.5)*size/8,clientY:top+(y+.5)*size/8});assert.ok(Math.abs(p.x-x-.5)<1e-10);assert.ok(Math.abs(p.y-y-.5)<1e-10)}}
});
