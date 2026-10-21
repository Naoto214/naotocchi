import {spriteData} from './sprite-data.mjs';
export const speciesNames={dog:'いぬ',fish:'カクレクマノミ',penguin:'ペンギン',frog:'かえる'};
export function spriteSpec(species,level=1){
 const spec=spriteData[species.startsWith('owl')?species:`${species}/${String(level).padStart(2,'0')}`];
 if(!spec)throw new RangeError(`Unknown official sprite: ${species}/${level}`);
 return spec;
}
export function fitSprite([sx,sy,sw,sh],box){
 const scale=Math.min(box.w/sw,box.h/sh),w=sw*scale,h=sh*scale;
 return {x:box.x+(box.w-w)/2,y:box.y+(box.h-h)/2,w,h};
}
const images=new Map();
export async function loadSprites(){
 const failed=[];
 await Promise.all(Object.entries(spriteData).filter(([key])=>!key.startsWith('owl')).map(([key,spec])=>new Promise(resolve=>{
  const img=new Image();img.onload=()=>{images.set(key,img);resolve()};
  img.onerror=()=>{failed.push(spec.path);resolve()};
  img.src=new URL('../../'+spec.path,import.meta.url).href;
 })));
 return failed;
}
export function drawSprite(c,species,level,box){
 const spec=spriteSpec(species,level),key=species.startsWith('owl')?species:`${species}/${String(level).padStart(2,'0')}`;
 const img=images.get(key);if(!img)return false;
 const r=fitSprite(spec.crop,box);c.save();c.imageSmoothingEnabled=false;
 c.drawImage(img,...spec.crop,r.x,r.y,r.w,r.h);c.restore();return true;
}
