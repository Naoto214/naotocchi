// Reproducible release witness verification. No private UI/state hooks.
import fs from 'node:fs';import assert from 'node:assert/strict';
import {stages} from '../stages.mjs';import {replay,search} from '../search.mjs';import {complete} from '../../naopoyo-v2/engine.mjs';
const data=JSON.parse(fs.readFileSync(new URL('../../../docs/naopoyo-chapter2-20261024/expansion-solutions.json',import.meta.url)));
for(const w of data.stages){const s=stages.find(s=>s.id===w.id);assert.ok(complete(replay(s,w.path)));console.log(`${s.number}: ${w.path.length} accepted moves, all rescued; shortest=${w.shortestProven}`)}
if(process.argv.includes('--bfs'))for(const s of stages.filter(s=>s.number>=14))console.log(s.number,JSON.stringify({...search(s,{limit:400000,maxMs:30000}),path:undefined}));
