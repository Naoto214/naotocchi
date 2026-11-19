import fs from 'node:fs';import {createRequire} from 'node:module';import {render,sample} from './clock-v11.mjs';
const sharp=createRequire(import.meta.url)(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/sharp');
const art='data:image/png;base64,'+fs.readFileSync(new URL('../assets/dial-art-v4.png',import.meta.url)).toString('base64');
const names=['A','B','C','D','E'],labels=['A / +15% BEFORE','B / +15% ADJUSTED','C / +20% ADJUSTED','D / +25% ADJUSTED','E / +30% ADJUSTED'];
async function raster(v,crop,w,h){return sharp(Buffer.from(render(sample,{variant:v,crop}).replace(/viewBox="[^"]+"/,crop==='end'?'viewBox="392 568 240 240"':render(sample,{variant:v,crop}).match(/viewBox="[^"]+"/)[0]).replaceAll('../assets/dial-art-v4.png',art))).resize(w,h).png().toBuffer();}
async function sheet(file,crops,width,height){const items=[];for(let i=0;i<5;i++){items.push({input:Buffer.from(`<svg width="${width}" height="40"><text x="${width/2}" y="28" text-anchor="middle" font-family="sans-serif" font-size="18" fill="#233e4e">${labels[i]}</text></svg>`),left:i*width,top:0});for(let j=0;j<crops.length;j++)items.push({input:await raster(names[i],crops[j],width,height),left:i*width,top:40+j*height});}await sharp({create:{width:width*5,height:40+height*crops.length,channels:3,background:'#f5f6f5'}}).composite(items).jpeg({quality:94}).toFile(new URL('evidence/'+file,import.meta.url).pathname);}
await sheet('comparison.jpg',['full'],600,600);await sheet('details.jpg',['upper'],470,340);await sheet('leaves.jpg',['leaves'],465,390);await sheet('phone.jpg',['full'],354,354);
// Diagnostic only: display the conservative silver mask, explicit tick envelopes,
// and actual glyph positions. This is never included in render().
const {layout}=await import('./layout.mjs');
const mask='data:image/png;base64,'+fs.readFileSync(new URL('evidence/silver-mask.png',import.meta.url)).toString('base64');
const overlays=[];
for(let i=0;i<5;i++){
 const v=names[i];let s=render(sample,{variant:v});
 const ticks=s.match(/<g data-main-ticks="60">[\s\S]*?<\/g>/)[0].replaceAll('#E4ECF0','#EB7070');
 const numbers=[...s.matchAll(/<g data-main-number="\d+"[\s\S]*?<\/g>/g)].map(m=>m[0]).join('').replaceAll('#EDF1F2','#00FFFF');
 const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024"><rect width="1024" height="1024" fill="#152833"/><image href="${mask}" width="1024" height="1024" opacity=".65"/>${ticks}${numbers}<circle cx="512" cy="495" r="471" fill="none" stroke="#EB7070"/><text x="512" y="1000" fill="white" text-anchor="middle" font-size="25">${labels[i]} / DIAGNOSTIC ONLY</text></svg>`;
 overlays.push({input:await sharp(Buffer.from(svg)).resize(500,500).png().toBuffer(),left:i*500,top:0});
}
await sharp({create:{width:2500,height:500,channels:3,background:'#152833'}}).composite(overlays).jpeg({quality:94}).toFile(new URL('evidence/clearance-overlay.jpg',import.meta.url).pathname);
const glyphs=[];
for(let i=0;i<5;i++)for(let j=0;j<6;j++){
 const v=names[i],n=[1,2,3,6,8,10][j],o=layout[v][n],a=n*Math.PI/6,x=512+o.radius*Math.sin(a),y=500-o.radius*Math.cos(a);
 let svg=render(sample,{variant:v}).replace(/viewBox="[^"]+"/,`viewBox="${x-42} ${y-42} 84 84"`).replaceAll('../assets/dial-art-v4.png',art);
 glyphs.push({input:await sharp(Buffer.from(svg)).resize(126,126).png().toBuffer(),left:j*126,top:i*166+40});
 if(j===0)glyphs.push({input:Buffer.from(`<svg width="756" height="40"><text x="10" y="28" font-family="sans-serif" font-size="20" fill="#233e4e">${labels[i]}</text></svg>`),left:0,top:i*166});
}
await sharp({create:{width:756,height:830,channels:3,background:'#f5f6f5'}}).composite(glyphs).jpeg({quality:94}).toFile(new URL('evidence/glyphs.jpg',import.meta.url).pathname);
