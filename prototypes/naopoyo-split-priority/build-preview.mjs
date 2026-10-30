import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {spriteData} from '../naopoyo-rescue/sprite-data.mjs';
const repo=fileURLToPath(new URL('../../',import.meta.url)),target=path.resolve(process.argv[2]||'/tmp/naopoyo-split-preview'),manifest=[];
function copy(rel){const src=path.join(repo,rel),dest=path.join(target,rel);fs.mkdirSync(path.dirname(dest),{recursive:true});fs.copyFileSync(src,dest);manifest.push({path:rel,sha256:crypto.createHash('sha256').update(fs.readFileSync(src)).digest('hex')});}
const dir='prototypes/naopoyo-split-priority';
for(const f of ['index.html','style.css','app.mjs','draw.mjs','model.mjs','engine.mjs','priorities.mjs','atlas.html','atlas.mjs','report.html','compatibility.json'])copy(`${dir}/${f}`);
for(const f of ['prototypes/naopoyo-v2/engine.mjs','prototypes/naopoyo-rescue/conditions.mjs','prototypes/naopoyo-rescue/sprites.mjs','prototypes/naopoyo-rescue/sprite-data.mjs','prototypes/naopoyo-rescue/fixtures.mjs','prototypes/naopoyo-chapter2/stone.mjs','prototypes/naopoyo-chapter2/gate-art.mjs'])copy(f);
for(const f of new Set(Object.entries(spriteData).filter(([k])=>!k.startsWith('owl')).map(([,v])=>v.path)))copy(f);
fs.mkdirSync(target,{recursive:true});fs.writeFileSync(path.join(target,'index.html'),'<!doctype html><meta charset="utf-8"><meta http-equiv="refresh" content="0;url=./prototypes/naopoyo-split-priority/"><a href="./prototypes/naopoyo-split-priority/">なおぽよ。分裂の実験室</a>');
fs.writeFileSync(path.join(target,'manifest.json'),JSON.stringify({base:'851cf09a80c7ed41ba7293888084272917e4582c',files:manifest},null,2));
console.log(JSON.stringify({target,files:manifest.length+2,bytes:manifest.reduce((n,f)=>n+fs.statSync(path.join(target,f.path)).size,0)}));
