// Narrow-floor model profiling uses the actual viewport geometry captured in V10.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';

const room = JSON.parse(fs.readFileSync(new URL('../home-mobility-v10/evidence/native-scene-320.json',import.meta.url)));
const game = process.env.MOBILITY_GAME;
const native = name => import(pathToFileURL(path.resolve(game,name)));
const {createRecoveredNavigation} = await native('home-recovered-navigation-finish.mjs');
const {extendVisibleGroundNavigation} = await native('home-visible-ground-navigation-finish.mjs');
const {insidePolygon} = await native('home-art-navigation-finish.mjs');
const {selectRecoveredScene} = await native('home-production-manifest.mjs');
const spec=selectRecoveredScene('forest');
const {stage, rect, p, host, cover, stableGrid, addVisible} = room.nav;
const original=createRecoveredNavigation(spec,host,stage,{stableGrid, expandCity:stableGrid});
const nav=addVisible ? extendVisibleGroundNavigation(original,{spec,stage:rect,presentation:p,cover}) : original;
const {x:sx,y:sy}=nav.intentScale;
assert.ok(Math.abs(sx-room.baseline.x)<1e-7 && Math.abs(sy-room.baseline.y)<1e-7);
const polygons = spec.foreground.map(polygon=>polygon.map(([u,v])=>[
  p.x + (cover.left+cover.width*u-p.x)/sx-rect.left,
  p.y + (cover.top+cover.height*v-p.y)/sy-rect.top,
]));
const residents = new Map(room.actors.map(a=>[a.key,a]));
function visible(a,z){
  return [-.3,0,.3].every(x=>[.22,.5,.8].every(y=>
    polygons.every(poly=>!insidePolygon(z.x+x*a.w,z.y-y*a.h,poly))));
}
export function narrowForest(api, seed) {
  let placing=true;
  const scene={...room.scene,region:'forest',time:'day',weather:'sunny',
    navigation:{...nav,initialPoint:i=>room.actors[i]},
    actorBounds:a=>residents.get(a.key).bounds,referenceBounds:a=>residents.get(a.key).reference,
    planVisibility:a=>z=>visible(a,z),
    visible:(z,a)=>placing ? Math.hypot((z.x-residents.get(a.key).x)*sx,(z.y-residents.get(a.key).y)*sy)<1e-6 : visible(a,z)};
  const model=api.createModel({random:()=>{seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;return (seed>>>0)/4294967296;}});
  model.sync(room.actors,scene);placing=false;
  assert.ok(model.snapshot().every((a,i)=>Math.hypot((a.x-room.actors[i].x)*sx,(a.y-room.actors[i].y)*sy)<1e-6));
  return {model};
}
