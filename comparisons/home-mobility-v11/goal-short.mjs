// Run just the opening of the unchanged V10 deterministic movement harness.
import fs from 'node:fs';
const baseline=new URL('../home-mobility-v10/native-preflight.mjs',import.meta.url);
const needle='for(let n=0;n<12000;n++)model.step(.05);';
const body=fs.readFileSync(baseline,'utf8');
if(body.split(needle).length!==2)throw Error('Native harness changed');
const ticks=Number(process.env.GOAL_TICKS||180);
if(!Number.isSafeInteger(ticks)||ticks<1||ticks>12000)throw Error('Invalid fixed step count');
const src=body.replaceAll('import.meta.url',JSON.stringify(baseline.href))
  .replace("from './corridor-scan.mjs'","from "+JSON.stringify(new URL('corridor-scan.mjs',baseline).href))
  .replace(needle,'for(let n=0;n<'+ticks+';n++)model.step(.05);');
await import('data:text/javascript;base64,'+Buffer.from(src).toString('base64'));
