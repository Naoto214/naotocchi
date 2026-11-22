// Time the positive, controlled 390px handoff, using the compiled home from each arm.
// The probe creates native requests. Sampling each iterator resume excludes scheduler waits.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';

const game=path.resolve(process.env.MOBILITY_GAME);
const file=name=>new URL(name,import.meta.url);
const room=JSON.parse(fs.readFileSync(file('../home-mobility-v10/evidence/native-scene-390.json')));
const fixture=JSON.parse(fs.readFileSync(file('evidence/curve-statue-390.json')));
const probe=fs.readFileSync(file('curve-probe.js'),'utf8');
const sceneCode=fs.readFileSync(file('../home-mobility-v11/goal-owl-scene.mjs'),'utf8')
  .replaceAll("'../game/","'"+pathToFileURL(game+'/').href)
  .replace('function forest(config){','export function forest(config){');
const {forest}=await import('data:text/javascript;base64,'+Buffer.from(sceneCode).toString('base64'));
const arms=['v10','v11-foot','v12'];
const runs=[];
for(const [order,sequence] of [['forward',arms],['reverse',arms.toReversed()]]) {
  for(const arm of sequence) {
    for(const [index,request] of fixture.replays.entries()) {
      const source=fs.readFileSync(path.join(game,`home-production-model-mobility-${arm}.js`),'utf8');
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
      for(const name of ['intentPlan','pairPlan',...(arm==='v12'?['curvedHandoff']:[])]) {
        const decl=new RegExp('function\\s*\\*\\s*'+name+'\\s*\\(');
        assert.equal((modified.match(new RegExp(decl.source,'g'))||[]).length,1);
        modified=modified.replace(decl,`function ${name}(...args){const it=profile_${name}(...args), advance=it.next;`+
          `it.next=function(...v){return measure('${name}',()=>advance.apply(this,v));};return it;} function* profile_${name}(`);
      }
      const slot='    return {metrics:';assert.equal(modified.split(slot).length,2);
      const mod={exports:{}};
      new Function('module','measure',modified.replace(slot,probe+'\n'+slot))(mod,measure);
      const {scene,placed}=forest(room);
      const model=mod.exports.createModel({random:()=>.5});model.sync(room.actors,scene);placed();
      const result=globalThis.curveProbe(request.feet,request.key,request.degrees||0,'service',request.radius||8,request);
      assert.equal(result.violations,0);
      runs.push({arm,order,index,sourceSHA256:createHash('sha256').update(source).digest('hex'),
        actual:result.actual,goalError:result.goalError,accepted:result.issued,simulationSeconds:result.stopped,
        curve:!!result.pair?.curved,events:result.trace,samples});
    }
  }
}
for(const row of runs.filter(r=>r.order==='forward')){
  const second=runs.find(r=>r.arm===row.arm&&r.index===row.index&&r.order==='reverse');
  for(const key of ['actual','goalError','accepted','simulationSeconds','curve'])assert.equal(row[key],second[key]);
}
fs.writeFileSync(process.argv[2],JSON.stringify({node:process.version,geometry:'captured-390',
  columns:['wallMs','threadCpuMs'],cases:fixture.provenance,rows:runs})+'\n');
