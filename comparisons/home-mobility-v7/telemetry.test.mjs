import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import {createRequire} from 'node:module';
import {pathToFileURL} from 'node:url';
const require=createRequire(import.meta.url);
const v6=require('../home-drag-v6/native-source.cjs').readNative('home-production-model.js');
const v7=require('./mobility-model.cjs').patchModel(v6);
const {patchTelemetry}=require('./telemetry.cjs');
const fixture=require('../home-finish-v5/native-source.cjs').nativeFixture();
const {createTerrainNavigation}=await import(pathToFileURL(path.join(fixture,'home-route-navigation.mjs')));
const script=fs.readFileSync(new URL('./telemetry.js',import.meta.url),'utf8');

function modelAt(points){
  let wall=0;
  const events=new Map();
  const c=vm.createContext({performance:{now:()=>wall*1000},location:{search:''},URLSearchParams,
    document:{hidden:false,addEventListener:(name,cb)=>events.set(name,cb)}});
  c.window=c;vm.runInContext(script,c);
  vm.runInContext(patchTelemetry('home-production-model-drag-v6.js',v7,'v7'),c);
  const model=c.NaotocchiHomeDioramaModel.createModel({random:()=>.5});model.bindMobility();
  const diag=c.HomeMobilityDiagnostics;
  const nav=createTerrainNavigation({width:700,height:400,cell:8,gridOrigin:{x:0,y:0},
    project:p=>p,unproject:p=>({...p,z:p.y}),walkable:()=>true});
  nav.intentAware=true;nav.intentScale={x:1,y:1};
  const people=points.map(([x,y],i)=>({key:String(i),id:'resident-'+i,kind:i?'companion':'pet',x,y,w:10,h:10}));
  model.sync(people,{region:'forest',width:700,height:400,navigation:nav,
    actorBounds:()=>({left:0,right:680,top:40,bottom:40})});
  return {diag,model,nav,people,wall(t){wall=t;},hide(hidden){c.document.hidden=hidden;events.get('visibilitychange')();},
    tick(n,flags={autonomy:false}){for(let i=0;i<n;i++)model.step(.05,flags);}};
}

test('a functional session starts once and counts real travel independently of plans and wall time',()=>{
  const h=modelAt([[40,40]]);
  assert.equal(h.diag.read().enabled,false);
  h.diag.enable();assert.equal(h.model.move('0',{x:52,y:40},'ambient'),true);
  let a=h.diag.read().residents[0];assert.equal(a.ambientPlans,1);assert.equal(a.ambientStarts,0);
  h.tick(40);h.wall(12);h.diag.enable();
  const result=h.diag.read();a=result.residents[0];
  assert.equal(a.ambientRequests,1);assert.equal(a.ambientStarts,1);assert.equal(a.ambientArrivals,1);
  assert.equal(a.actualDistance,12);assert.equal(result.wallSeconds,12);assert.ok(Math.abs(result.modelSeconds-2)<1e-8);
  assert.ok(a.lastMovedAgo>1&&a.stationaryMax>=a.lastMovedAgo);
});
test('a failed planned intent opens one episode; only a real later resident step closes it',()=>{
  const h=modelAt([[40,40],[160,40]]);
  h.diag.enable();
  const previous=h.nav.nearest,supplement=h.nav.reachable;h.nav.nearest=()=>null;h.nav.reachable=()=>[];
  assert.equal(h.model.move('0',{x:100,y:40},'ambient'),false);
  assert.equal(h.model.move('0',{x:101,y:40},'ambient'),false);
  let a=h.diag.read().residents[0];assert.equal(a.ambientFailures,2);assert.equal(a.failureEpisodes,1);assert.equal(a.recoveredEpisodes,0);
  h.nav.nearest=previous;h.nav.reachable=supplement;
  assert.equal(h.model.move('0',{x:100,y:40},'ambient'),true);
  assert.equal(h.diag.read().residents[0].recoveredEpisodes,0);
  h.tick(1);a=h.diag.read().residents[0];
  assert.equal(a.recoveredEpisodes,1);assert.equal(a.recoveredSameSource,1);assert.equal(a.openFailure,null);
});
test('the two real sequential helper legs count once for the requester and once per physical helper',()=>{
  const h=modelAt(Array.from({length:16},(_,i)=>[i<3?40+20*i:140+28*i,40]));
  h.diag.enable();h.model.select('0');h.model.move('0',{x:52,y:40},'drag',{pointerDrop:true});
  h.tick(245);
  const {residents}=h.diag.read(),lead=residents[0],events=h.diag.events().events.filter(e=>e.type==='yield-offer');
  assert.equal(lead.dragRequests,1);assert.equal(lead.dragStarts,1);assert.equal(lead.yieldOffers,1);assert.equal(lead.yieldSuccesses,1);
  assert.equal(lead.sequentialOffers,1);assert.equal(lead.sequentialStages,2);
  assert.deepEqual(Array.from(events,e=>e.peer),['2','1']);assert.deepEqual(Array.from(events,e=>e.stage),[1,2]);
  for(const i of [1,2]){assert.equal(residents[i].yieldsGiven,1);assert.equal(residents[i].yieldPhysicalStarts,1);assert.equal(residents[i].yieldArrivals,1);}
});
test('hidden intervals and simultaneous native pause reasons are recorded without model clock ticks',()=>{
  const h=modelAt([[40,40]]);h.diag.enable();h.diag.bindGates(()=>['sleep','lower-notice']);
  h.wall(1);h.diag.frame(true,false,false,false);h.wall(3);h.hide(true);
  h.wall(6);h.hide(false);h.wall(7);h.diag.frame(false,false,false,false);
  const report=h.diag.read();assert.equal(report.modelSeconds,0);assert.equal(report.pausedSeconds,6);
  assert.equal(report.gateReasons.sleep,6);assert.equal(report.gateReasons['lower-notice'],6);assert.equal(report.gateReasons.hidden,3);
});
