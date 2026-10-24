import fs from 'node:fs';import {stages} from '../stages.mjs';import {search,replay} from '../search.mjs';import {complete} from '../../naopoyo-v2/engine.mjs';
const limits={method:'greedy',maxMs:4000,limit:60000};const checks={
 noMerge:(_s,_n,r)=>!r.events.some(e=>e.type==='merge'),noSplit:(_s,_n,r)=>!r.events.some(e=>e.type==='split'),
 noOverflow:(_s,_n,r)=>!r.events.some(e=>e.type==='merge'&&e.overflow),noFall:(_s,_n,r)=>!r.events.some(e=>e.type==='fall'),
 noSupport:(_s,n)=>!n.actors.some(a=>n.actors.some(b=>a.x===b.x&&a.y+1===b.y))};
const out={limits,definition:'Event/state ablation, not changed physics. exhausted proves no path under filter; limit is inconclusive.',stages:[]};
for(const s of stages.filter(s=>s.number>=14)){const row={id:s.id,number:s.number,ablations:{}};for(const [name,filter]of Object.entries(checks)){const r=search(s,{...limits,filter});if(r.path&&!complete(replay(s,r.path)))throw Error('not complete');row.ablations[name]=r;console.log(s.number,name,r.status,r.visited,r.depth);}out.stages.push(row);}fs.writeFileSync(process.argv[2]||'/tmp/chapter2-ablation.json',JSON.stringify(out,null,2));
