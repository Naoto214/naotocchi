// Time preserved and rejected handoffs on identical native feet, input and execution order.
// The probe creates native requests. Sampling each iterator resume excludes scheduler waits.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';

const game=path.resolve(process.env.MOBILITY_GAME);
const file=name=>new URL(name,import.meta.url);
const room=JSON.parse(fs.readFileSync(file('../home-mobility-v10/evidence/native-scene-390.json')));
const fixture=JSON.parse(fs.readFileSync(file('evidence/curve-statue-390.json')));
const probe=fs.readFileSync(file('curve-probe.js'),'utf8');
const sceneCode=fs.readFileSync(file('../home-mobility-v11/goal-owl-scene.mjs'),'utf8')
  .replaceAll("'../game/","'"+pathToFileURL(game+'/').href)
  .replace('function forest(config){','export function forest(config){');
const {forest}=await import('data:text/javascript;base64,'+Buffer.from(sceneCode).toString('base64'));
const guarded=process.argv.includes('--guard');
const arms=guarded?['v10','v11-foot','v12-eight','v12']:['v10','v11-foot','v12'];
const hash=source=>createHash('sha256').update(source).digest('hex');
const cases=[{width:390,camera:room,requests:fixture.replays,suffix:''}];
if(guarded)for(const width of [375,430]){
  const data=JSON.parse(fs.readFileSync(file(`evidence/performance-scene-${width}.json`)));
  cases.push({...data,suffix:data.seat==='reference'?'-reference':''});
}
function sourceFor(arm,suffix){
  const name=`home-production-model-mobility-${arm}${suffix}.js`;
  if(arm!=='v12-eight')return fs.readFileSync(path.join(game,name),'utf8');
  const require=createRequire(import.meta.url);
  const {patchCurve}=require('./curve.cjs'),{patchDeferred}=require('./curve-deferred.cjs'),{patchReflow}=require('./reflow.cjs');
  const baseline=sourceFor('v11-foot',suffix);
  const bound=`bindModel('v11-foot${suffix}',`;
  assert.equal(baseline.split(bound).length,2);
  const restored=patchReflow(patchDeferred(patchCurve(baseline))).replace(bound,`bindModel('v12${suffix}',`);
  // Sha values observed in the separately built V12 homes on 03950042.
  assert.equal(hash(restored),suffix?'44843a073beac32781433c7fcc90f4f51ad3ae7cceb39e5d5cdb4445b9dcf66a':'41fac1bcf2a4f68595db3a5443bb45664f26c7cce4aff32b90b00e73e2fc438e');
  return restored;
}
const runs=[];
for(const [order,sequence] of [['forward',arms],['reverse',arms.toReversed()]]) {
  for(const arm of sequence) {
    for(const {camera,width,requests,suffix} of cases)for(const [index,request] of requests.entries()){
      const source=sourceFor(arm,suffix);
      const samples={};
      function measure(name,func) {
        const cpu=process.threadCpuUsage(),wall=process.hrtime.bigint();
        try{return func();}
        finally{
          const used=process.threadCpuUsage(cpu);
          (samples[name]??=[]).push([Number(process.hrtime.bigint()-wall)/1e6,(used.user+used.system)/1000]);
        }
      }
      let modified=source;
      for(const name of ['intentPlan','pairPlan',...(arm.startsWith('v12')?['curvedHandoff']:[])]) {
        const decl=new RegExp('function\\s*\\*\\s*'+name+'\\s*\\(');
        assert.equal((modified.match(new RegExp(decl.source,'g'))||[]).length,1);
        modified=modified.replace(decl,`function ${name}(...args){const it=profile_${name}(...args), advance=it.next;`+
          `it.next=function(...v){return measure('${name}',()=>advance.apply(this,v));};return it;} function* profile_${name}(`);
      }
      const slot='    return {metrics:';assert.equal(modified.split(slot).length,2);
      const mod={exports:{}};
      new Function('module','measure',modified.replace(slot,probe+'\n'+slot))(mod,measure);
      const {scene,placed}=forest(camera);
      const model=mod.exports.createModel({random:()=>.5});model.sync(camera.actors,scene);placed();
      const result=globalThis.curveProbe(request.feet,request.key,request.degrees||0,'service',request.radius||8,request);
      assert.equal(result.violations,0);
      runs.push({arm,order,index,width,suffix,resident:request.key,sourceSHA256:hash(source),
        actual:result.actual,goalError:result.goalError,accepted:result.issued,simulationSeconds:result.stopped,
        curve:!!result.pair?.curved,events:result.trace,samples});
    }
  }
}
for(const row of runs.filter(r=>r.order==='forward')){
  const second=runs.find(r=>r.arm===row.arm&&r.width===row.width&&r.index===row.index&&r.order==='reverse');
  for(const key of ['actual','goalError','accepted','simulationSeconds','curve'])assert.equal(row[key],second[key]);
}
fs.writeFileSync(process.argv[2],JSON.stringify({node:process.version,geometry:guarded?'captured-375-390-430':'captured-390',
  columns:['wallMs','threadCpuMs'],cases:fixture.provenance,rows:runs})+'\n');
