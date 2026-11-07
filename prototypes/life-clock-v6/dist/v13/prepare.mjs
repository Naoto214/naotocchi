import fs from 'node:fs';import{createRequire}from'node:module';import{artwork,patches}from'./decoration.mjs';
const sharp=createRequire(import.meta.url)(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/sharp');
const pixels=Buffer.alloc(1024*1024*3);
for(let y=0;y<1024;y++)for(let x=0;x<1024;x++){let dx=0,dy=0;for(const p of patches){const d=Math.hypot(x-p.x,y-p.y)/p.r;const w=d<1?Math.pow(1-d*d,3):0;dx+=p.dx*w;dy+=p.dy*w;}const i=(y*1024+x)*3;pixels[i]=Math.round(127.5-dx*255/80);pixels[i+1]=Math.round(127.5-dy*255/80);pixels[i+2]=128;}
const map=await sharp(pixels,{raw:{width:1024,height:1024,channels:3}}).png().toBuffer();fs.writeFileSync(new URL('displacement.png',import.meta.url),map);const mapUri='data:image/png;base64,'+map.toString('base64');
const art='data:image/png;base64,'+fs.readFileSync(new URL('../assets/dial-art-v4.png',import.meta.url)).toString('base64');
const mask='data:image/png;base64,'+fs.readFileSync(new URL('../v11/evidence/silver-mask.png',import.meta.url)).toString('base64');
for(const [name,href]of[['mask',mask]])await sharp(Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024">${artwork(`<image href="${href}" width="1024" height="1024"/>`,'contour13',mapUri)}</svg>`)).png().toFile(new URL(`evidence/${name}.png`,import.meta.url).pathname);
