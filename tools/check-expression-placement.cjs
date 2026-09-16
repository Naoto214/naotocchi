#!/usr/bin/env node
// Independent check of emitted production SVG against every expression PNG.
const fs=require('fs'),path=require('path'),sharp=require('sharp');
const root=path.resolve(__dirname,'..'),exp=require('../pet-expression.js'),bounds=require('../cast-bounds.js');
const css=fs.readFileSync(path.join(root,'pet-expression.css'),'utf8');
const names=['happy','strained','hungry','sick','tired','sulky','weak','critical','wantsPlay','sleeping'];
const S=2,P=80,W=368;let checked=0,sweats=0;const issues=[];
(async()=>{
 for(const line of ['cat','dog','man','woman','penguin','turtle','frog','clownfish','salmon','hermit_crab'])for(let i=1;i<=8;i++){
  const base=`assets/characters/${line}/${String(i).padStart(2,'0')}.png`,floor=104*(128-bounds[base].box[3])/128;
  for(const name of names){
   const png=await sharp(path.join(root,exp.assetFor(base,name))).resize(208,208,{kernel:'nearest'}).ensureAlpha().raw().toBuffer();
   const raw=exp.accentFor(base,name).match(/<svg[^>]*>([\s\S]*)<\/svg>/)[1];
   const mark=await sharp(Buffer.from(`<svg width="368" height="368" viewBox="-40 -40 184 184"><style>${css}</style><g class="pet-expression-accent">${raw}</g></svg>`)).ensureAlpha().raw().toBuffer();
   let overlaps=0;
   for(let y=0;y<208;y++)for(let x=0;x<208;x++)if(png[(y*208+x)*4+3]>16){
    const my=y+Math.round(floor*S)+P,mx=x+P;
    if(mark[(my*W+mx)*4+3]>16)overlaps++;
   }
   if(overlaps)issues.push({base,name,overlaps});checked++;
   if(name!=='sick')continue;
   for(const size of [64,80,104]){
    const data=await sharp(path.join(root,exp.assetFor(base,name))).resize(size*2,size*2,{kernel:'nearest'}).ensureAlpha().raw().toBuffer();
    const shift=size*(128-bounds[base].box[3])/128,d=exp.sweatFor(base,size,size,shift),dw=Math.max(6,Math.min(11,size*.1)),dh=Math.max(9,Math.min(16,size*.15));
    const rw=dw*Math.cos(Math.PI/10)+dh*Math.sin(Math.PI/10),rh=dh*Math.cos(Math.PI/10)+dw*Math.sin(Math.PI/10);
    for(const left of [d.left,size-d.right-dw]){
     const x0=left+(dw-rw)/2,x1=left+(dw+rw)/2,y0=d.top+(dh-rh)/2,y1=d.top+(dh+rh)/2+d.travel;
     if(size===104){
      let markHits=0;
      for(let y=Math.max(0,Math.floor(y0*2)+P);y<=Math.min(W-1,Math.ceil(y1*2)+P);y++)
       for(let x=Math.max(0,Math.floor(x0*2)+P);x<=Math.min(W-1,Math.ceil(x1*2)+P);x++)if(mark[(y*W+x)*4+3]>16)markHits++;
      if(markHits)issues.push({base,sweatMarkOverlaps:markHits});
     }
     let hit=0;
     for(let y=0;y<size*2;y++)for(let x=0;x<size*2;x++)if(data[(y*size*2+x)*4+3]>16){const px=(x+.5)/2,py=(y+.5)/2+shift;if(px>=x0&&px<=x1&&py>=y0&&py<=y1)hit++;}
     if(hit)issues.push({base,size,sweatOverlaps:hit});sweats++;
    }
   }
  }
 }
 console.log(JSON.stringify({marks:checked,sweatEnvelopes:sweats,issues},null,2));if(issues.length)process.exitCode=1;
})();
