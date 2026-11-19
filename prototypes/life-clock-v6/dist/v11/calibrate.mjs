// Reproducible analysis, never changes the artwork. Rasterizer's Georgia fallback: DejaVu Serif.
import fs from 'node:fs';import {createRequire} from 'node:module';
const sharp=createRequire(import.meta.url)(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/sharp');
const out=new URL('evidence/',import.meta.url);const metrics={};
for(const size of [46,48,50,52]){metrics[size]={};for(let n=1;n<=12;n++){
 const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="160" height="160"><text x="80" y="80" font-family="Georgia,serif" font-size="${size}" font-weight="400" text-anchor="middle" dominant-baseline="central" style="font-variant-numeric:lining-nums" fill="white">${n}</text></svg>`;
 const {data,info}=await sharp(Buffer.from(svg)).ensureAlpha().raw().toBuffer({resolveWithObject:true});let x0=160,y0=160,x1=0,y1=0;
 for(let y=0;y<160;y++)for(let x=0;x<160;x++)if(data[(y*160+x)*4+3]>24){x0=Math.min(x0,x);y0=Math.min(y0,y);x1=Math.max(x1,x);y1=Math.max(y1,y);}
 metrics[size][n]={width:x1-x0+1,height:y1-y0+1,dx:80-(x0+x1+1)/2,dy:80-(y0+y1+1)/2};
 await sharp(Buffer.from(svg)).png().toFile(new URL(`glyph-${size}-${n}.png`,out).pathname);
}}
fs.writeFileSync(new URL('glyph-metrics.json',out),JSON.stringify(metrics,null,2));
