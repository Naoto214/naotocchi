import test from 'node:test';import assert from 'node:assert/strict';
import * as layout from '../layout.mjs';
test('board uses available width and height without clipping any of the 8x6 cells',()=>{
 assert.equal(typeof layout.boardSize,'function');
 for(const [w,h]of [[363,400],[378,400],[418,440],[363,220],[600,320],[0,0]]){
 const b=layout.boardSize(w,h);assert.ok(b.width<=w&&b.height<=h);assert.ok(b.width>=0&&b.height>=0);
 assert.ok(Math.abs(b.width*6-b.height*8)<.01);assert.ok(Math.abs(b.width-w)<.01||Math.abs(b.height-h)<.01);
 }
});
