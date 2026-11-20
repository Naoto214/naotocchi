// VERSION 9: takes Astra's delivery (the unzipped folder) for the 7 candidate cards. Claude makes no images.
//   node integration/integrate-art.mjs <unzipped-dir> <out-dir>
// 1. File names: every candidate ID needs <ID>.png somewhere in the folder (case-sensitive, exactly one each); unknown PNGs fail.
// 2. SHA-256: every hash listed in the delivery (any *.sha256 / SHA256SUMS / *.txt / *.json / *.csv / *.md file that pairs a
//    64-hex hash with a file name) must match the file; a PNG without a listed hash fails, so the delivery list is the master.
// 3. Image rules (integration/art-intake.mjs, same as the 452 originals): PNG, 1536×1024, 8-bit RGB without alpha, non-interlaced.
// 4. WebP outputs exactly like art-delivery/build.mjs (sharp, small 384 q86 / large 1152 q90, <ID>-<sha12>.webp; checked to
//    reproduce the official C-bat files byte for byte) into <out-dir>/art-delivery/{small,large}/, plus <out-dir>/card-art-v9.json
//    (CARD_ART entries keyed by candidate ID and the originals' SHA-256). Nothing official is written.
import {readdirSync,readFileSync,statSync,mkdirSync,writeFileSync} from 'node:fs';
import {join,basename,resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {CANDIDATE_IDS} from './candidate-cards.mjs';
import {checkFile} from './art-intake.mjs';
const sha=b=>createHash('sha256').update(b).digest('hex');
function walk(d){return readdirSync(d,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(join(d,e.name)):[join(d,e.name)]);}
export function listedHashes(files){
 const out={};for(const f of files.filter(f=>/(\.sha256|SHA256SUMS|\.txt|\.json|\.csv|\.md)$/i.test(f))){const t=readFileSync(f,'utf8');
  for(const line of t.split(/\r?\n/)){const h=line.match(/\b[0-9a-f]{64}\b/i);const n=line.match(/([A-Za-z0-9_.-]+\.png)/);if(h&&n){const k=basename(n[1]);if(out[k]&&out[k]!==h[0].toLowerCase())throw Error('同じファイルに違うハッシュ: '+k);out[k]=h[0].toLowerCase();}}}
 return out;
}
export function inspect(dir){
 const files=walk(resolve(dir)),pngs=files.filter(f=>f.toLowerCase().endsWith('.png')),byName={};
 for(const f of pngs){const n=basename(f);(byName[n]??=[]).push(f);}
 const listed=listedHashes(files),problems=[],cards={};
 for(const n of Object.keys(byName))if(!CANDIDATE_IDS.includes(n.replace(/\.png$/,'')))problems.push('対応表にない PNG: '+n);
 for(const id of CANDIDATE_IDS){const n=id+'.png',hits=byName[n]??[];
  if(hits.length!==1){problems.push(hits.length?`${n} が ${hits.length} 個あります`:`${n} がありません`);continue;}
  const buf=readFileSync(hits[0]),r=checkFile(buf);
  if(!listed[n])r.problems.push('配布物の SHA-256 の一覧にありません');else if(listed[n]!==r.sha256)r.problems.push(`SHA-256 が一覧と違います（一覧 ${listed[n].slice(0,12)}…、実物 ${r.sha256.slice(0,12)}…）`);
  cards[id]={file:hits[0],sha256:r.sha256,bytes:r.bytes,info:r.info,ok:r.problems.length===0,problems:r.problems};if(r.problems.length)problems.push(`${n}: ${r.problems.join('、')}`);}
 return {ok:problems.length===0,problems,cards,listedHashes:Object.keys(listed).length};
}
export async function deliver(dir,out){
 const report=inspect(dir);if(!report.ok)return report;
 const sharp=createRequire(import.meta.url)('sharp'),entries={};out=resolve(out);
 for(const [id,c] of Object.entries(report.cards)){const original=readFileSync(c.file);entries[id]={source_sha256:c.sha256};
  for(const [size,width,quality] of [['small',384,86],['large',1152,90]]){const b=await sharp(original).resize({width,withoutEnlargement:true}).webp({quality,effort:5}).toBuffer();
   const file=`art-delivery/${size}/${id}-${sha(b).slice(0,12)}.webp`;mkdirSync(join(out,'art-delivery',size),{recursive:true});writeFileSync(join(out,file),b);
   entries[id][size]=file;entries[id][size+'_sha256']=sha(b);entries[id][size+'_bytes']=b.length;}}
 writeFileSync(join(out,'card-art-v9.json'),JSON.stringify(entries,null,1)+'\n');
 return {...report,delivered:entries};
}
if(import.meta.url===`file://${process.argv[1]}`){const [dir,out]=process.argv.slice(2);if(!dir||!out){console.error('usage: integrate-art.mjs <unzipped-dir> <out-dir>');process.exit(2);}
 const r=await deliver(dir,out);console.log(JSON.stringify({ok:r.ok,problems:r.problems,listedHashes:r.listedHashes,cards:Object.fromEntries(Object.entries(r.cards).map(([k,v])=>[k,{ok:v.ok,sha256:v.sha256,size:v.info?.width+'x'+v.info?.height,problems:v.problems}])),delivered:r.delivered},null,1));process.exitCode=r.ok?0:1;}
