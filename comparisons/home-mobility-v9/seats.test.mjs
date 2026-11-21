import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {forest,modelApi,opening,v8,sx,sy} from './movement-scene.mjs';

const require=createRequire(import.meta.url);
const {patchMovement}=require('./movement.cjs');
const {patchSeats}=require('./seats.cjs');
const source=patchMovement(v8);
const nativeModule={exports:{}};
new Function('module',patchSeats(source))(nativeModule);
const api=nativeModule.exports;
const coordinate=a=>[a.x,a.y];
const fixtures=forest(modelApi(true));

// A prepared native opening is fixed during the standard seat solver, as in
// the captured #578 fixture. Its true visibility predicate remains available
// to evaluating proposed exits. Each exercise starts from a new native model.
function setup(rename=false) {
  const map=new Map(fixtures.rows.map((r,i)=>[r.key,rename?'resident-'+String(27-i):r.key]));
  const rows=fixtures.rows.map(r=>({...r,key:map.get(r.key),original:r.key}));
  const model=api.createModel({random:()=>.5});
  const scene={...fixtures.scene,navigation:{...fixtures.scene.navigation,initialPoint:i=>rows[i]},
    actorBounds:a=>fixtures.scene.actorBounds({...a,key:a.original}),
    visible:(p,a)=>rows.some(r=>r.key===a.key&&Math.hypot(p.x-r.x,p.y-r.y)<1e-7)};
  return {model,scene,rows};
}
const feet=m=>m.snapshot().map(coordinate);

test('saved, ordinary and existing casts keep the original opening',()=>{
  const {model,scene,rows}=setup();
  model.sync(rows,scene);
  const fixed=feet(model);
  assert.deepEqual(fixed,opening.residents.map(r=>[r[2],r[3]]));
  model.sync(rows,{...scene,compareFreshSeats:true});
  assert.deepEqual(feet(model),fixed);
});

test('the disposable opening uses each body’s geometry regardless of its name',()=>{
  const locations=[false,true].map(rename=>{
    const {model,scene,rows}=setup(rename);
    model.sync(rows,{...scene,compareFreshSeats:true});
    const next=feet(model),distances=next.map(([x,y],i)=>Math.hypot((x-rows[i].x)*sx,(y-rows[i].y)*sy));
    assert.ok(distances.some(d=>d>0));
    assert.ok(distances.filter(d=>d>0).length<=4);
    assert.ok(Math.max(...distances)<=16.00001);
    return next;
  });
  assert.deepEqual(locations[0],locations[1]);
});

test('consuming the opening marker once prevents a later cleared roster from reusing it',()=>{
  const {model,scene,rows}=setup();
  model.sync(rows,{...scene,compareFreshSeats:true});
  assert.notDeepEqual(feet(model),rows.map(coordinate));
  model.sync([],scene);
  model.sync(rows,{...scene,compareFreshSeats:true});
  assert.deepEqual(feet(model),rows.map(coordinate));
});
