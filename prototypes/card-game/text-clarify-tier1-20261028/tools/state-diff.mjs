// main と作業ブランチで同じCPU対戦（seed1・初級、ルナランダー／サブマリン3D入り）を行い、状態と表示の差のある項目を列挙する。使い方: node state-diff.mjs <main の card-game> <ブランチの card-game>
import {pathToFileURL} from 'node:url';import {join,resolve} from 'node:path';
const run=async dir=>{const e=await import(pathToFileURL(join(resolve(dir),'engine.mjs')).href);const {observeCpu}=await import(pathToFileURL(join(resolve(dir),'cpu-observation.mjs')).href);const {chooseCpuAction}=await import(pathToFileURL(join(resolve(dir),'cpu-policy.mjs')).href);
 const x=spec=>Object.entries(spec).flatMap(([id,n])=>Array(n).fill(id));
 const DECK=x({'G-lunar-lander':3,'G-submarine-3d':3,'M-dog-01':3,'M-dog-02':3,'M-dog-03':3,'M-dog-04':3,'M-dog-05':2,'M-beetle-01':3,'M-beetle-02':3,'C-panda':3,'C-shiba':3,'W-snow':2,'I-c_coin2':3,'G-real-fishing':3});
 let s=e.createGame(1,{A:DECK,B:DECK});let g=0;while(s.phase!=='finished'&&g++<5000){const a=e.actor(s),o=observeCpu(s,a),d=chooseCpuAction(o,{difficulty:'beginner',seed:1+(a==='A'?1:2),step:s.revision});s=e.act(s,a,s.revision,d.id);}
 return {s:JSON.parse(JSON.stringify(s)),vA:JSON.parse(JSON.stringify(e.view(s,'A')))};};
const A=await run(process.argv[2]),B=await run(process.argv[3]);
const diffs=[];const walk=(a,b,p)=>{if(JSON.stringify(a)===JSON.stringify(b))return;if(a&&b&&typeof a==='object'&&typeof b==='object'){for(const k of new Set([...Object.keys(a),...Object.keys(b)]))walk(a[k],b[k],p+'.'+k);}else diffs.push([p,String(a).slice(0,60),String(b).slice(0,60)]);};
walk(A.s,B.s,'state');walk(A.vA,B.vA,'viewA');
const keys=[...new Set(diffs.map(d=>d[0].replace(/\.\d+/g,'.N')))];console.log(keys);console.log(diffs.slice(0,4));
