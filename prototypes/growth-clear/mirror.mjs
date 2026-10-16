// Exact horizontal-reflection control of the resolver (not a player-policy mirror).
import fs from 'node:fs';import {board} from '../growth-chain/engine.mjs';import {standardRules} from '../growth-chain/rules.mjs';import {random} from '../growth-chain/random.mjs';import {resolve} from './engine.mjs';
const r=standardRules(),mirror=b=>b.map(row=>[...row].reverse()),stats={samples:1000,A:{spatialDifferences:0,successDifferences:0},B:{spatialDifferences:0,successDifferences:0},C:{spatialDifferences:0,successDifferences:0}};
for(let seed=9000;seed<10000;seed++){
 const rng={state:seed},b=board(r);let id=1;for(let x=0;x<6;x++){const height=2+Math.floor(random(rng)*5);for(let j=0;j<height;j++)b[13-j][x]={id:id++,k:Math.floor(random(rng)*5),s:1+Math.floor(random(rng)*8)};}
 for(const anchor of ['A','B','C']){const ctx={anchor,priority:[id-1,id-2],choose:g=>Math.min(...g.map(c=>c.id))},a=resolve(b,r,ctx),m=resolve(mirror(b),r,ctx);if(JSON.stringify(mirror(a.board))!==JSON.stringify(m.board))stats[anchor].spatialDifferences++;if(Boolean(a.deaths)!==Boolean(m.deaths))stats[anchor].successDifferences++;}
}
fs.writeFileSync(new URL('./mirror-results.json',import.meta.url),JSON.stringify({...stats,scope:'Resolver reflection, same cell IDs, B same last-two IDs, C chooses lowest ID. C is equivariant control, not positional player strategy. Not an estimator of human left/right advantage.'},null,2));console.log(stats);
