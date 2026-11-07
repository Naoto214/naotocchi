import {render,sample} from './clock-v11.mjs';import fs from 'node:fs';import {createRequire} from 'node:module';
const sharp=createRequire(import.meta.url)(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/sharp');
const dir=new URL('evidence/final-masks/',import.meta.url);fs.mkdirSync(dir,{recursive:true});
for(const v of ['A','B','C','D','E']){const s=render(sample,{variant:v});for(const m of s.matchAll(/<g data-main-number="(\d+)"[\s\S]*?<\/g>/g))await sharp(Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024">${m[0]}</svg>`)).png().toFile(new URL(`${v}-${m[1]}.png`,dir).pathname);}
