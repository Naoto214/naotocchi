// Equivalence check: the base arm (experiment copy, every switch off) must reproduce PR #489's official-CPU games
// exactly (same save sha256 = same command list). Usage: node tools/equivalence.mjs <dir with PR489 T-shard*.jsonl.gz> runs/base-shard*.jsonl
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
const [dir,...files]=process.argv.slice(2);
const T=new Map();for(let k=0;k<4;k++)for(const l of gunzipSync(readFileSync(`${dir}/T-shard${k}.jsonl.gz`)).toString().split('\n').filter(Boolean)){const r=JSON.parse(l);T.set(r.match,r.saveSha256);}
let same=0,diff=[];const text=f=>f.endsWith('.gz')?gunzipSync(readFileSync(f)).toString():readFileSync(f,'utf8');
for(const f of files)for(const l of text(f).split('\n').filter(Boolean)){const r=JSON.parse(l);if(T.get(r.match)===r.saveSha256)same++;else diff.push(r.match);}
console.log(JSON.stringify({reference:T.size,compared:same+diff.length,same,different:diff},null,1));
