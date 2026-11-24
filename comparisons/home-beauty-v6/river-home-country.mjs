import {fallCount, sampleFall} from './fall-motion.mjs';
import {drawLocalPrecipitation, drawLocalLeaf, windScale} from './regional-fall.mjs';

// The masks and anchors use the whole decoded 1024×1536 painting, before cover
// cropping. One coordinate system (1000×1500) is shared across all four artworks.
const TAU=2*Math.PI;
const clamp=(x,min,max)=>Math.max(min,Math.min(max,x));
const mod=(x,n)=>((x%n)+n)%n;
const unit=i=>mod(Math.sin(i*73.169+49)*31743.31,1);
const regions=new Set(['river_lake','home','countryside']);
export const artFootprints={
  river:[[149,430],[255,425],[435,419],[508,408],[554,419],[594,428],[630,434],
    [682,428],[748,446],[825,457],[936,473],[995,481],[995,948],[931,891],
    [832,836],[716,767],[625,700],[536,647],[445,592],[352,544],[261,494],[190,483],[149,469]],
  pane:[[274,180],[565,199],[565,448],[276,463]],
  floor:[[310,634],[578,573],[827,615],[975,716],[975,1310],[313,1310],[154,868]]
};
// The foreground ripples turn gradually from the distant current into the pool.
const reach=[[.5,0.68],[.64,.43],[.79,.32],[.92,.21]];
const flowPatches=[[468,460,185,51],[657,499,179,58],[850,554,233,72],
  [598,572,145,56],[762,635,174,72],[918,716,160,84]];
const plants=[
  // Left paddy margin, rice rows on the right, crowns beside the building, and verge.
  [113,552,133,60],[212,514,118,65],[328,466,112,93],[495,435,80,68],
  [791,467,127,62],[915,555,139,102],[703,572,92,54],
  [847,336,115,106],[113,800,110,88],[81,1184,131,95],[930,1083,137,77]
];
const leafEdges=[[84,545],[201,565],[334,522],[811,526],[909,572],[121,782],[901,904]];
const cachedArt=new WeakMap(),brushes=new Map();
export function fieldWind(t,u){
  const phase=mod(t,241);
  const pulse=(arrival,span)=>{const d=(phase-arrival)/span;return Math.abs(d)<1?.5+.5*Math.cos(Math.PI*d):0;};
  const west=pulse(12+u*3.8,4.2)+.8*pulse(82+u*3,6.1)+.92*pulse(189+u*3.8,5.3);
  const east=.7*pulse(48+(1-u)*3,3.2)+.83*pulse(134+(1-u)*3.7,4.7)+.7*pulse(225+(1-u)*4,3.5);
  return .31*Math.sin(t*.77-u*4.5)+.15*Math.sin(t*1.32-u*5.5)+west-east;
}
// A field particle samples the same travelling front as the nearest painted plant.
function fieldFront(t,u,depth,enabled) {
  const bend=enabled ? fieldWind(t,u) : .28*Math.sin(t*.77-u*3);
  return {bend,gust:enabled ? Math.max(0,Math.abs(bend)-.32) : 0};
}
function paneFront(t,u,depth,enabled) {
  const outside=fieldFront(t,.274+.291*u,depth,enabled);
  return {bend:outside.bend*.55,gust:outside.gust*.55};
}
const paneSnow={x:274,y:179,width:291,height:284,seed:19,count:14,radius:2.6,front:paneFront};
const fieldWeather={x:0,y:40,width:1000,height:1260,seed:67,count:16,radius:2.5,length:16,front:fieldFront};
const fieldSources=[
  // Far orchard, middle field-tree and near verge repeat in the sampler's depth order.
  [650,376],[385,450],[175,705],[673,389],[792,526],[869,941],[322,512]
];
function clipped(ctx,polygon,fn){
  ctx.save();
  ctx.beginPath();
  for(let i=0;i<polygon.length;i++){const [x,y]=polygon[i];if(i)ctx.lineTo(x,y);else ctx.moveTo(x,y);}
  ctx.closePath();ctx.clip();fn();ctx.restore();
}
function featheredPatches(image,defs){
  const existing=cachedArt.get(image);if(existing)return existing;
  const iw=image.naturalWidth||image.width,ih=image.naturalHeight||image.height;
  if(!iw||!ih)return [];
  const list=defs.map(([x,y,w,h])=>{
    const fragment=document.createElement('canvas');
    fragment.width=Math.ceil(iw*w/1000);fragment.height=Math.ceil(ih*h/1500);
    const p=fragment.getContext('2d');
    p.drawImage(image,(x-w/2)*iw/1000,(y-h/2)*ih/1500,w*iw/1000,h*ih/1500,0,0,fragment.width,fragment.height);
    p.globalCompositeOperation='destination-in';
    p.scale(fragment.width/2,fragment.height/2);
    const g=p.createRadialGradient(1,1,.26,1,1,1);
    g.addColorStop(0,'white');g.addColorStop(.44,'white');g.addColorStop(.79,'rgba(255,255,255,.66)');g.addColorStop(1,'transparent');
    p.fillStyle=g;p.fillRect(0,0,2,2);
    return fragment;
  });
  cachedArt.set(image,list);return list;
}
function soft(ctx,x,y,w,h,angle,rgb,alpha){
  if(alpha<.002)return;
  if(!brushes.has(rgb)){
    const c=document.createElement('canvas');c.width=c.height=72;
    const p=c.getContext('2d'),g=p.createRadialGradient(36,36,0,36,36,36);
    g.addColorStop(0,'rgba('+rgb+',1)');g.addColorStop(.42,'rgba('+rgb+',.68)');g.addColorStop(1,'rgba('+rgb+',0)');
    p.fillStyle=g;p.fillRect(0,0,72,72);brushes.set(rgb,c);
  }
  ctx.save();ctx.translate(x,y);ctx.rotate(angle);ctx.globalAlpha=clamp(alpha,0,1);
  ctx.drawImage(brushes.get(rgb),-w,-h,2*w,2*h);ctx.restore();
}
function stroke(ctx,x,y,endX,endY,midX,midY,color,weight,alpha){
  if(alpha<.003)return;
  ctx.strokeStyle=color;ctx.lineWidth=weight;ctx.globalAlpha=clamp(alpha,0,1);
  ctx.beginPath();ctx.moveTo(x,y);ctx.quadraticCurveTo(midX,midY,endX,endY);ctx.stroke();
}
function drop(ctx,x,y,r,alpha,color){
  ctx.fillStyle=color;ctx.globalAlpha=clamp(alpha,0,1);ctx.beginPath();ctx.arc(x,y,r,0,TAU);ctx.fill();
}
function river(ctx,s){
  if(!s.fx.water)return;
  const cloudy=s.weather==='rain'||s.weather==='cloudy'||s.weather==='snow';
  const tone=s.time==='evening'?'#ffe2a7':s.time==='night'?'#d9e7ff':s.season==='winter'?'#e8f5ff':'#d8fff5';
  const freshet=1+.15*fieldWind(s.t,.45);
  const waterTempo=s.season==='spring'?1.10:s.season==='winter'?.85:1;
  clipped(ctx,artFootprints.river,()=>{
    // Refract small pieces of the painted water only inside the conservative channel mask.
    if(s.image&&s.fx.motion&&s.fx.waves&&!s.reduced){
      const patches=featheredPatches(s.image,flowPatches);
      for(let i=0;i<patches.length;i++){
        const [x,y,w,h]=flowPatches[i],z=(y-400)/450;
        const drift=s.gain*freshet*(1.8+z*4.2)*Math.sin(s.t*waterTempo*(.73+z*.13)+i*1.8);
        ctx.save();ctx.translate(x+drift,y+drift*.22);ctx.transform(1,0,.04*Math.sin(s.t*.53+i)*s.gain,1,0,0);
        ctx.globalAlpha=s.alpha;ctx.drawImage(patches[i],-w/2,-h/2,w,h);ctx.restore();
      }
    }
    if(s.fx.waves){
      for(let i=0;i<17;i++){
        const band=reach[i%4],z=unit(i+10);
        const phase=mod(s.t*waterTempo*(.068+.02*z)+unit(i+22),1),fade=Math.sin(Math.PI*phase)**1.2;
        const x=band[0]*1000+(phase-.5)*(85+z*31)+unit(i+62)*65-30;
        const y=444+(x-450)*band[1]*.52+unit(i+32)*(63+115*z)+8*phase;
        const span=9+z*30,alpha=s.a*fade*(cloudy?.28:.47);
        stroke(ctx,x-span,y,x+span,y+5,x-1,y+3+3*Math.sin(s.t*.67+i),tone,1.35+z,alpha);
      }
    }
    if(s.fx.foam&&!s.reduced){
      for(let i=0;i<9;i++){
        const t=mod(s.t*.093+unit(i+75),1),x=296+unit(i+1)*564+t*57,y=427+unit(i+9)*53+t*8;
        stroke(ctx,x,y,x+6+t*9,y+1,x+4,y-2,'#e6fff9',1.7,s.a*.63*freshet*Math.sin(Math.PI*t));
      }
    }
    if(s.fx.light&&s.fx.reflections){
      const axis={morning:643,day:697,evening:561,night:739}[s.time]||695;
      for(let i=0;i<10;i++){
        const blink=(.5+.5*Math.sin(s.t*(.67+i*.02)+i*1.83))**2;
        const x=axis+45*Math.sin(i*3.02),y=470+14*i;
        const a=s.a*blink*(cloudy?.20:.64)*(s.season==='summer'?1:.85);
        soft(ctx,x,y,11+5*blink,2.2,0,s.time==='evening'?'255,199,104':'203,239,255',a);
        stroke(ctx,x-5,y,x+6,y+.25,x,y-.6,tone,1.45,a);
      }
    }
    if(s.weather==='rain'&&s.fx.particles&&!s.reduced){
      for(let i=0;i<10;i++){
        const t=mod(s.t*.55+unit(i+21),1),x=377+unit(i+55)*574,y=465+unit(i+32)*261;
        ctx.lineWidth=1.5;ctx.strokeStyle='#d9f3f4';ctx.globalAlpha=clamp(s.a*(1-t)*.65,0,1);
        ctx.beginPath();ctx.ellipse(x,y,1+14*t,1+3.6*t,0,.12,TAU-.52);ctx.stroke();
      }
    }
  });
}
function windowFall(ctx,s) {
  if (s.weather==='snow') {
    drawLocalPrecipitation(ctx,s,paneSnow);
    return;
  }
  if (s.weather==='rain') {
    // Water already on the pane gathers and then drains under gravity. Keep it on the glass.
    const n=fallCount(17,s.fall);
    const speed=s.fall?.speed??1,size=s.fall?.size??1;
    for (let i=0;i<n;i++) {
      const f=mod(s.t*speed*(.14+.055*unit(i+9))+unit(i+38),1);
      const travel=clamp((f-.20)/.8,0,1)**1.5;
      const x=282+unit(i+3)*270,y=184+travel*271;
      const a=s.a*Math.sin(Math.PI*f)**.65*(.64+.32*unit(i+5));
      const trail=(5+(11+unit(i+3)*6)*travel)*size;
      stroke(ctx,x,y-trail,x,y,x,y-trail*.54,'#def5ff',1.35*size,a*.42);
      drop(ctx,x,y,(1.6+travel*.7)*size,a*.78,'#e3f6fd');
    }
    return;
  }
  if (s.time==='night'||!['spring','autumn'].includes(s.season))return;
  const kind=s.season==='spring'?'petal':'leaf';
  const options={region:'home',seed:31,front:paneFront,depth:s.fx.depth,gusts:s.fx.gusts};
  const n=fallCount(4,s.fall);
  for (let i=0;i<n;i++) {
    const p=sampleFall(kind,i,s.t,s.fall,options);
    // Beyond the left-hand sash, where the tree is visible through all four paintings.
    drawLocalLeaf(ctx,kind,i,p,276+116*p.x,188+151*p.y,2.9,s.a*.82);
  }
}

function windowWeather(ctx,s){
  if(!s.fx.particles||s.reduced)return;
  if(s.fallPlus){
    clipped(ctx,artFootprints.pane,()=>windowFall(ctx,s));
    return;
  }
  if(!['rain','snow'].includes(s.weather)){
    if(!['spring','autumn'].includes(s.season)||s.time==='night')return;
    // A few distant petals/leaves pass the tree at the left of the central pane.
    clipped(ctx,artFootprints.pane,()=>{
      for(let i=0;i<4;i++){
        const phase=mod(s.t*(.049+i*.003)+unit(i+7),1),a=Math.sin(Math.PI*phase);
        const x=274+24*i+phase*36+7*Math.sin(phase*TAU+i),y=190+141*phase;
        ctx.fillStyle=s.season==='spring'?'#f9cdd6':'#cba264';ctx.globalAlpha=clamp(s.a*a*.71,0,1);
        ctx.beginPath();ctx.ellipse(x,y,2.5,1.25,phase*4+i,0,TAU);ctx.fill();
      }
    });
    return;
  }
  clipped(ctx,artFootprints.pane,()=>{
    const snow=s.weather==='snow';
    for(let i=0;i<(snow?14:17);i++){
      const phase=mod(s.t*(snow?.10:.14+.055*unit(i+9))+unit(i+38),1);
      // Raindrops cling for a moment and then coalesce into a travelling streak.
      const travel=snow?phase:clamp((phase-.20)/.8,0,1)**1.5;
      const x=282+unit(i+3)*270+(snow?Math.sin(s.t*.78+i)*7:travel*2);
      const y=184+travel*271;
      const alpha=s.a*Math.sin(Math.PI*phase)**.65;
      if(!snow)stroke(ctx,x-1,y-6-travel*13,x,y,x-.55,y-6,'#def5ff',1.35,alpha*.42);
      drop(ctx,x,y,snow?1.8+unit(i)*1.8:1.6+travel*.7,alpha*.78,snow?'#f5fbff':'#e3f6fd');
    }
  });
}
function interior(ctx,s){
  windowWeather(ctx,s);
  const night=s.time==='night',evening=s.time==='evening',cloud=s.weather!=='sunny';
  const beam=s.time==='day'?0.78:1;
  if(s.fx.light&&s.fx.ground){
    clipped(ctx,artFootprints.floor,()=>{
      const w=s.reduced?0:fieldWind(s.t,.35)*s.gain;
      const color=night?'255,175,91':evening?'255,187,90':s.season==='winter'?'232,238,230':s.season==='autumn'?'255,224,155':'255,235,181';
      const shine=s.a*(cloud?.19:.52)*(night?.52:beam);
      // The right lamp is lit at night. Daylight stripes originate near the sill.
      if(night)soft(ctx,810,772,36,144,.21,color,shine);
      else for(let i=0;i<4;i++){
        const x=405+i*77+w*6,y=651+i*(evening?30:16);
        soft(ctx,x,y,s.time==='day'?69:106,8+i*.9,evening?.62:.39,color,shine*(.61+.20*Math.sin(s.t*.49+i)));
      }
    });
  }
  if(s.fx.light&&s.fx.particles&&!s.reduced&&s.weather==='sunny'&&!night){
    for(let i=0;i<6;i++){
      const x=340+unit(i+61)*210+Math.sin(s.t*.25+i)*8,y=463+unit(i+56)*138+5*Math.cos(s.t*.32+i);
      drop(ctx,x,y,1+unit(i)*.8,s.a*(.2+.25*Math.sin(s.t*.6+i)**2),'#ffe7b2');
    }
  }
}
function farmland(ctx,s){
  if(s.fx.motion&&s.fx.canopy&&!s.reduced&&s.image){
    const pieces=featheredPatches(s.image,plants);
    for(let i=0;i<pieces.length;i++){
      const [x,y,w,h]=plants[i],f=fieldWind(s.t,x/1000);
      const flex=(s.fx.gusts?f:.28*Math.sin(s.t*.77-x*.003))*s.gain*(s.fallPlus?windScale(s):1);
      ctx.save();ctx.translate(x,y+h*.41);ctx.rotate(flex*(y<580?.039:.055));
      ctx.transform(1,0,-flex*.024,1,0,0);ctx.globalAlpha=s.alpha;
      ctx.drawImage(pieces[i],-w/2,-h*.91,w,h);ctx.restore();
    }
  }
  const dusk=s.time==='evening'||s.time==='night',wet=['rain','snow'].includes(s.weather);
  if(s.fx.light&&s.fx.ground&&s.weather==='sunny'&&!dusk){
    for(const [x,y] of [[207,525],[776,513],[898,549]]){
      soft(ctx,x,y,48,7,-.035,'248,229,161',s.a*(.21+.08*Math.sin(s.t*.60-x*.006)));
    }
  }
  if(!s.fx.particles||s.reduced)return;
  if(wet){
    if(s.fallPlus){
      drawLocalPrecipitation(ctx,s,fieldWeather);
      return;
    }
    for(let i=0;i<16;i++){
      const phase=mod(s.t*(s.weather==='rain'?.52:.094)+unit(i+11),1);
      const x=unit(i+14)*1000+Math.sin(phase*TAU+i)*(s.weather==='snow'?15:3),y=phase*1260+40;
      const alpha=s.a*Math.sin(Math.PI*phase)*.66;
      if(s.weather==='rain')stroke(ctx,x-3,y-14,x,y,x-2,y-5,'#d9eff6',1.7,alpha);
      else drop(ctx,x,y,1.5+2*unit(i+3),alpha,'#f9fcff');
    }
    return;
  }
  if(s.fallPlus && ['spring','autumn'].includes(s.season)) {
    // The previous autumn sunset has no leaves. Only one small pass per source at dusk.
    if (s.time==='night'||(dusk && s.season!=='autumn'))return;
    const kind=s.season==='spring'?'petal':'leaf';
    const count=fallCount(dusk ? 6 : 14,s.fall);
    const options={region:'countryside',seed:83,front:fieldFront,depth:s.fx.depth,gusts:s.fx.gusts};
    for(let i=0;i<count;i++) {
      const [u,v]=fieldSources[i%fieldSources.length];
      options.anchorX=u/1000;
      const p=sampleFall(kind,i,s.t,s.fall,options);
      const x=u+54*(unit(i+11)-.5)+(p.x-p.sourceX)*810;
      const y=v+(54+72*p.depth)*p.y;
      const leafSize=dusk ? 4.6+5.6*p.depth : 4.3;
      drawLocalLeaf(ctx,kind,i,p,x,y,leafSize,s.a*.93);
    }
    return;
  }
  for(let i=0;i<leafEdges.length*2;i++){
    const [u,v]=leafEdges[i%leafEdges.length];
    const near=s.fx.depth?.45+.55*unit(i+8):.70;
    const wind=fieldWind(s.t,u/1000);
    const x=u+near*(15*Math.sin(s.t*.34+i)+7*wind),y=v+near*12*Math.cos(s.t*.41+i);
    if(dusk&&s.season==='summer'){
      const blink=(.5-.5*Math.cos(s.t*(.68+near*.39)+i*2.8))**1.7,a=s.a*blink*(.35+.42*near);
      if(s.fx.magic)soft(ctx,x,y,8+near*6,8+near*6,0,'223,248,129',a);
      drop(ctx,x,y,1.3+near*1.25,a,'#fff4ab');
    }else if(!dusk&&['autumn','spring'].includes(s.season)){
      const t=mod(s.t*.058+unit(i+1),1);
      ctx.save();ctx.translate(x+9*t,y-20+t*59);ctx.rotate(t*TAU+i+wind*.36);
      ctx.globalAlpha=clamp(s.a*Math.sin(Math.PI*t)*.72,0,1);ctx.fillStyle=s.season==='spring'?'#ffddda':'#d4a34e';
      ctx.beginPath();ctx.ellipse(0,0,3.4*near,1+near*Math.abs(Math.sin(t*TAU)),0,0,TAU);ctx.fill();ctx.restore();
    }
  }
}
export function drawRiverHomeCountry(ctx,state){
  if(!regions.has(state.region)||!(state.width>0&&state.height>0))return;
  const gain=clamp(Number.isFinite(state.strength)?state.strength:1,0,2);
  const alpha=clamp(state.opacity??1,0,1)*Math.min(gain,1);
  if(!alpha)return;
  const fx={water:true,motion:true,waves:true,foam:true,light:true,reflections:true,particles:true,
    ground:true,canopy:true,depth:true,gusts:true,magic:true,...state.effects};
  const t=state.reduced?0:(Number.isFinite(state.seconds)?state.seconds:0);
  const s={...state,fx,gain,alpha,a:alpha*(gain<=1?gain:1+.35*(gain-1)),t};
  ctx.save();ctx.scale(state.width/1000,state.height/1500);
  try{
    if(state.region==='river_lake')river(ctx,s);
    else if(state.region==='home')interior(ctx,s);
    else farmland(ctx,s);
  }finally{ctx.restore();}
}
