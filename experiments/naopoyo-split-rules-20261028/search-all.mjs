import fs from 'node:fs';
import assert from 'node:assert/strict';
import {stages} from './baseline/prototypes/naopoyo-chapter2/stages.mjs';
const mode=process.argv[2]||'A',only=Number(process.argv[3])||0;
const E=await import(`./generated/${mode}/engine.mjs`),{search,replay}=await import(`./generated/${mode}/search.mjs`);
const old=JSON.parse(fs.readFileSync(new URL('./baseline/docs/naopoyo-gate-v8-20261026/solutions.json',import.meta.url)));
const results=[];
for(const st of stages.filter(s=>!only||s.number===only)){
 const row={mode,number:st.number,attempts:[],noSplit:null,savedReplay:false,path:null,shortestProven:false};
 const saved=old.stages.find(s=>s.number===st.number).path;
 try{row.savedReplay=E.complete(replay(st,saved));if(row.savedReplay)row.path=saved;}catch(error){row.savedError=error.message;}
 const bfs=search(st,{method:'bfs',limit:160000,maxMs:st.number<15?8000:5000});row.attempts.push(bfs);
 if(bfs.status==='solved'){row.path=bfs.path;row.shortestProven=bfs.shortestProven;}
 if(!row.path){
  const greedy=search(st,{method:'greedy',limit:350000,maxMs:15000});row.attempts.push(greedy);if(greedy.path)row.path=greedy.path;
 }
 if(!row.path&&st.number>=18)for(const weight of [2,4,6]){
  const score=s=>s.actors.reduce((sum,a)=>sum+(a.x<3?40+Math.abs(a.level-8)*2:0)+(a.y<=4?-a.level*(weight+3):8)+(a.x>=4?Math.min(...s.exits.map(e=>Math.abs(a.level-e.exact)))*2:0),0)-s.rescued*(weight+4);
  const r=search(st,{method:'greedy',score,limit:400000,maxMs:20000});row.attempts.push({...r,scoreWeight:weight});if(r.path){row.path=r.path;break;}
 }
 row.noSplit=search(st,{method:'bfs',filter:(_s,_next,r)=>!r.events.some(e=>e.type==='split'),limit:160000,maxMs:5000});
 if(row.path){assert.ok(E.complete(replay(st,row.path)));row.depth=row.path.length;row.replayed=true;
  let s=E.createState(st);E.settle(s);row.events={split:0,children:0,merge:0,overflow:0,fall:0};
  for(const p of row.path){const a=s.actors.find(a=>a.x===p.at[0]&&a.y===p.at[1]);const r=E.move(s,a.id,...p.d);for(const e of r.events){if(e.type in row.events)row.events[e.type]++;if(e.type==='split')row.events.children+=e.count;if(e.type==='merge'&&e.overflow)row.events.overflow++;}}
 }
 results.push(row);fs.writeFileSync(new URL(`./evidence/search-${mode}${only?'-'+only:''}.json`,import.meta.url),JSON.stringify(results,null,2)+'\n');
 console.log(mode,st.number,'saved',row.savedReplay,'new',row.depth,'shortest',row.shortestProven,'noSplit',row.noSplit.status,row.noSplit.depth,'attempts',row.attempts.map(r=>[r.status,r.visited,r.elapsedMs]));
}
