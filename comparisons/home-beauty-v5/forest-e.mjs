// All positions use the four adopted forest paintings (1000 × 1500 design space).
// Each layer is decorative and is drawn below actors. The source art is read only.
const TAU=2*Math.PI;
const clamp=(x,a,b)=>Math.min(b,Math.max(a,x));
const mod=(x,p)=>((x%p)+p)%p;
const noise=i=>mod(Math.sin(i*45.839+18)*9340.115,1);
const profiles={
  E1:{breeze:1.2,glow:.24,leaves:15},
  E2:{breeze:.91,glow:1.48,leaves:24},
  E3:{breeze:1.14,glow:.97,leaves:20}
};
export const forestEProfile=v=>profiles[v];

// A pressure front, then a smaller, lagging return, travels crown-to-crown.
// Individual waves differ in direction, duration and vertical reach.
const weatherFronts=[[12,1,2.8,.93],[35,-1,2.1,.52],[59,1,4.3,1],[89,-1,2.9,.70],
  [121,-1,3.7,.89],[151,1,2.4,.64],[186,1,4.2,.97],[214,-1,2.7,.77]];
function bump(x){return Math.abs(x)<1?(.5+.5*Math.cos(Math.PI*x)):0;}
export function forestFront(seconds,u,depth,enabled=true){
  const t=mod(seconds,235);
  let gust=0,bend=0;
  if(enabled)for(const [start,direction,duration,magnitude] of weatherFronts){
    const arrival=start+4.2*(direction===1?u:1-u)+.95*depth;
    const delta=t-arrival;
    const crest=bump(delta/duration)*magnitude;
    gust+=crest;
    bend+=direction*(1.38*crest-.42*magnitude*bump((delta-duration*.95)/(duration*.67)));
  }
  const continuous=.32*Math.sin(seconds*.69-u*4.4-depth*1.7)+.17*Math.sin(seconds*1.23-u*5.2+depth*3.9);
  return {gust,bend:bend+continuous};
}

// Locally isolated boughs, smaller distant crowns, and near grass. Major trunks
// and open sky stay outside the opaque centre of every sample.
const clusters=[
  // centre x/y, width/height, branch root within cutout, near=1 far=0
  [382,108,193,126,.14,.20,.97],[664,88,178,109,.86,.16,.95],
  [776,233,187,154,.89,.09,.93],[269,230,146,116,.06,.60,.77],
  [485,323,137,104,.15,.70,.80],[256,452,128,106,.12,.79,.72],
  [692,398,127,107,.9,.85,.58],[846,565,160,127,.97,.76,.68],
  [490,570,120,92,.68,.9,.31],[379,638,123,107,.43,.93,.38],
  [689,679,125,120,.65,.96,.26],[540,732,112,76,.52,.97,.19],
  [139,981,139,93,.43,.93,.91],[842,1159,193,77,.52,.95,.93],
  [358,1291,175,108,.48,.95,.99],[183,1413,199,115,.45,.95,1]
];
const cache=new WeakMap();
function isolate(image){
  if(cache.has(image))return cache.get(image);
  const w=image.naturalWidth||image.width,h=image.naturalHeight||image.height;
  if(!w||!h)return [];
  const parts=clusters.map(([x,y,rw,rh])=>{
    const canvas=document.createElement('canvas');
    canvas.width=Math.ceil(rw*w/1000);canvas.height=Math.ceil(rh*h/1500);
    const c=canvas.getContext('2d');
    c.drawImage(image,(x-rw/2)*w/1000,(y-rh/2)*h/1500,rw*w/1000,rh*h/1500,0,0,canvas.width,canvas.height);
    c.globalCompositeOperation='destination-in';c.scale(canvas.width/2,canvas.height/2);
    const feather=c.createRadialGradient(1,1,.25,1,1,1);
    feather.addColorStop(0,'white');feather.addColorStop(.44,'white');feather.addColorStop(.78,'rgba(255,255,255,.60)');feather.addColorStop(1,'transparent');
    c.fillStyle=feather;c.fillRect(0,0,2,2);return canvas;
  });
  cache.set(image,parts);return parts;
}
const brushes=new Map();
function glowBrush(rgb){
  if(brushes.has(rgb))return brushes.get(rgb);
  const el=document.createElement('canvas');el.width=el.height=80;
  const c=el.getContext('2d'),g=c.createRadialGradient(40,40,0,40,40,40);
  g.addColorStop(0,'rgba('+rgb+',1)');g.addColorStop(.36,'rgba('+rgb+',.69)');g.addColorStop(.76,'rgba('+rgb+',.13)');g.addColorStop(1,'rgba('+rgb+',0)');
  c.fillStyle=g;c.fillRect(0,0,80,80);brushes.set(rgb,el);return el;
}
function glow(ctx,x,y,rx,ry,angle,rgb,alpha){
  if(alpha<.002)return;
  ctx.save();ctx.translate(x,y);ctx.rotate(angle);ctx.globalAlpha=clamp(alpha,0,1);
  ctx.drawImage(glowBrush(rgb),-rx,-ry,2*rx,2*ry);ctx.restore();
}
function foliage(ctx,s){
  if(s.reduced||!s.image||!s.fx.motion||!s.fx.canopy)return;
  const patches=isolate(s.image);
  for(let i=0;i<patches.length;i++){
    const [x,y,w,h,px,py,z]=clusters[i],f=forestFront(s.t,x/1000,z,s.fx.gusts);
    const flex=s.energy*(.42+.55*z)*s.profile.breeze;
    const tremble=Math.sin(s.t*(2.4+z*1.4)-x*.009)*(.09+f.gust*.18);
    const twist=(f.bend+tremble)*flex;
    ctx.save();ctx.translate(x+w*(px-.5),y+h*(py-.5));
    ctx.rotate(twist*.052);ctx.transform(1,.006*twist,-.037*twist,1,0,0);
    ctx.globalAlpha=s.alpha;ctx.drawImage(patches[i],-w*px,-h*py,w,h);ctx.restore();
  }
}
// Each bright opening in the crown has its own receiving patch in the clearing.
// Left-hand shafts follow the painted slant of the long morning and evening shadows.
const openings=[[230,183,470,879,1],[329,248,620,933,.85],[416,194,755,1007,.51],[169,303,395,982,.83]];
function clearing(ctx,s){
  if(!s.fx.light)return;
  const night=s.time==='night',ev=s.time==='evening',morning=s.time==='morning';
  const color=night?'181,219,243':s.season==='winter'?'223,238,245':ev?'255,190,85':morning?'255,227,158':'255,241,168';
  const clouds=s.weather==='sunny'?1:s.weather==='cloudy'?.40:.21;
  for(const [u,v,bx,by,z] of openings){
    const f=s.reduced?{bend:0,gust:0}:forestFront(s.t,u/1000,z,s.fx.gusts);
    const x=bx+f.bend*28*s.energy,y=by+f.bend*7*s.energy;
    const breathing=.72+.19*Math.sin(.6*s.t-u*.004)+.46*f.gust;
    // The sunset painting already contains hard light. Saturate the added glow
    // before stretching strength to 200%, so leaf and bark detail stays visible.
    const exposure=s.energy<=1?s.energy:1+.30*(s.energy-1);
    const sunlight=s.alpha*exposure*clouds*(night?.36:ev?.78:1)*breathing;
    const warmth=Math.min(1.7,s.magic)*(night?.7:1);
    if(s.fx.shafts){
      const dx=x-u,dy=y-v,len=Math.hypot(dx,dy),angle=Math.atan2(dy,dx);
      glow(ctx,u+dx*.51,v+dy*.51,len*(.44+.04*z),16+warmth*7+5*z,angle,color,Math.min(.42,sunlight*(.18+.16*warmth)));
      glow(ctx,u+dx*.66+12,v+dy*.66,len*.25,6+2*warmth,angle,color,Math.min(.19,sunlight*(.10+.08*warmth)));
    }
    if(s.fx.ground){
      // Pairs of opposing shapes model sun and shade through one opening.
      // The same local bend sets both the footprint and the beam direction.
      for(let j=0;j<3;j++){
        const xx=x+(j-1)*48,yy=y+(j-1)*12;
        const angle=morning||ev?.21:.1;
        glow(ctx,xx+8,yy+10,46+j*9,8+j,angle,'26,53,50',sunlight*.32);
        glow(ctx,xx,yy,36+6*j+6*f.gust,6+1.2*j,angle,color,sunlight*(.36+.11*warmth));
      }
    }
  }
}
function leaf(ctx,x,y,size,rotation,roll,fill,opacity){
  ctx.save();ctx.translate(x,y);ctx.rotate(rotation);ctx.scale(size,size*roll);
  ctx.globalAlpha=clamp(opacity,0,1);ctx.fillStyle=fill;ctx.beginPath();
  ctx.moveTo(-1,0);ctx.quadraticCurveTo(-.15,-.92,1,-.21);ctx.quadraticCurveTo(.36,.87,-1,0);ctx.fill();ctx.restore();
}
const seasonalColors={
  spring:['#ffc8d6','#ffe7e5'],summer:['#b3d866','#e7ed9c'],autumn:['#da8743','#f2b452'],winter:['#dde8f2','#eaf8ff']
};
function air(ctx,s){
  if(!s.fx.particles||s.reduced)return;
  const rain=s.weather==='rain',snow=s.weather==='snow',wet=rain||snow;
  const dusk=s.time==='evening'||s.time==='night';
  const fireflies=!wet&&dusk&&s.season==='summer';
  const n=s.profile.leaves+(wet?8:0);
  for(let i=0;i<n;i++){
    const u=.065+noise(i+3)*.87;
    const depth=s.fx.depth?(.18+.78*noise(i+87)):.55;
    const wind=forestFront(s.t,u,depth,s.fx.gusts);
    const speed=(rain?.46:snow?.056:.040)*(.50+depth);
    const t=mod(s.t*speed+noise(i+29),1),pulse=Math.sin(t*Math.PI)**.72;
    const sway=Math.sin(t*TAU+i*2.7);
    let x=u*1000+(sway*(wet?6:26)+wind.bend*(18+25*wind.gust))*(.45+depth);
    const y=(wet?15:155)+t*(wet?1370:810);
    const alpha=s.alpha*s.energy*(.30+.67*depth)*pulse;
    if(wet){
      if(snow){
        const r=1+depth*3.4;
        ctx.globalAlpha=clamp(alpha,0,1);ctx.fillStyle='#f7fbff';ctx.beginPath();ctx.arc(x,y,r,0,TAU);ctx.fill();
      }else{
        ctx.globalAlpha=clamp(alpha*.8,0,1);ctx.strokeStyle='#d4eaf0';ctx.lineWidth=.65+depth*1.3;
        ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+3+wind.bend*3,y+8+depth*20);ctx.stroke();
      }
      continue;
    }
    const seasonal=s.season==='spring'||s.season==='autumn';
    if(seasonal||((i%3===0)&&wind.gust>.05&&s.season==='summer')){
      const leafAlpha=seasonal?alpha:alpha*wind.gust;
      const size=(2.1+depth*3.5)*(1+wind.gust*.17);
      leaf(ctx,x,y,size,t*TAU*1.45+i+wind.bend*.8,.23+.77*Math.abs(sway),seasonalColors[s.season][i%2],leafAlpha);
    }
    if(fireflies){
      const phase=s.t*(.71+.49*depth)+i*2.4;
      const wave=(.5-.5*Math.cos(phase))**1.7;
      const flightX=u*1000+Math.sin(s.t*(.2+.15*depth)+i)*19+wind.bend*12;
      const flightY=587+noise(i+72)*365+Math.cos(s.t*.39+i)*13;
      const a=wave*s.alpha*(.27+.60*s.magic)*(.4+depth*.6);
      glow(ctx,flightX,flightY,9+depth*(5+s.magic*5),8+depth*(4+s.magic*5),0,'210,243,126',a);
      ctx.globalAlpha=clamp(a*1.18,0,1);ctx.fillStyle='#fff8bd';ctx.beginPath();ctx.arc(flightX,flightY,1.55+depth*1.45,0,TAU);ctx.fill();
    }
  }
}
// A brief procession of illuminated seeds/fireflies follows the opening in the
// canopy. Each point is in motion before the next one brightens.
function lightProcession(ctx,s){
  if(!s.fx.light||!s.fx.particles||s.magic<=.3||s.reduced||s.weather!=='sunny')return;
  const night=s.time==='night',twilight=s.time==='evening';
  const passage=mod(s.t,127);
  const event=Math.max(bump((passage-16)/7),bump((passage-65)/9),bump((passage-98)/5));
  const intensity=s.alpha*(s.magic-.24)*(.17+event*.75);
  const color=night?'191,237,204':twilight?'255,201,121':'255,225,147';
  for(let i=0;i<11;i++){
    const t=mod(i/11+s.t*.068,1);
    const x=night?220+590*t:267+380*t;
    const y=night?780-103*Math.sin(t*Math.PI*1.1)+22*Math.sin(t*TAU*1.7+s.t*.44):235+557*t+Math.sin(t*TAU*1.5+s.t*.6)*24;
    const a=intensity*Math.sin(t*Math.PI)**1.1*(.6+.4*Math.sin(s.t*.81+i)**2);
    glow(ctx,x,y,11+event*6,7+event*3,night?0:1.03,color,a);
    ctx.globalAlpha=clamp(a,0,1);ctx.fillStyle=night?'#e6ffe2':'#fff5b8';
    ctx.beginPath();ctx.ellipse(x,y,3.7,1.65,Math.sin(t*TAU+i),0,TAU);ctx.fill();
  }
}
export function drawForestE(ctx,state){
  const profile=forestEProfile(state.variant),strength=clamp(Number.isFinite(state.strength)?state.strength:1,0,2);
  const alpha=clamp(state.opacity??1,0,1)*Math.min(1,strength);
  if(!profile||state.region!=='forest'||!alpha||!(state.width>0&&state.height>0))return;
  const fx={motion:true,canopy:true,ground:true,shafts:true,depth:true,magic:true,gusts:true,particles:true,light:true,...state.effects};
  const s={...state,profile,fx,alpha,energy:strength,t:state.reduced?0:state.seconds,magic:fx.magic?profile.glow*strength:0};
  ctx.save();ctx.scale(s.width/1000,s.height/1500);
  try{foliage(ctx,s);clearing(ctx,s);air(ctx,s);lightProcession(ctx,s);}
  finally{ctx.restore();}
}
