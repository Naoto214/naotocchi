// 正式の CARD GAME 実行ファイル（tools/pages/allowlist.json の prototypes/card-game/ の画像以外）を、指定のディレクトリへ写し、
// V5 のパッチを当てる。正式ファイルは読むだけで、前後の sha256 を照合する。
// 使い方（コマンド）：node build-stage.mjs <出力dir> [--official] [--no-cpu] [--variants '{"gorilla":"g4"}']   --official は無変更の写し（比較の基準）。
import fs from 'node:fs';import path from 'node:path';import {createHash} from 'node:crypto';import {fileURLToPath} from 'node:url';
import {applyV5} from './v5-patches.mjs';
const HERE=path.dirname(fileURLToPath(import.meta.url));
export const CG=path.resolve(HERE,'../..'),REPO=path.resolve(CG,'../..');
const sha=t=>createHash('sha256').update(t).digest('hex');
export function runtimeFiles(){return JSON.parse(fs.readFileSync(path.join(REPO,'tools/pages/allowlist.json'),'utf8')).files
 .filter(f=>f.startsWith('prototypes/card-game/')&&!/\.(webp|png)$/.test(f)).map(f=>path.relative(CG,path.join(REPO,f)));}
const official=()=>Object.fromEntries(runtimeFiles().map(f=>[f,sha(fs.readFileSync(path.join(CG,f)))]));
export function buildStage(out,{v4=true,cpu=true,ui=true,variants={}}={}){
 const before=official();fs.rmSync(out,{recursive:true,force:true});
 const src={};for(const f of runtimeFiles())src[f]=fs.readFileSync(path.join(CG,f),'utf8');
 const top=Object.fromEntries(Object.entries(src).filter(([f])=>!f.includes('/')&&f.endsWith('.mjs')));
 const patched=v4?applyV5(top,{cpu,ui,variants}):top;
 for(const [f,t] of Object.entries({...src,...patched})){const to=path.join(out,f);fs.mkdirSync(path.dirname(to),{recursive:true});fs.writeFileSync(to,t);}
 if(JSON.stringify(official())!==JSON.stringify(before))throw Error('正式ファイルが変わりました');
 return {out,patched:Object.keys(patched).filter(f=>patched[f]!==src[f]).sort()};
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 const out=path.resolve(process.argv[2]??'');if(!process.argv[2])throw Error('出力先を指定してください');
 console.log(JSON.stringify(buildStage(out,{v4:!process.argv.includes('--official'),cpu:!process.argv.includes('--no-cpu'),variants:JSON.parse(process.argv[process.argv.indexOf('--variants')+1]??'{}')})));
}
