// Static material comparison using the production cast solver, not a browser screenshot.
const fs = require('node:fs');
const path = require('node:path');
const sharp = require('sharp');
const {layoutHomeCast} = require('../cast-layout.js');
const root = path.resolve(__dirname, '..');
const out = path.join(root, 'docs/art/item-art-comparison');
const allIds = Object.keys(require('../assets/items/unified/manifest.json').items);
const ids = allIds.slice(0,14);
const pet = 'assets/characters/cat/06.png';
const partner = 'assets/characters/partners/robot_neighbor.png';
const friends = ['owl','tanuki','squirrel','rabbit_friend','snail','panda'].map(id=>`assets/characters/companions/${id}.png`);
const label = text => Buffer.from(`<svg width="360" height="32"><text x="12" y="21" font-family="sans-serif" font-size="14" fill="#53463e">${text}</text></svg>`);
async function panel(id, crowded) {
  const width=360, height=300;
  const layout=layoutHomeCast({width,height,conversationHeight:44,mainAsset:pet,partnerAsset:partner,hasPartner:crowded,hasAccessory:true,hasRing:false,companions:crowded?friends:[],motionRadius:4});
  const layers=[];
  async function add(asset, frame, scale=1) {
    if(!frame)return;
    const size=Math.floor(frame.w*scale);
    const scaled=scale!==1;
    const left=scaled?Math.round(frame.x+(frame.w-size)/2):Math.round(frame.x);
    const top=scaled?Math.round(frame.y+(frame.h-size)/2+(frame.artOffsetY||0)):Math.round(frame.y+(frame.artOffsetY||0));
    layers.push({input:await sharp(path.join(root,asset)).resize(size,size).png().toBuffer(),left,top});
  }
  await add(pet,layout.main);
  if(crowded){await add(partner,layout.partner);for(let i=0;i<friends.length;i++)await add(friends[i],layout.companions[i]);}
  await add(`assets/items/unified/${id}.png`,layout.accessory,.8);
  const bg=await sharp(path.join(root,'assets/world/forest-v1.webp')).resize(width,height,{fit:'cover'}).png().toBuffer();
  const scene=await sharp(bg).composite(layers).png().toBuffer();
  return sharp({create:{width,height:332,channels:4,background:'#fff9ed'}}).composite([{input:label(`${id} / ${crowded?'pet + partner + friends':'pet + equipment'}`),top:0,left:0},{input:scene,left:0,top:32}]).png().toBuffer();
}
(async()=>{
  fs.mkdirSync(out,{recursive:true});
  for(const size of [128,40]){
    const cellW=size===128?180:120,cellH=size===128?164:76;
    const layers=[];
    for(let i=0;i<allIds.length;i++){
      const left=(i%5)*cellW,top=Math.floor(i/5)*cellH;
      layers.push({input:await sharp(path.join(root,`assets/items/unified/${allIds[i]}.png`)).resize(size,size).png().toBuffer(),left:left+Math.floor((cellW-size)/2),top});
      layers.push({input:Buffer.from(`<svg width="${cellW}" height="24"><text x="8" y="16" font-family="sans-serif" font-size="11" fill="#53463e">${allIds[i]}</text></svg>`),left,top:top+size+3});
    }
    await sharp({create:{width:cellW*5,height:cellH*6,channels:4,background:'#fff9ed'}}).composite(layers).png().toFile(path.join(out,`all-items-${size}.png`));
  }
  for(const crowded of [false,true]){
    const layers=[];
    for(let i=0;i<ids.length;i++)layers.push({input:await panel(ids[i],crowded),left:(i%2)*360,top:Math.floor(i/2)*332});
    await sharp({create:{width:720,height:2324,channels:4,background:'#fff9ed'}}).composite(layers).png().toFile(path.join(out,crowded?'full-cast.png':'pet-equipment.png'));
  }
  console.log('Saved static comparisons. These are not actual browser captures.');
})();
