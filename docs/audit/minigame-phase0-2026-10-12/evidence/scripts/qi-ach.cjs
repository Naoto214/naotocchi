const fs=require('fs');const R='/home/user/naotocchi/';
const src=fs.readFileSync(R+'script.js','utf8');const L=src.split('\n');
const all=fs.readdirSync(R).filter(f=>f.endsWith('.js')).map(f=>fs.readFileSync(R+f,'utf8')).join('\n');
const fields=new Map();
L.forEach((l,i)=>{ if(!/condition:\s*\(/.test(l))return; const id=(/id:\s*'([^']+)'/.exec(l)||[])[1];
  for(const m of l.matchAll(/\b(?:l|s|L|state|lifetime)\.(\w+)(?:\.(\w+))?/g)){const k=m[1]+(m[2]?'.'+m[2]:'');if(!fields.has(k))fields.set(k,[]);fields.get(k).push(id);} });
for(const [k,ids] of fields){const [a,b]=k.split('.');const n=b||a;
  const re=new RegExp('\\.'+n+'(\\s*(=(?!=)|\\+=|-=|\\|\\|=|\\?\\?=|\\+\\+)|\\.(push|add|set)\\(|\\[[^\\]\\n]+\\]\\s*(=(?!=)|\\+=|\\+\\+))','g');
  const re2=new RegExp('\\b'+n+'\\s*(\\+=|\\+\\+|=(?!=))','g');
  const w=(all.match(re)||[]).length;const w2=(all.match(re2)||[]).length;
  console.log(`${k}\twrites=${w}\tbare=${w2}\t${[...new Set(ids)].slice(0,4).join(',')}`);}
