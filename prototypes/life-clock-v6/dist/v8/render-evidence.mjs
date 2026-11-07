import fs from 'node:fs';import {createRequire} from 'node:module';import {render,sample} from './clock-v8.mjs';
const sharp=createRequire(import.meta.url)(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/sharp');
const art='data:image/png;base64,'+fs.readFileSync(new URL('../assets/dial-art-v4.png',import.meta.url)).toString('base64');
const names=['reference','A','B','C'],labels=['V7 STANDARD','V8 A / SUBTLE','V8 B / STANDARD','V8 C / DEPTH'];
async function raster(v,crop,w,h){return sharp(Buffer.from(render(sample,{variant:v,crop}).replaceAll('../assets/dial-art-v4.png',art))).resize(w,h).png().toBuffer();}
async function sheet(file,crops,width,height){const items=[];for(let i=0;i<4;i++){items.push({input:Buffer.from(`<svg width="${width}" height="40"><text x="${width/2}" y="28" text-anchor="middle" font-family="sans-serif" font-size="18" fill="#233e4e">${labels[i]}</text></svg>`),left:i*width,top:0});for(let j=0;j<crops.length;j++)items.push({input:await raster(names[i],crops[j],width,height),left:i*width,top:40+j*height});}await sharp({create:{width:width*4,height:40+height*crops.length,channels:3,background:'#f5f6f5'}}).composite(items).jpeg({quality:94}).toFile(new URL('evidence/'+file,import.meta.url).pathname);}
await sheet('comparison.jpg',['full'],600,600);await sheet('details.jpg',['first','second','end'],330,330);await sheet('hands.jpg',['hands'],500,528);
