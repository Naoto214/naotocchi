import fs from 'node:fs';import {candidates} from './candidates.mjs';import {search} from '../search.mjs';
for(const s of candidates.filter(s=>!process.argv[2]||s.id.includes(process.argv[2]))){const r=search(s,{limit:100000,maxMs:6000});fs.writeFileSync('/tmp/candidate-'+s.id+'.json',JSON.stringify({stage:s,result:r},null,2));console.log(s.id,JSON.stringify({...r,path:r.path?.length}));}
