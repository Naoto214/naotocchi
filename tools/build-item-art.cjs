#!/usr/bin/env node
'use strict';
const fs=require('node:fs');
const path=require('node:path');
const sharp=require('sharp');
const root=path.join(__dirname,'..');
const out=path.join(root,'assets/items/unified');
const sources=path.join(out,'sources');
const ids=['poop1','sleepboost1','bowtie','ribbon','scarf','travel1','partner1','bond1','gamepass1','star','naoto_charm','naoto_lantern','naoto_ring','naoto_crown','c_coin2','c_life','c_life_charm','c_time_back','c_time_forward','c_transform','c_dex','c_friend','c_rare_friend','c_match','c_egg_normal','c_egg_rare','sticker_pack'];
fs.mkdirSync(out,{recursive:true});

const world=JSON.parse(fs.readFileSync(path.join(root,'assets/ui/world-items-atlas-v1.json')));
const care=JSON.parse(fs.readFileSync(path.join(root,'assets/ui/care-atlas-v2.json')));
const worldMap={poop1:'paper',travel1:'backpack',partner1:'letter',bond1:'paw_badge',star:'star_badge',naoto_charm:'charm',naoto_lantern:'lantern',naoto_ring:'ring',naoto_crown:'naoto_crown',c_dex:'book',c_friend:'paw_badge'};
const careMap={sleepboost1:'sleep',c_coin2:'coin',c_life:'medicine',sticker_pack:'gift'};
const redraw={
  bowtie:'bento-box.png',ribbon:'toy-box.png',scarf:'first-aid-box.png',gamepass1:'game-pass.png',
  c_time_back:'c_time_back.png',c_time_forward:'c_time_forward.png',c_transform:'c_transform.png',c_match:'c_match.png',
};
const colors={ink:'#62483f',gold:'#f2bd55',rose:'#e9868f'};

async function normalized(input,target=108){
  // Generated redraws can contain nearly invisible edge pixels. A small alpha
  // threshold keeps those fringes from shrinking the visible object.
  const trimmed=await sharp(input).ensureAlpha().trim({background:{r:0,g:0,b:0,alpha:0},threshold:12}).toBuffer();
  const resized=await sharp(trimmed).resize({width:target,height:target,fit:'inside',kernel:'lanczos3'}).png().toBuffer();
  const m=await sharp(resized).metadata();
  const left=Math.floor((128-m.width)/2),top=Math.floor((128-m.height)/2);
  return sharp({create:{width:128,height:128,channels:4,background:{r:0,g:0,b:0,alpha:0}}}).composite([{input:resized,left,top}]).png({compressionLevel:9}).toBuffer();
}
async function atlasFrame(image,frame){
  const box=frame.frame||[frame.x,frame.y,frame.size,frame.size];
  return sharp(image).extract({left:Math.round(box[0]),top:Math.round(box[1]),width:Math.round(box[2]),height:Math.round(box[3])}).png().toBuffer();
}
async function build(){
  const missing=[];
  for(const id of ids){
    let input;
    if(redraw[id]){
      const file=path.join(sources,redraw[id]);
      if(!fs.existsSync(file)){missing.push(file);continue;}
      input=file;
    }else if(worldMap[id]) input=await atlasFrame(path.join(root,'assets/ui',world.image),world.frames[worldMap[id]]);
    else if(careMap[id]) input=await atlasFrame(path.join(root,'assets/ui',care.image),care.frames[careMap[id]]);
    else if(id==='c_life_charm'){
      const base=await normalized(await atlasFrame(path.join(root,'assets/ui',world.image),world.frames.charm),108);
      input=await sharp(base).composite([{input:Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128"><path d="M94 20c5-8 17-2 11 7L94 40 83 27c-6-9 6-15 11-7z" fill="${colors.rose}" stroke="${colors.ink}" stroke-width="3" stroke-linejoin="round"/></svg>`)}]).png().toBuffer();
    }else if(id==='c_rare_friend'){
      const base=await normalized(await atlasFrame(path.join(root,'assets/ui',world.image),world.frames.paw_badge),104);
      input=await sharp(base).composite([{input:Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128"><path d="m96 14 4 10 10 4-10 4-4 10-4-10-10-4 10-4z" fill="${colors.gold}" stroke="${colors.ink}" stroke-width="3" stroke-linejoin="round"/><path d="m106 42 2 6 6 2-6 2-2 6-2-6-6-2 6-2z" fill="${colors.rose}" stroke="${colors.ink}" stroke-width="2"/></svg>`)}]).png().toBuffer();
    }else if(id==='c_egg_normal') input=path.join(root,'assets/characters/egg/intact.png');
    else if(id==='c_egg_rare'){
      const egg=await normalized(path.join(root,'assets/characters/egg/intact.png'),108);
      input=await sharp(egg).composite([{input:Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128"><path d="m91 19 4 10 10 4-10 4-4 10-4-10-10-4 10-4z" fill="${colors.gold}" stroke="${colors.ink}" stroke-width="3" stroke-linejoin="round"/></svg>`)}]).png().toBuffer();
    }
    fs.writeFileSync(path.join(out,`${id}.png`),await normalized(input,108));
  }
  const manifest={version:1,size:128,visibleExtent:[104,112],items:Object.fromEntries(ids.map(id=>[id,`assets/items/unified/${id}.png`]))};
  fs.writeFileSync(path.join(out,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');
  if(missing.length){console.error('Waiting for supplied redraw sources:\n'+missing.join('\n'));process.exitCode=2;}
  else console.log(`Built ${ids.length} unified item assets.`);
}
build().catch(error=>{console.error(error);process.exitCode=1});
