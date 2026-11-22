// Restore recorded feet and camera in the native terrain, visibility and actor
// model. Controlled resting peers intentionally do not reproduce a whole life.
import {createHash} from 'node:crypto';
import fs from 'node:fs';
import {createRequire} from 'node:module';
import path from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {gunzipSync} from 'node:zlib';

const [widthArg, cameraPath, sourcePath, output, input, mode='native', limit='1200']=process.argv.slice(2);
if(!input)throw Error('Usage: node curve-native.mjs WIDTH CAMERA MODEL OUTPUT INPUT [native|service|drag|isolated|baseline-service] [maxCases]');
const here=path.dirname(fileURLToPath(import.meta.url));
const require=createRequire(import.meta.url);
const camera=JSON.parse(fs.readFileSync(cameraPath));
const source=fs.readFileSync(sourcePath,'utf8');
const baseline=mode.startsWith('baseline');
const frozen=baseline?source:require('./curve.cjs').patchCurve(source);
let modelText=!baseline&&process.env.MOBILITY_CURVE_ARM==='deferred'
  ? require('./curve-deferred.cjs').patchDeferred(frozen):frozen;
if(process.env.MOBILITY_EXIT_GUARD&&!baseline)modelText=require('./curve-exit-guard.cjs').patchExitGuard(modelText,process.env.MOBILITY_EXIT_GUARD);
const inputBytes=fs.readFileSync(input);
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');

// Reuse the camera and art adapter used by the V11 owner's replay. Resolve its
// game imports against this checkout of the generated trial.
const gameURL=pathToFileURL(path.dirname(path.resolve(sourcePath))+'/').href;
const adapter=fs.readFileSync(path.join(here,'../home-mobility-v11/goal-owl-scene.mjs'),'utf8')
  .replaceAll("'../game/","'"+gameURL)
  .replace('function forest(config){','export function forest(config){');
const {forest}=await import('data:text/javascript;base64,'+Buffer.from(adapter).toString('base64'));
const marker='    return {metrics:';
if(modelText.split(marker).length!==2)throw Error('Fixture hook missing or ambiguous');
let hook=fs.readFileSync(path.join(here,'curve-probe.js'),'utf8');
if(mode==='exits'){
  const survey=fs.readFileSync(path.join(here,'../home-mobility-v11/space-probe.js'),'utf8');
  const witness=fs.readFileSync(path.join(here,'space-fairness.js'),'utf8');
  hook+='\nglobalThis.installCurveExitSurvey=()=>{'+survey.replace('return {geometry,rays,passing};',witness)+'};';
}
const repeats=Number(process.env.MOBILITY_BENCH_REPEATS??1);
if(!Number.isInteger(repeats)||repeats<1||repeats>20)throw Error('Benchmark repeat count must be between 1 and 20');
const benchmark=!!process.env.MOBILITY_BENCH_REPEATS;
let measuredSource=modelText;
let timing;
function observeWork(category,run){
  const start=performance.now(),cpu=process.threadCpuUsage();
  try{return run();}finally{
    const delta=process.threadCpuUsage(cpu);
    timing[category].push([performance.now()-start,(delta.user+delta.system)/1000]);
  }
}
if(benchmark){
  const gen='function* curvedHandoff(a,goal,goals,ambient) {';
  if(!baseline){
    measuredSource=measuredSource.replace(gen,`function curvedHandoff(...args){
      const it=timedCurve(...args),next=it.next.bind(it);
      it.next=()=>observeWork('curve',next);return it;
    } function* timedCurve(a,goal,goals,ambient) {`);
  }
  measuredSource=measuredSource.replace('    function step(dt,flags={}){',
    "    function step(dt,flags={}){return observeWork('step',()=>timedStep(dt,flags));} function timedStep(dt,flags={}){");
}
const nativeModule={exports:{}};
new Function('module','observeWork',measuredSource.replace(marker,hook+'\n'+marker))(nativeModule,observeWork);
const {scene,placed}=forest(camera);
const model=nativeModule.exports.createModel({random:()=>.5});
model.sync(camera.actors,scene);
placed();

const width=Number(widthArg);
if(mode==='exits'){
  const {input:sample,observed}=JSON.parse(inputBytes);
  const point=p=>[p.x,p.y];
  const steps=observed.pair.stages.map(s=>({who:s.key,ends:s.via?[point(s.via),point(s.to)]:[point(s.to)]}));
  steps.push({who:sample.key,ends:[point(observed.pair.q)]});
  globalThis.installCurveExitSurvey();
  const result=globalThis.forestSpaceSurvey.witnessFairness({feet:sample.feet,recording:{routes:[{steps,degrees:sample.degrees??null}]}});
  fs.writeFileSync(output,JSON.stringify({width,camera:sha(fs.readFileSync(cameraPath)),input:sha(inputBytes),...result})+'\n');
  process.exit(0);
}
function inputs(){
  if(!input.endsWith('.gz')){
    const file=JSON.parse(inputBytes);
    if(file.poses)return file.poses.flatMap(pose=>pose.trials.map(trial=>({...trial,feet:pose.feet,clock:pose.clock})));
    return file.replays||file;
  }
  const log=JSON.parse(gunzipSync(inputBytes));
  if(log.width!==width)throw Error('Recorded camera has a different width');
  const scale=[camera.baseline.x,camera.baseline.y];
  return log.log.requests.flatMap((row,index)=>{
    const eligible=!row.accepted&&row.planned&&!row.retry&&row.source==='ambient'&&
      row.scale.every((v,i)=>Math.abs(v-scale[i])<.005);
    if(!eligible)return [];
    return [{index,clock:row.clock,key:row.key,original:row.goal,feet:row.peers,eligible}];
  });
}
const record={width,poses:'Recorded feet, sizes and goals; controlled idle peers and scheduler',
  source:sha(source),patched:sha(modelText),camera:sha(fs.readFileSync(cameraPath)),
  input:sha(inputBytes),rows:[],mode};
const seen=new Set();
const probeMode=mode.replace(/^baseline-?/,'')||'native';
for(const sample of inputs()){
  const identity=JSON.stringify([sample.key,sample.original,sample.degrees,sample.radius,
    sample.pendingHelper,sample.touchHelper,sample.cancelOnQueue,sample.feet.map(row=>row.slice(1,3))]);
  if(seen.has(identity))continue;
  seen.add(identity);
  let result;
  const profiles=[];
  for(let i=0;i<repeats;i++){
    timing={step:[],curve:[]};
    result=globalThis.curveProbe(sample.feet,sample.key,sample.degrees??0,probeMode,sample.radius??8,sample);
    if(benchmark)profiles.push(timing);
  }
  const ops=result.trace.find(e=>e.type==='plan');
  const curve=!!result.pair?.curved;
  if(curve||sample.pendingHelper||sample.touchHelper||sample.cancelOnQueue){
    console.log('fixture',width,sample.index,sample.key,curve,result.gain,result.violations);
    fs.writeFileSync(output+'.case-'+sample.index+'.json',JSON.stringify({input:sample,observed:result}));
  }
  record.rows.push({index:sample.index,key:sample.key,clock:sample.clock,degrees:sample.degrees,radius:sample.radius,
    found:result.found,curve,actual:result.actual,error:result.goalError,gain:result.gain,
    projected:result.projected,issued:result.issued,stopped:result.stopped,interrupted:result.interrupted,...(benchmark?{profiles}:{}),
    violations:result.violations,iterations:result.iters,total:result.total,max:result.max,
    ops:ops&&{probes:ops.probes,ground:ops.ground,protected:ops.protected}});
  if(record.rows.length>=Number(limit))break;
}
fs.writeFileSync(output,JSON.stringify(record)+'\n');
