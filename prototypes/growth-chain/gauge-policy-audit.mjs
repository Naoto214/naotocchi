import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import {pathToFileURL,fileURLToPath}from'node:url';import {execFileSync}from'node:child_process';import assert from 'node:assert/strict';
import {chooseEggPolicy} from './egg-policy.mjs';import {applyAction} from './session.mjs';
const root=fileURLToPath(new URL('./',import.meta.url)),tmp=fs.mkdtempSync(path.join(os.tmpdir(),'gauge-audit-'));
try{
 for(const f of fs.readdirSync(root))if(f.endsWith('.mjs'))fs.copyFileSync(path.join(root,f),path.join(tmp,f));
 fs.writeFileSync(path.join(tmp,'egg-policy.mjs'),execFileSync('git',['show','d5022f6a4a7f96b347eec338021ed8b2dcb57535:prototypes/growth-chain/egg-policy.mjs'],{cwd:root}));
 const old=(await import(pathToFileURL(path.join(tmp,'egg-policy.mjs')))).chooseEggPolicy;
 let checked=0;for(const gauge of [2,8])for(let seed=300;seed<332;seed++){
  const t=JSON.parse(fs.readFileSync(path.join(root,`gauge-results-20261014/fixed-g${gauge}-${seed}.json`)));let s=t.initial,streak=0;
  for(let i=0;i<t.actions.length;i++){
   if([0,Math.floor(t.actions.length/2),t.actions.length-1].includes(i)){
    const options={allowItems:streak<64},a=chooseEggPolicy(s,'active',options);
    assert.deepEqual(a,old(s,'active',options));assert.deepEqual(a,t.actions[i]);checked++;
   }
   s=applyAction(s,t.actions[i],false);streak=t.actions[i].type==='drop'?0:streak+1;
  }
 }
 console.log(JSON.stringify({status:'PASS',checked,scope:'3 deterministic positions per reused trial; old/current default action equality and archived decision equality. Not full decision re-execution.'}));
}finally{fs.rmSync(tmp,{recursive:true,force:true});}
