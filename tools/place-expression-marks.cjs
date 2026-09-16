#!/usr/bin/env node
// Offline placement: exact PNG alpha + outlined SVG alpha, 2px clearance.
// Requires sharp; no image-generation or runtime image analysis.
const fs=require('node:fs'),path=require('node:path'),sharp=require('sharp');
const ROOT=path.resolve(__dirname,'..'),expression=require('../pet-expression.js');
const anchors=require('./expression-face-anchors.json'),bounds=require('../cast-bounds.js');
const review=require('./expression-placement-review.json').selected;
const sourceCode=fs.readFileSync(path.join(ROOT,'pet-expression.js'),'utf8');
const previous=JSON.parse(sourceCode.match(/const MARK_PLACEMENT = (\{[\s\S]*?\n  \});/)[1]);
const names=['happy','strained','hungry','sick','tired','sulky','weak','critical','wantsPlay','sleeping'];
const css=fs.readFileSync(path.join(ROOT,'pet-expression.css'),'utf8');
const W=440,P=100,S=2;const table={};
async function mask(asset){return (await sharp(path.join(ROOT,asset)).resize(208,208,{kernel:'nearest'}).ensureAlpha().raw().toBuffer({resolveWithObject:true})).data;}
(async()=>{
 for(const [line,heads] of Object.entries(anchors))for(let i=0;i<8;i++){
  const stage=String(i+1).padStart(2,'0'),base=`assets/characters/${line}/${stage}.png`,key=`${line}/${stage}`;
  const head=heads[i],floor=104*(128-bounds[base].box[3])/128,fy=Math.round(floor*S);
  const occupied=new Uint8Array(W*W),dilated=new Uint8Array(W*W);
  for(const asset of [base,...names.map(n=>expression.assetFor(base,n))]){
   const data=await mask(asset);
   for(let y=0;y<208;y++)for(let x=0;x<208;x++)if(data[(y*208+x)*4+3]>16)occupied[(y+fy+P)*W+x+P]=1;
  }
  for(let y=4;y<W-4;y++)for(let x=4;x<W-4;x++)if(occupied[y*W+x])for(let dy=-4;dy<=4;dy++)for(let dx=-4;dx<=4;dx++)if(dx*dx+dy*dy<=16)dilated[(y+dy)*W+x+dx]=1;
  const face=[head[0]*104/128,head[1]*104/128+floor],marks={};
  let sweat=null,headTop=104;
  for(let y=0;y<W;y++)for(let x=Math.floor(head[2]*104/128*S)+P;x<=Math.ceil(head[3]*104/128*S)+P;x++)if(occupied[y*W+x])headTop=Math.min(headTop,(y-P)/S);
  // Conservative swept rectangle covers rotation and the complete downward motion.
  const dw=10.4,dh=15.6,travel=7,angle=Math.PI/10;
  const rw=dw*Math.cos(angle)+dh*Math.sin(angle);
  const halfHeight=(dh*Math.cos(angle)+dw*Math.sin(angle))/2+travel/2;
  function clearRect(x0,x1,y0,y1){
   for(let y=Math.max(0,Math.floor(y0*S)+P);y<=Math.min(W-1,Math.ceil(y1*S)+P);y++)
    for(let x=Math.max(0,Math.floor(x0*S)+P);x<=Math.min(W-1,Math.ceil(x1*S)+P);x++)if(occupied[y*W+x])return false;
   return true;
  }
  for(let up=0;up<=45;up+=.5){
   const center=face[1]-up,y0=center-halfHeight-2,y1=center+halfHeight+2;
   if(center<headTop-4)continue;
   const contacts=[];
   for(const side of [-1,1])for(let radius=2;radius<110;radius+=.5){
    const inner=face[0]+side*radius;
    const x0=side<0?inner-2-rw:inner+2,x1=side<0?inner-2:inner+2+rw;
    if(clearRect(x0,x1,y0,y1)){contacts.push(inner);break;}
   }
   if(contacts.length!==2)throw Error('No sweat placement '+key);
   const score=contacts[1]-contacts[0]+up*1.2;
   if(!sweat||score<sweat.score)sweat={leftInner:contacts[0],rightInner:contacts[1],centerY:center-floor,score};
  }
  delete sweat.score;
  // Keep approved drop placement while correcting the selected green mark.
  sweat=previous[key].sweat;
  const withSweat=dilated.slice();
  for(const [x0,x1] of [[sweat.leftInner-2-rw,sweat.leftInner-2],[sweat.rightInner+2,sweat.rightInner+2+rw]]) {
   const y0=sweat.centerY+floor-halfHeight,y1=sweat.centerY+floor+halfHeight;
   for(let y=Math.max(0,Math.floor((y0-2)*S)+P);y<=Math.min(W-1,Math.ceil((y1+2)*S)+P);y++)
    for(let x=Math.max(0,Math.floor((x0-2)*S)+P);x<=Math.min(W-1,Math.ceil((x1+2)*S)+P);x++)withSweat[y*W+x]=1;
  }
  for(const name of names){
   const art=expression.accentFor(base,name).match(/<svg[^>]*>([\s\S]*)<\/svg>/)[1].replace(/<\/?g\b[^>]*>/g,'');
   const {data}=await sharp(Buffer.from(`<svg width="208" height="208" viewBox="0 0 104 104"><style>${css}</style><g class="pet-expression-accent">${art}</g></svg>`)).ensureAlpha().raw().toBuffer({resolveWithObject:true});
   const pts=[];let x1=208,y1=208,x2=0,y2=0;
   for(let y=0;y<208;y++)for(let x=0;x<208;x++)if(data[(y*208+x)*4+3]>16){pts.push([x,y]);x1=Math.min(x1,x);x2=Math.max(x2,x);y1=Math.min(y1,y);y2=Math.max(y2,y);}
   const cx=(x1+x2)/2,cy=(y1+y2)/2,target=name==='strained'?135:name==='wantsPlay'?90:45;
   const isReviewed=review[key]?.includes(name);
   if(!isReviewed){marks[name]=previous[key].marks[name];continue;}
   const angles=target===90?[90]:key==='woman/01'&&name==='critical'?[55,60]:name==='sick'?[60,65,70,75]:Array.from({length:5},(_,j)=>(target===45?40:120)+j*5);
   let best=null;
   for(const angle of angles){const a=angle*Math.PI/180;for(let r=1;r<110;r+=.5){
    const dx=Math.round((face[0]+r*Math.cos(a))*S-cx),dy=Math.round((face[1]-r*Math.sin(a))*S-cy);
    if(x1+dx+P<1||x2+dx+P>=W-1||y1+dy+P<1||y2+dy+P>=W-1)continue;
    const blocked=name==='sick'?withSweat:dilated;
    if(pts.some(([x,y])=>blocked[(y+dy+P)*W+x+dx+P]))continue;
    if(target!==90 && Math.abs(dx/S+cx/S-face[0])<Math.max(8,(head[3]-head[2])*104/128*.3))continue;
    if(name==='sick' && dx/S+cx/S>head[3]*104/128+8)continue;
    const score=r+.02*(angle-(name==='sick'?65:target))**2;
    if(!best||score<best.score)best={dx,dy,score};break;
   }}
   if(!best)throw Error(`No placement ${key} ${name}`);
   marks[name]=[best.dx/S,best.dy/S];
  }
  // Face-side drops use the head's horizontal silhouette, not the body's tail/bag.
  table[key]={face:head.slice(0,2),sweat,marks};
 }
 const output='{\n'+Object.entries(table).map(([k,v])=>'    '+JSON.stringify(k)+': '+JSON.stringify(v)).join(',\n')+'\n  }';
 const target=path.join(ROOT,'pet-expression.js');let code=fs.readFileSync(target,'utf8');
 const block=`  // BEGIN GENERATED FACE PLACEMENT\n  const MARK_PLACEMENT = ${output};\n  // END GENERATED FACE PLACEMENT`;
 if(code.includes('// BEGIN GENERATED FACE PLACEMENT'))code=code.replace(/  \/\/ BEGIN GENERATED FACE PLACEMENT[\s\S]*?  \/\/ END GENERATED FACE PLACEMENT/,block);
 else code=code.replace('  const HUMAN_LINES',block+'\n  const HUMAN_LINES');
 fs.writeFileSync(target,code);console.log('Repositioned 81 selected marks with 2px clearance; retained other placements');
})();
