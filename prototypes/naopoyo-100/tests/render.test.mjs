import test from 'node:test';
import assert from 'node:assert/strict';
import {tile} from '../render.mjs';
// Node has no vector canvas; these tests record text placement only.
globalThis.Path2D=class Path2D {};
function record(){
 const text=[],stack=[];let xy=[0,0];
 const ctx=new Proxy({save(){stack.push([...xy])},restore(){xy=stack.pop()||[0,0]},translate(x,y){xy[0]+=x;xy[1]+=y},fillText(value,x,y){text.push({value,x:x+xy[0],y:y+xy[1]})},createLinearGradient(){return{addColorStop(){}}},createRadialGradient(){return{addColorStop(){}}}}, {get(o,k){return k in o?o[k]:()=>{}},set(o,k,v){o[k]=v;return true}});
 return{ctx,text};
}
test('owl level and partner requirements occupy distinct label positions',()=>{const{ctx,text}=record();tile(ctx,'npc.owl',{exact:3,species:'dog',partner:'frog'});const level=text.find(x=>x.value==='=3'),partner=text.find(x=>x.value==='＋蛙');assert.ok(level&&partner);assert.ok(Math.abs(level.y-partner.y)>.3)});
test('crate push threshold and distinct weight are both visible',()=>{const{ctx,text}=record();tile(ctx,'object.crate',{min:3,weight:2});assert.ok(text.some(t=>t.value==='≥3'));assert.ok(text.some(t=>t.value==='重2'))});
