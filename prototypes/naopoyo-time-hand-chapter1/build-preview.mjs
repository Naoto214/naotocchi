import fs from 'node:fs';import path from 'node:path';import crypto from 'node:crypto';import {fileURLToPath} from 'node:url';import {spriteData} from '../naopoyo-rescue/sprite-data.mjs';
const root=fileURLToPath(new URL('../../',import.meta.url)),target=path.resolve(process.argv[2]||'/workspace/sites/naopoyo-time-hand-chapter1-20261102/dist'),seen=new Set(),manifest=[];
function standaloneEntry(html) {
  // This preview's root opens the puzzle. Only the full game has a pet home.
  return html.replace(/<a\b[^>]*\bdata-game-home\b[^>]*>[^<]*<\/a>/, '');
}
function copy(rel){if(seen.has(rel))return;seen.add(rel);const src=path.join(root,rel),dest=path.join(target,rel);fs.mkdirSync(path.dirname(dest),{recursive:true});if (rel === 'prototypes/naopoyo-time-hand-chapter1/index.html') {
  fs.writeFileSync(dest, standaloneEntry(fs.readFileSync(src, 'utf8')));
} else {
  fs.copyFileSync(src, dest);
}
manifest.push({path:rel,sha256:crypto.createHash('sha256').update(fs.readFileSync(dest)).digest('hex')});if(rel.endsWith('.css')){for(const m of fs.readFileSync(src,'utf8').matchAll(/@import url\(['"]([^'"]+)['"]\)/g))copy(path.normalize(path.join(path.dirname(rel),m[1])));}if(rel.endsWith('.mjs')){const text=fs.readFileSync(src,'utf8');for(const match of text.matchAll(/from\s+['"]([^'"]+)['"]/g))if(match[1].startsWith('.'))copy(path.normalize(path.join(path.dirname(rel),match[1])));}}
for (const file of ['game-home-return.css', 'game-home-return.js']) copy(file);
for(const f of ['index.html','style.css','app.mjs','assets/gravity-wood-approved.webp'])copy('prototypes/naopoyo-time-hand-chapter1/'+f);
for(const spec of Object.entries(spriteData).filter(([key])=>!key.startsWith('owl')).map(([,s])=>s))copy(spec.path);
fs.writeFileSync(path.join(target,'index.html'),'<!doctype html><html lang="ja"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="refresh" content="0;url=./prototypes/naopoyo-time-hand-chapter1/"><title>なおぽよ。ときのはり</title><a href="./prototypes/naopoyo-time-hand-chapter1/">第1章 地下牢を開く</a></html>');
manifest.push({path:'index.html',sha256:crypto.createHash('sha256').update(fs.readFileSync(path.join(target,'index.html'))).digest('hex')});
fs.writeFileSync(path.join(target,'manifest.json'),JSON.stringify({sourceMain:'aafe4abe7842b2fcf57060b207500e5b24f6c7a0',sourceD:'329645edf89b6d34ef888e833643819296764f36',files:manifest},null,2));
console.log(JSON.stringify({target,files:manifest.length,bytes:manifest.reduce((n,f)=>n+fs.statSync(path.join(target,f.path)).size,0)}));
