import fs from 'node:fs';import assert from 'node:assert/strict';
import {stages} from './baseline/prototypes/naopoyo-chapter2/stages.mjs';
const root=new URL('./',import.meta.url),out={witnesses:[],crossReplay:[]};
const A=await import('./generated/A/search.mjs');
for(const mode of ['A','B','C','B-once']){
 const E=await import(`./generated/${mode}/engine.mjs`),P=await import(`./generated/${mode}/preview.mjs`);
 const rows=JSON.parse(fs.readFileSync(new URL(`evidence/shortened-${mode}.json`,root)));assert.equal(rows.length,10);
 for(const row of rows){const st=stages.find(s=>s.number===row.number),s=E.createState(st);E.settle(s);const mass=E.mass(s),record={mode,number:st.number,depth:row.path.length,split:0,children:0,merge:0,fall:0,overflow:0,previewMatches:0};
  for(const p of row.path){const a=s.actors.find(a=>a.x===p.at[0]&&a.y===p.at[1]&&(p.level===undefined||a.level===p.level));assert.ok(a);const saved=JSON.stringify(s),preview=P.simulateSplit(s,a.id,...p.d);assert.equal(JSON.stringify(s),saved);const r=E.move(s,a.id,...p.d);assert.ok(r.ok);assert.equal(E.mass(s),mass);assert.ok(E.validState(st,s));for(const v of s.actors)assert.ok(E.supportsAt(s,v.x,v.y+1,v,v.id));
   for(const e of r.events){if(e.type in record)record[e.type]++;if(e.type==='split')record.children+=e.count;if(e.type==='merge'&&e.overflow)record.overflow++;}
   if(preview){assert.deepEqual(preview.state,s);record.previewMatches++;}
  }assert.ok(E.complete(s));record.complete=true;out.witnesses.push(record);
  if(mode!=='A'){try{out.crossReplay.push({mode,number:st.number,AComplete:E.complete(A.replay(st,row.path))});}catch(e){out.crossReplay.push({mode,number:st.number,AComplete:false,reason:e.message});}}
 }
}
fs.writeFileSync(new URL('evidence/final-witnesses.json',root),JSON.stringify(out,null,2)+'\n');console.log('40/40 final witnesses replayed; mass, validity, support and split preview assertions passed.');
console.log(out.witnesses.filter(r=>r.number>=19));
