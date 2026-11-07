import fs from 'node:fs';import {createRequire} from 'node:module';import {render,sample,studies} from './clock-v12.mjs';
const sharp=createRequire(import.meta.url)(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/sharp');
const art='data:image/png;base64,'+fs.readFileSync(new URL('../assets/dial-art-v4.png',import.meta.url)).toString('base64');
async function raster(o,crop,w,h){return sharp(Buffer.from(render(sample,{...o,crop}).replaceAll('../assets/dial-art-v4.png',art))).resize(w,h).png().toBuffer();}
for(const [key,options] of Object.entries(studies)){
 const crop={growth:'growth',roman:'end'}[key]||'full',w=key==='growth'?660:520,h=key==='growth'?244:520;
 const items=[];for(let i=0;i<options.length;i++){items.push({input:await raster(options[i],crop,w,h),left:i*w,top:40});items.push({input:Buffer.from(`<svg width="${w}" height="40"><text x="15" y="27" font-family="sans-serif" font-size="18">${options[i].id} / main ${options[i].main||52} / growth ${options[i].growth||1} / roman ${options[i].roman||1} / font ${options[i].font||'A'}</text></svg>`),left:i*w,top:0});
 await sharp(await raster(options[i],'full',1072,1072)).png().toFile(new URL(`evidence/${options[i].id}.png`,import.meta.url).pathname);
 }
 await sharp({create:{width:w*options.length,height:h+40,channels:3,background:'#f5f6f5'}}).composite(items).jpeg({quality:94}).toFile(new URL('evidence/'+key+'.jpg',import.meta.url).pathname);
}
for(const crop of ['upper','ten']){const items=[];for(let i=0;i<4;i++)items.push({input:await raster(studies.main[i],crop,500,crop==='ten'?452:320),left:500*i,top:0});await sharp({create:{width:2000,height:crop==='ten'?452:320,channels:3,background:'#f5f6f5'}}).composite(items).jpeg({quality:95}).toFile(new URL(`evidence/${crop}.jpg`,import.meta.url).pathname);}
await sharp(await raster({reference:true},'full',1072,1072)).png().toFile(new URL('evidence/V11E.png',import.meta.url).pathname);
const {standSvg}=await import('./stands.mjs');const stands=[];
for(let i=0;i<3;i++){const svg=standSvg(i).replaceAll('../assets/dial-art-v4.png',art);const b=await sharp(Buffer.from(svg)).resize(1350,615).png().toBuffer();stands.push({input:b,left:0,top:i*615});await sharp(b).png().toFile(new URL(`evidence/stand-${'ABC'[i]}.png`,import.meta.url).pathname);}
await sharp({create:{width:1350,height:1845,channels:3,background:'#f5f6f5'}}).composite(stands).jpeg({quality:95}).toFile(new URL('evidence/stands.jpg',import.meta.url).pathname);
