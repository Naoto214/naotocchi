const assert=require('node:assert/strict');
const test=require('node:test');
const fs=require('node:fs');
const path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../../home-production-diorama.js'),'utf8');
const tested=source.slice(source.indexOf('    function hit('),source.indexOf('    function rectangleHit('));
function resolve(alphas,{native='front',owners=['front','back'],target='front'}={}) {
  const actor=key=>({dataset:{dioramaActor:key}});
  const elements=owners.map(key=>({closest:()=>actor(key)}));
  const rows=new Map(owners.map(key=>[key,actor(key)]));
  const make=Function('doc','env','stage','rows','rectangleHit','paintedAlpha',tested+'\nreturn hit;');
  const hit=make({elementsFromPoint:()=>elements},{DOMMatrix:true},{},rows,()=>native,key=>alphas[key]);
  return hit({x:8,y:4},{closest:()=>actor(target)},{clientX:15,clientY:40});
}

test('a visible back resident wins only through fully transparent layers',()=>{
  assert.equal(resolve({front:0,back:255}),'back');
  assert.equal(resolve({front:255,back:255}),'front');
  assert.equal(resolve({front:1,back:255}),'front');
  assert.equal(resolve({front:0,back:90}),'front');
  assert.equal(resolve({front:0,back:0}),'front');
  assert.equal(resolve({front:null,back:255}),'front');
  assert.equal(resolve({front:0,middle:0,back:255},{owners:['front','middle','back']}),'back');
});

test('single hits and padded/native assignments are retained',()=>{
  assert.equal(resolve({front:0},{owners:['front']}),'front');
  assert.equal(resolve({front:0,back:255},{native:'back'}),'back');
  assert.equal(resolve({front:0,back:255},{target:'back'}),'front');
  assert.equal(resolve({front:0,back:255},{native:null}),null);
});
