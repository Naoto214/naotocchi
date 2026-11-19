import fs from 'node:fs';import{createRequire}from'node:module';import{render,sample,studies}from'./clock-v12.mjs';
const sharp=createRequire(import.meta.url)(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/sharp');fs.mkdirSync(new URL('evidence/masks/',import.meta.url),{recursive:true});const entries=[];
for(const o of Object.values(studies).flat()){
 const s=render(sample,o);for(const [kind,re]of [['main',/<g data-main-number="([^"]+)"[\s\S]*?<\/g>/g],['growth',/<g data-growth-number="([^"]+)"[\s\S]*?<\/g>/g],['end',/<g data-end-number="([^"]+)"[\s\S]*?<\/g>/g]]){
 let j=0;for(const m of s.matchAll(re)){const text=m[0].match(/<text[^>]*>[\s\S]*?<\/text>/)[0];const file=`${o.id}-${kind}-${j++}.png`;await sharp(Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024">${text}</svg>`)).png().toFile(new URL('evidence/masks/'+file,import.meta.url).pathname);entries.push({option:o.id,kind,number:m[1],file});}
 }
}
fs.writeFileSync(new URL('evidence/masks.json',import.meta.url),JSON.stringify(entries));
