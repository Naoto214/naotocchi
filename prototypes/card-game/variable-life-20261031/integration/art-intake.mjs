// VERSION 8: intake check for the 7 candidate cards' illustrations made by Astra (ASTRA-ART-SPEC.md). Claude makes no images.
// check <dir> : for each candidate ID, looks for <dir>/<ID>.png and checks the delivery rules of the 452 official originals —
//               PNG, 1536×1024 (3:2), 8-bit RGB without alpha (colour type 2), non-interlaced — and its SHA-256. A missing file
//               is reported as "placeholder" (the game keeps the existing 画像を表示できません card face until art arrives).
// deliver <dir> <out> : (owner-approved adoption only) the same WebP outputs as art-delivery/build.mjs — small 384×256 q86,
//               large 1152×768 q90, named <ID>-<sha12>.webp — into <out> outside the repository, plus card-art-candidate.json
//               (the CARD_ART entries to add). Needs sharp (NODE_PATH, like art-delivery/build.mjs).
// Usage: node integration/art-intake.mjs check <dir>   |   node integration/art-intake.mjs deliver <dir> <out>
import {readFileSync,existsSync,mkdirSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {join,resolve} from 'node:path';
import {createRequire} from 'node:module';
import {CANDIDATE_IDS} from './candidate-cards.mjs';
const sha=b=>createHash('sha256').update(b).digest('hex');
const SIG=Buffer.from([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a]);
export function pngInfo(buf){
 if(buf.length<33||!buf.subarray(0,8).equals(SIG)||buf.toString('latin1',12,16)!=='IHDR')return {png:false};
 return {png:true,width:buf.readUInt32BE(16),height:buf.readUInt32BE(20),bitDepth:buf[24],colorType:buf[25],interlace:buf[28]};
}
export function checkFile(buf){
 const i=pngInfo(buf),problems=[];
 if(!i.png)problems.push('PNG ではありません');
 else{if(i.width!==1536||i.height!==1024)problems.push(`大きさが ${i.width}×${i.height}（1536×1024 が必要）`);
  if(i.colorType!==2)problems.push(i.colorType===6||i.colorType===4?'透過（アルファ）があります（RGB・透過なしが必要）':`色の形式が RGB ではありません（colour type ${i.colorType}）`);
  if(i.bitDepth!==8)problems.push(`ビット深度 ${i.bitDepth}（8 が必要）`);if(i.interlace!==0)problems.push('インターレース PNG です');}
 return {ok:problems.length===0,problems,info:i,sha256:sha(buf),bytes:buf.length};
}
export function check(dir){
 return Object.fromEntries(CANDIDATE_IDS.map(id=>{const f=join(dir,id+'.png');
  if(!existsSync(f))return [id,{status:'placeholder',note:'画像なし。既存の「画像を表示できません」表示のまま'}];
  const r=checkFile(readFileSync(f));return [id,{status:r.ok?'ok':'rejected',...r}];}));
}
async function deliver(dir,out){
 const result=check(dir),bad=Object.entries(result).filter(([,r])=>r.status==='rejected');if(bad.length)throw Error('受け入れできない画像があります: '+bad.map(([id])=>id).join(', '));
 const sharp=createRequire(import.meta.url)('sharp'),entries={};out=resolve(out);
 for(const [id,r] of Object.entries(result)){if(r.status!=='ok')continue;const original=readFileSync(join(dir,id+'.png'));entries[id]={source_sha256:r.sha256};
  for(const [size,width,quality] of [['small',384,86],['large',1152,90]]){const b=await sharp(original).resize({width,withoutEnlargement:true}).webp({quality,effort:5}).toBuffer();
   const file=`${size}/${id}-${sha(b).slice(0,12)}.webp`;mkdirSync(join(out,size),{recursive:true});writeFileSync(join(out,file),b);entries[id][size]=`art-delivery/${file}`;}}
 writeFileSync(join(out,'card-art-candidate.json'),JSON.stringify(entries,null,1)+'\n');return entries;
}
if(import.meta.url===`file://${process.argv[1]}`){const [cmd,dir,out]=process.argv.slice(2);
 if(cmd==='check')console.log(JSON.stringify(check(dir),null,1));else if(cmd==='deliver')console.log(JSON.stringify(await deliver(dir,out),null,1));else{console.error('usage: check <dir> | deliver <dir> <out>');process.exit(2);}}
