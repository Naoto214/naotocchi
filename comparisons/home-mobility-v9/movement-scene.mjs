// Replays the measured V8 opening with the released bounds, foreground and ground.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {createRequire} from 'node:module';

const game = process.env.MOBILITY_GAME;
if (!game) throw Error('Set MOBILITY_GAME to the released comparison game directory');
const native = name => import(pathToFileURL(path.resolve(game, name)));
const json = name => JSON.parse(fs.readFileSync(new URL(name, import.meta.url)));
export const opening = json('./forest-opening.json');
const fixture = json('../home-mobility-v7/geometry-fixture.json');
const {nativeStage, stageToCss, cover} = fixture;
export const sx = stageToCss.scaleX, sy = stageToCss.scaleY;
const {selectRecoveredScene} = await native('home-production-manifest.mjs');
const {createRecoveredNavigation} = await native('home-recovered-navigation-finish.mjs');
const {extendVisibleGroundNavigation} = await native('home-visible-ground-navigation-finish.mjs');
const {insidePolygon} = await native('home-art-navigation-finish.mjs');
const spec = selectRecoveredScene('forest');
const legacy = createRecoveredNavigation(spec, nativeStage, nativeStage, {stableGrid:true});
const nav = extendVisibleGroundNavigation(legacy, {spec, cover,
  stage:{left:stageToCss.left / sx, top:stageToCss.top / sy}, presentation:{x:0, y:0, scaleX:sx, scaleY:sy}});
const polygons = spec.foreground.map(poly => poly.map(([u,v]) =>
  [(cover.left + u*cover.width-stageToCss.left)/sx,(cover.top + v*cover.height-stageToCss.top)/sy]));
const boundsByKey = new Map(fixture.residents.map(a => [a.key,a.bounds]));
function shows(a,p) {
  return [-.3,0,.3].every(x => [.22,.5,.8].every(y =>
    polygons.every(poly=>!insidePolygon(p.x+x*a.w,p.y-y*a.h,poly))));
}
export const v8 = fs.readFileSync(path.resolve(game,'home-production-model-mobility-v8.js'),'utf8');
const require = createRequire(import.meta.url);
export function modelApi(baseline = false) {
  const source = baseline ? v8 : require('./movement.cjs').patchMovement(v8);
  const mod={exports:{}};
  const instrumented = source.replace('    return {metrics:', '    return {testState:()=>({actors,relief,waiting,clock}),metrics:');
  new Function('module',instrumented)(mod);
  return mod.exports;
}
export function forest(api, seed=214, positions=opening.residents) {
  const rows=positions.map(([key,,x,y,w,h])=>({key,kind:key.split(':')[0],x,y,w,h}));
  let placing=true;
  const scene={width:nativeStage.width,height:nativeStage.height,groundTop:24,region:'forest',time:'day',weather:'sunny',
    navigation:{...nav,initialPoint:i=>rows[i]},
    referenceBounds:a=>api.bounds(a,{...scene,actorBounds:null}), actorBounds:a=>boundsByKey.get(a.key),
    planVisibility:a=>p=>shows(a,p),visible:(p,a)=>placing?rows.some(r=>r.key===a.key&&Math.hypot(p.x-r.x,p.y-r.y)<1e-7):shows(a,p)};
  const model=api.createModel({random:()=>{seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;return (seed>>>0)/4294967296;}});
  model.sync(rows,scene);placing=false;
  assert.deepEqual(model.snapshot().map(a=>[a.key,a.x,a.y]),rows.map(a=>[a.key,a.x,a.y]));
  return {model,scene,rows};
}
