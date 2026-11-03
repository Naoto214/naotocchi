import fs from 'node:fs';import {search} from '../search.mjs';import {shorten} from './shorten.mjs';
const row=JSON.parse(fs.readFileSync('docs/naopoyo-gravity-20261024/evidence/guided-20.json')).find(r=>r.result.status==='solved');
const result=search(row.stage,{method:'bfs',limit:500000,maxMs:60000});console.log(result.status,result.depth,result.visited);let reduced=null;try{reduced=shorten(row.stage,row.result.path,{passes:80})}catch(e){console.log(e.message)}
fs.writeFileSync('docs/naopoyo-gravity-20261024/evidence/20-final-search.json',JSON.stringify({stage:row.stage,result,reduced},null,2));console.log('reduced',reduced?.path?.length);
