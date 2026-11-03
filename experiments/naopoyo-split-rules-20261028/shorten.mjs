// Bounded consecutive-deletion reduction; NOT a shortest-path proof.
import fs from 'node:fs';import assert from 'node:assert/strict';
import {stages} from './baseline/prototypes/naopoyo-chapter2/stages.mjs';
const mode=process.argv[2]||'B';const E=await import(`./generated/${mode}/engine.mjs`),{replay}=await import(`./generated/${mode}/search.mjs`);
const url=new URL(`./evidence/search-${mode}.json`,import.meta.url),rows=JSON.parse(fs.readFileSync(url));
if(mode==='C'){try{const extra=JSON.parse(fs.readFileSync(new URL('./evidence/search-C-16-followup.json',import.meta.url)));const solved=extra.find(r=>r.path);if(solved){const row=rows.find(r=>r.number===16);row.path=solved.path;row.depth=solved.depth;}}catch{}}
const results=[];
for(const row of rows){if(!row.path)continue;const st=stages.find(s=>s.number===row.number);let path=row.path,attempts=0,changed=true;
 while(changed){changed=false;outer:for(let len=path.length-1;len>=1;len--)for(let i=0;i+len<=path.length;i++){
  const candidate=[...path.slice(0,i),...path.slice(i+len)];attempts++;try{if(E.complete(replay(st,candidate))){path=candidate;changed=true;break outer;}}catch{}
 }}assert.ok(E.complete(replay(st,path)));
 const r={number:row.number,from:row.path.length,depth:path.length,path,attempts,shortestProven:row.shortestProven,replayed:true};results.push(r);
 console.log(mode,row.number,r.from,'->',r.depth,attempts);
 fs.writeFileSync(new URL(`./evidence/shortened-${mode}.json`,import.meta.url),JSON.stringify(results,null,2)+'\n');
}
