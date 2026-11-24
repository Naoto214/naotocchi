// Additional original-art layers, expressed in 1000 × 1500 painting coordinates.
import {drawFullMotion,forestWind} from './full-motion.mjs';
import {waterMask} from './nature.mjs';

const W=1000,H=1500,TAU=Math.PI*2,cache=new WeakMap();
const clamp=n=>Math.max(0,Math.min(1,n));
const frac=n=>n-Math.floor(n);
const hash=i=>frac(Math.sin(92.13*i+5.96)*42738.717);
const breath=t=>.5-.5*Math.cos(t);
// [left,top,width,height] take a soft-edged cut from the original, including
// the fractured snow cap/leaf silhouette. Small angles keep trunks registered.
const branches={
 snow:[[7,126,119,103],[6,355,131,125],[124,402,99,105],[840,533,114,81]],
 city:[[9,5,166,147],[344,373,90,112],[847,770,108,62]],
 memory_lake:[[95,40,88,270],[199,101,82,243],[313,36,75,207]]
};
const lampWindows=[[.922,.345],[.922,.394],[.738,.431]];
const snowyBanks=[[.056,.519],[.149,.557],[.809,.485]];
// Window source -> paving reflection, avoiding planters/benches and tactile strips.
const shopLamps=[
 {source:[146,526,48,49],ground:[151,800,46,177]},
 {source:[318,722,43,37],ground:[330,795,61,269]},
 {source:[552,746,39,28],ground:[547,823,40,176]},
 {source:[829,648,59,47],ground:[803,939,46,200]}
];
const lakeBounds=[87,459,807,267];
function sourceTile(image,bounds,soft=true){
 if(!image?.naturalWidth||!image.naturalHeight)return null;
 let tiles=cache.get(image);
 if(!tiles){tiles=new Map();cache.set(image,tiles);}
 if(tiles.has(bounds))return tiles.get(bounds);
 const [x,y,w,h]=bounds;
 const c=typeof OffscreenCanvas==='function'?new OffscreenCanvas(w,h):document.createElement('canvas');
 c.width=w;c.height=h;
 const p=c.getContext('2d'),sx=image.naturalWidth/W,sy=image.naturalHeight/H;
 p.drawImage(image,x*sx,y*sy,w*sx,h*sy,0,0,w,h);
 if(soft){
  p.globalCompositeOperation='destination-in';
  for(const vertical of [true,false]){
   const g=p.createLinearGradient(0,0,vertical?0:w,vertical?h:0);
   g.addColorStop(0,'transparent');g.addColorStop(.18,'#fff');g.addColorStop(.82,'#fff');g.addColorStop(1,'transparent');
   p.fillStyle=g;p.fillRect(0,0,w,h);
  }
 }
 // The E3 lake's four soft-edge extracts are immutable after this point.
 // Seal only those private offscreens so the 22 water bands can reuse their pixels.
 const lakeTile=bounds===lakeBounds || branches.memory_lake.includes(bounds);
 const result=lakeTile && typeof c.transferToImageBitmap==='function'
  ? c.transferToImageBitmap() : c;
 tiles.set(bounds,result);
 return result;
}
function softLight(ctx,x,y,rx,ry,color,alpha){
 if(alpha<.005)return;
 ctx.save();ctx.translate(x,y);ctx.scale(rx,ry);
 const g=ctx.createRadialGradient(0,0,0,0,0,1);
 g.addColorStop(0,'rgba('+color+',1)');g.addColorStop(.35,'rgba('+color+',.53)');g.addColorStop(1,'rgba('+color+',0)');
 ctx.fillStyle=g;ctx.globalAlpha=clamp(alpha);ctx.fillRect(-1,-1,2,2);ctx.restore();
}
function sway(ctx,s){
 if(!s.fx.motion||s.fx.canopy===false||s.reduced)return;
 const willow=s.region==='memory_lake', snow=s.region==='snow';
 const amplitude=(willow?1.7:snow?.91:1.34)*s.gain;
 branches[s.region].forEach((rect,i)=>{
  const tile=sourceTile(s.image,rect);
  if(!tile)return;
  const [x,y,w,h]=rect;
  const bend=amplitude*(.37*Math.sin(s.t*.74+i*.32)+.18*Math.sin(s.t*1.26+i)+.92*s.gust);
  ctx.save();
  const anchorX=snow?.12:.5,anchorY=willow?.05:snow?.1:.77;
  ctx.translate(x+w*anchorX,y+h*anchorY);ctx.rotate(bend*(willow?.038:.027));
  ctx.globalAlpha=s.alpha;ctx.drawImage(tile,-w*anchorX,-h*anchorY,w,h);ctx.restore();
 });
}
function lakeClip(ctx){
 ctx.beginPath();waterMask('memory_lake').forEach(([x,y],i)=>ctx[i?'lineTo':'moveTo'](x*W,y*H));ctx.closePath();ctx.clip();
}
function lakeCurrent(ctx,s){
 if(!s.fx.water||!s.fx.motion||s.fx.waves===false||s.reduced)return;
 const tile=sourceTile(s.image,lakeBounds);
 if(!tile)return;
 const [x,y,w,h]=lakeBounds;
 ctx.save();lakeClip(ctx);ctx.globalAlpha=s.alpha;
 // Shift contiguous bands of the upside-down trees and mountain reflections.
 // The horizon, reeds and shore retain the original image.
 const rows=22;
 let last=0;
 for(let i=0;i<rows;i++){
  const t=(i+1)/rows,z=t*h;
  const amplitude=(1.6+2.5*t)*(s.season==='winter'?.75:1)*s.gain;
  const phase=s.t*.86-t*10+.22*Math.sin(s.t*.34+t*2);
  const yy=i===rows-1?h:z+amplitude*Math.sin(phase);
  const dx=amplitude*(Math.sin(phase-.57)+.22*Math.sin(s.t*.52+t*18));
  ctx.drawImage(tile,0,i*h/rows,w,h/rows,x+dx,y+last,w,yy-last+.45);
  last=yy;
 }
 ctx.restore();
}
function waterEcho(ctx,s){
 if(!s.fx.water||s.fx.waves===false)return;
 const blue=s.time==='night'?'185,215,255':s.time==='evening'?'255,194,152':'214,240,255';
 ctx.save();lakeClip(ctx);
 const n=s.fx.magic?3:1;
 for(let i=0;i<n;i++){
  const t=frac(s.t/(11+i*3)+i*.373);
  if(t>.79)continue;
  const life=t/.79,x=[582,340,688][i],y=[604,543,649][i];
  if(s.fx.light&&s.fx.magic&&s.fx.particles){
   const approach=1-clamp(life*4);
   softLight(ctx,x+approach*4,y-approach*19,5,5,blue,s.alpha*s.gain*approach*.74);
  }
  if(life<.14)continue;
  const wave=(life-.14)/.86;
  for(let k=0;k<2;k++){
   const age=wave-k*.19;
   if(age<=0)continue;
   const radius=3+age*(i===0?53:33);
   ctx.strokeStyle='rgb('+blue+')';ctx.globalAlpha=clamp(s.alpha*s.gain*(1-age)*.65*Math.min(1,age*9));ctx.lineWidth=1.65;
   ctx.beginPath();ctx.ellipse(x,y,radius,1.15+radius*.15,-.035,.05,Math.PI*.88);ctx.stroke();
   ctx.beginPath();ctx.ellipse(x,y,radius,1.15+radius*.15,-.035,Math.PI*1.09,Math.PI*1.92);ctx.stroke();
  }
 }
 // Painted moon/sunset and their reflections share a column, not the shore.
 if(s.fx.light&&s.fx.reflections!==false){
  const axis=s.time==='night'?610:s.time==='evening'?578:s.time==='morning'?596:556;
  for(let i=0;i<8;i++){
   const y=481+21*i,light=breath(s.t*.79+i*.91);
   const x=axis+(6+i*2.4)*Math.sin(s.t*.25+i*1.81);
   softLight(ctx,x,y,10+i*1.9,2.2+i*.16,blue,s.alpha*s.gain*(s.time==='night'?.46:.28)*light);
  }
 }
 ctx.restore();
}
function windowSpill(ctx,s){
 if(!s.fx.light||s.fx.glow===false)return;
 const dark=s.time==='night'||s.time==='evening';
 if(dark){
  lampWindows.forEach(([u,v],i)=>{
   const phase=.63+.37*breath(s.t*.53+i*1.14);
   // Small vertical pane, then just the adjacent snow ledge beneath.
   softLight(ctx,u*W,v*H,7,10,'255,215,142',phase*.64*s.alpha*s.gain);
   softLight(ctx,u*W-4,v*H+14,18,6,'255,183,110',phase*.52*s.alpha*s.gain);
  });
 }
 const cold=s.season==='winter'?1:.68;
 if(s.weather==='rain')return;
 snowyBanks.forEach(([u,v],i)=>{
  const glow=breath(s.t*.41+u*8)**2;
  softLight(ctx,u*W,v*H,55,10,dark?'159,195,255':'222,242,255',(.10+.27*glow)*cold*s.alpha*s.gain);
 });
}
function powder(ctx,s){
 if(!s.fx.particles||s.reduced||s.weather==='rain'||s.fx.gusts===false)return;
 const active=frac((s.t+5)/23);
 if(active>.32)return;
 const age=active/.32,energy=Math.sin(Math.PI*age);
 for(let i=0;i<15;i++){
  const lane=i%3,start=[[42,447],[138,477],[879,591]][lane];
  const x=start[0]+(18+31*hash(i))*age+Math.sin(i+age*3)*4.3;
  const y=start[1]+(13+41*hash(i+14))*age*age;
  const a=s.alpha*s.gain*energy*(.26+.42*hash(i+3))*(s.season==='winter'?1:.62);
  ctx.fillStyle='#f5faff';ctx.globalAlpha=clamp(a);ctx.beginPath();ctx.arc(x,y,1.05+1.55*hash(i+7),0,TAU);ctx.fill();
 }
}
function cityReflection(ctx,s){
 if(!s.fx.water||s.fx.reflections===false)return;
 const dark=['night','evening'].includes(s.time),wet=s.weather==='rain';
 if(!dark&&!wet)return;
 shopLamps.forEach(({source,ground},i)=>{
  const [x,y,w,h]=ground;
  // Only deform the reflected light on wet stones. Urban geometry and dry tiles are fixed.
  const texture=wet&&s.fx.motion&&!s.reduced?sourceTile(s.image,ground):null;
  if(texture){
   ctx.globalAlpha=s.alpha;
   for(let j=0;j<7;j++){
    const band=texture.height/7,t=s.t*1.05-j*1.11+i*.7;
    ctx.drawImage(texture,0,j*band,texture.width,band,x+Math.sin(t)*2.8*s.gain,y+j*h/7,w,h/7+.55);
   }
  }
  if(!s.fx.light||!dark)return;
  const lamp=sourceTile(s.image,source);
  if(!lamp)return;
  const pulse=.64+.36*breath(s.t*.57+i*1.1);
  // Sample the lamp's actual colour and mullions, and turn it upside down.
  // A handful of slender broken strips are perceived as a reflection in the paving.
  const amount=(wet?.48:.22)*s.alpha*s.gain;
  ctx.save();ctx.globalCompositeOperation='screen';
  for(let j=0;j<6;j++){
   const phase=(j+.5)/6;
   const strip=source[3]/6;
   const shift=wet?2.6*Math.sin(s.t*.92+i+j):.8*Math.sin(s.t*.47+j);
   ctx.globalAlpha=clamp(amount*pulse*(1-phase*.68));
   ctx.drawImage(lamp,0,source[3]-(j+1)*strip,lamp.width,strip,x+w*(.33+.18*phase)+shift,y+h*phase,w*(.32-.13*phase),h*(wet?.087:.047));
  }
  ctx.restore();
 });
}
export function drawSnowCityLake(ctx,state){
 if(state.variant!=='E3'||!Object.hasOwn(branches,state.region)||!(state.width>0&&state.height>0))return;
 const strength=Math.max(0,Math.min(2,state.strength??1)),opacity=clamp(state.opacity??1);
 if(!strength||!opacity)return;
 const fx={motion:true,particles:true,water:true,light:true,magic:true,...state.effects};
 const t=state.reduced?0:(state.seconds??0);
 const s={...state,t,fx,alpha:opacity*Math.min(strength,1),gain:strength<=1?strength:1+(strength-1)*.5,
  gust:state.reduced||fx.gusts===false?0:forestWind(t).gust};
 function originalLayers(){
  ctx.save();ctx.scale(state.width/W,state.height/H);
  sway(ctx,s);
  if(state.region==='memory_lake')lakeCurrent(ctx,s);
  if(state.region==='city')cityReflection(ctx,s);
  ctx.restore();
 }
 originalLayers();
 // Use D3 for its tested precipitation exclusions, floating points, lamps and surface details.
 // City and lake paint their sampled surfaces above. Turn off just D3 texture deformation there.
 drawFullMotion(ctx,{...state,variant:'D3',effects:{...fx,motion:state.region==='snow'&&fx.motion}});
 ctx.save();ctx.scale(state.width/W,state.height/H);
 if(state.region==='snow'){windowSpill(ctx,s);powder(ctx,s);}
 if(state.region==='memory_lake')waterEcho(ctx,s);
 ctx.restore();
}
