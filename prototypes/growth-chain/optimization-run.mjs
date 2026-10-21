import fs from 'node:fs';
import crypto from 'node:crypto';
import {trial,profiles} from './optimization.mjs';
import {ensureManifest} from './balance-manifest.mjs';
const edition=process.env.EDITION??'screen';
const dir=new URL(`./optimization-${edition}-v2-20261014/`,import.meta.url);fs.mkdirSync(dir,{recursive:true});
const base=profiles.concat('legacy').map(policy=>({id:policy,policy}));
const params=[{id:'g12',gauge:12},{id:'g6',gauge:6},{id:'egg2',eggs:[2,0,0,0]},{id:'silver1',eggs:[0,1,0,0]},{id:'width7',width:7},{id:'kinds4',kinds:4},{id:'kinds6',kinds:6},{id:'fixed20-4',kinds:4,bag:'fixed20'},{id:'fixed20-6',kinds:6,bag:'fixed20'},{id:'next0',next:false}].map(c=>({policy:c.id==='next0'?'lookahead':'death',...c}));
let conditions=base.concat(params),seeds=Array.from({length:8},(_,i)=>200+i);
if(edition!=='screen'){const design=JSON.parse(fs.readFileSync(new URL(`./optimization-${edition}-design.json`,import.meta.url)));conditions=design.conditions;seeds=design.seeds;}
const sources={};function visit(f){if(sources[f])return;const b=fs.readFileSync(new URL(f,import.meta.url));sources[f]=crypto.createHash('sha256').update(b).digest('hex');for(const m of b.toString().matchAll(/(?:from\s*|import\s*)['"]\.\/([^'"]+\.mjs)['"]/g))visit(m[1]);}visit('optimization-run.mjs');
const limits={drops:600,actions:4000};ensureManifest(new URL('manifest.json',dir),{edition,conditions,seeds,limits,toolCap:64,sources,standard:'ba1936bf',time:'inputSteps times 0.25/0.5/1 s are assumption scenarios, not measured human time'});
const worker=Number(process.argv[2]??0),workers=Number(process.argv[3]??1);let job=0;
for(const c of conditions)for(const seed of seeds){if(job++%workers!==worker)continue;const f=new URL(`${c.id}-${seed}.json`,dir);if(fs.existsSync(f))continue;const t=trial(c,seed,limits);fs.writeFileSync(f,JSON.stringify(t));console.log(c.id,seed,t.metrics.status,t.metrics.drops,t.metrics.created,t.metrics.two08,t.metrics.deathGroups);}
