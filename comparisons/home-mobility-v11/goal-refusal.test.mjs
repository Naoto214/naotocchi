import assert from 'node:assert/strict';
import test from 'node:test';
import {mkdtempSync,readFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';

test('a full native refusal can finish a safe forward walk without replacing any earlier successful branch',t=>{
  const dir=mkdtempSync(path.join(tmpdir(),'naotocchi-forward-'));
  t.after(()=>rmSync(dir,{recursive:true,force:true}));
  const here=fileURLToPath(new URL('.',import.meta.url));
  function replay(mode){
    const result=path.join(dir,mode+'.json');
    execFileSync(process.execPath,[path.join(here,'goal-short.mjs'),'320','v10','214',path.join(here,'goal-cold-witness.cjs')],
      {env:{...process.env,GOAL_TICKS:'80',GOAL_WITNESS_MODE:mode,GOAL_WITNESS_OUT:result}});
    return JSON.parse(readFileSync(result));
  }
  const before=replay('original'),after=replay('ray');
  assert.deepEqual(before.before,after.before);
  assert.equal(before.before.cast.length,28);
  assert.equal(before.nativeRequestReturned,false);
  assert.equal(after.nativeRequestReturned,true);
  assert.deepEqual(after.nativeAssignedTarget,after.offer[0]);
  assert.deepEqual(after.nativeArrival.foot,after.offer[0]);
  assert.equal(after.nativeArrival.source,'ambient');
  assert.ok(after.steps.length>1);
  assert.ok(after.steps.every(s=>s.terrain&&s.bodyVisible&&s.inside&&s.atNativeSpeed&&s.collisions.length===0));
  const [sx,sy]=after.before.cssScale;
  const dist=(a,b)=>Math.hypot((a[0]-b[0])*sx,(a[1]-b[1])*sy);
  const target=after.before.request,end=after.nativeArrival.foot,start=after.before.foot;
  assert.ok(dist(start,end)>=16-1e-7);
  assert.ok(dist(start,target)-dist(end,target)>9);
});
