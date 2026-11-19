import {drawWeatherField} from './other-regions.mjs';

// One surface field drives the original pixels, the whitecaps, shoaling and the lip on the sand.
// Coordinates refer to the complete 1024 × 1536 artwork, including the sides cropped on a phone.
const TAU=Math.PI*2;
const W=1000,H=1500,horizon=.232, waterTop=336, waterBottom=980;
const clip01=n=>Math.max(0,Math.min(1,n));
const fract=n=>n-Math.floor(n);
const noise=n=>fract(Math.sin(n*91.53+13.87)*45673.819);
const smooth=n=>{const a=clip01(n);return a*a*(3-2*a);};
const cache=new WeakMap();
const profiles={
  E1:{swell:1.27,foam:.95,light:.77,glass:.72,air:.42},
  E2:{swell:.80,foam:.94,light:1.42,glass:1.39,air:1.27},
  E3:{swell:1.15,foam:1.08,light:1.08,glass:1.10,air:.83}
};
const hours={
  morning:{axis:.13,sky:[255,214,153],glint:[255,237,197],lip:0},
  day:{axis:.825,sky:[196,231,255],glint:[220,255,255],lip:-.0009},
  evening:{axis:.766,sky:[255,147,73],glint:[255,214,136],lip:.0006},
  night:{axis:.650,sky:[153,191,255],glint:[217,235,255],lip:.0016}
};
const bank=[.591,.595,.598,.615,.623,.627,.629,.628,.625,.618,.61,.599,.601,.609,.617,.624,.628];
function shore(x,time) {
  const i=clip01(x)*(bank.length-1),j=Math.min(bank.length-2,Math.floor(i));
  return bank[j]+(bank[j+1]-bank[j])*smooth(i-j)+(hours[time]?.lip??0);
}
function waveClock(s){return s/7.8+.045*Math.sin(s*.23)+.081*Math.sin(s*.077);}
function lateral(x){return .15*Math.sin(6.4*x+.6)+.075*Math.sin(15.1*x);}
function tideOffset(x,seconds){
  const beat=TAU*(waveClock(seconds)-lateral(x));
  return (.0057*Math.cos(beat)+.0014*Math.cos(beat*2-.9)+.0013*Math.sin(seconds*.31+x*4));
}
export function seaESwashAt(x,seconds=0,time='day'){
  return shore(x,time)+tideOffset(x,seconds);
}
export function inSeaEContact(x,y,time='day',seconds=0){
  return Number.isFinite(x)&&Number.isFinite(y)&&x>=0&&x<=1&&y>=.46&&y<=seaESwashAt(x,seconds,time);
}

// Static island/reef silhouettes in all four paintings; shallow submerged stones remain visible through moving water.
const rocks=[
 [[0,.284],[.052,.288],[.125,.302],[.152,.313],[.082,.320],[0,.312]],
 [[.832,.355],[.899,.342],[.957,.329],[1,.321],[1,.374],[.9,.370]],
 [[0,.398],[.072,.391],[.134,.394],[.209,.407],[.343,.417],[.337,.427],[.16,.425],[0,.417]]
];
function reefPath(ctx,vertices) {
  ctx.beginPath();
  vertices.forEach(([x,y],i)=>ctx[i?'lineTo':'moveTo'](W*x,H*y));
  ctx.closePath();
}
function createBuffer(w,h){
  if(typeof OffscreenCanvas==='function')return new OffscreenCanvas(w,h);
  const c=document.createElement('canvas');c.width=w;c.height=h;return c;
}
function waterTexture(image,time){
  if(!image?.naturalWidth||!image.naturalHeight)return null;
  if(cache.has(image))return cache.get(image);
  // Once per decoded image. All later frames just translate narrow strips of this cached surface.
  const scale=.82,w=Math.ceil(W*scale),h=Math.ceil((waterBottom-waterTop)*scale);
  const buffer=createBuffer(w,h),ctx=buffer.getContext('2d');
  ctx.scale(scale,scale);ctx.translate(0,-waterTop);
  ctx.drawImage(image,0,0,W,H);
  ctx.globalCompositeOperation='destination-in';
  const fade=ctx.createLinearGradient(0,waterTop,0,waterTop+32);
  fade.addColorStop(0,'transparent');fade.addColorStop(1,'#fff');
  ctx.fillStyle=fade;ctx.beginPath();ctx.moveTo(0,waterTop);ctx.lineTo(W,waterTop);
  for(let i=48;i>=0;i--){const x=i/48;ctx.lineTo(W*x,H*(shore(x,time)+.009));}
  ctx.closePath();ctx.fill();
  ctx.globalCompositeOperation='destination-out';
  ctx.fillStyle='#000';ctx.lineWidth=5;ctx.lineJoin='round';
  for(const reef of rocks){reefPath(ctx,reef);ctx.stroke();ctx.fill();}
  const result={buffer,scale};cache.set(image,result);return result;
}
function phaseAt(x,y,t,clock,shoreline){
  const d=clip01((y-horizon)/(shoreline-horizon));
  return TAU*(clock-3.05*Math.pow(d,.64)-lateral(x)+.035*Math.sin(t*.42+x*10));
}
function refractOriginal(ctx,s,texture,amount,weather){
  if(!texture||!s.effects.waves||!s.effects.motion||s.reduced)return;
  const clock=waveClock(s.t), {buffer,scale}=texture;
  const count=40;
  const band=(waterBottom-waterTop)/count;
  // Adjacent strips share the exact destination boundary; fixed reefs stay on their original layer.
  let previousY=waterTop;
  ctx.globalAlpha=clip01(s.opacity*.95);
  for(let i=0;i<count;i++){
    const y=waterTop+band*i,next=y+band,z=next/H;
    const depth=clip01((z-horizon)/(.625-horizon));
    const phase=phaseAt(.47,z,s.t,clock,.625);
    const amplitude=amount*(.75+5.7*depth)*weather;
    const dy=amplitude*(Math.sin(phase)+.18*Math.sin(2*phase-.5));
    const last=i===count-1, nextY=last?waterBottom:next+dy;
    const dx=amplitude*(.64*Math.cos(phase-.23)+.29*Math.sin(s.t*.5-depth*19));
    ctx.drawImage(buffer,0,(y-waterTop)*scale,buffer.width,Math.min(band*scale,buffer.height-(y-waterTop)*scale),dx-.7,previousY,W+1.4,nextY-previousY+.6);
    previousY=nextY;
  }
}
function segment(ctx,points,color,alpha,width){
  if(alpha<=.009||width<=0)return;
  ctx.strokeStyle=color;ctx.lineWidth=width;ctx.lineCap='round';ctx.lineJoin='round';ctx.globalAlpha=clip01(alpha);
  ctx.beginPath();ctx.moveTo(points[0][0],points[0][1]);
  for(let i=1;i<points.length;i++)ctx.lineTo(points[i][0],points[i][1]);
  ctx.stroke();
}
function halo(ctx,x,y,w,h,rgb,alpha){
  if(alpha<=.008)return;
  ctx.save();ctx.translate(x,y);ctx.scale(w,h);
  const g=ctx.createRadialGradient(0,0,0,0,0,1);
  g.addColorStop(0,'rgba('+rgb+',1)');g.addColorStop(.36,'rgba('+rgb+',.48)');g.addColorStop(1,'rgba('+rgb+',0)');
  ctx.globalAlpha=clip01(alpha);ctx.fillStyle=g;ctx.fillRect(-1,-1,2,2);ctx.restore();
}
// Each wave travels from the horizon to the near shore. It widens, catches light on the reef,
// then releases irregular pockets of foam. Only the wet lip remains during backwash.
function crests(ctx,s,p,clock,storm) {
  for(let front=0;front<3;front++){
    const progress=fract((clock+front)/3);
    const depth=progress**1.56;
    const shoal=smooth((depth-.24)/.55),breaking=smooth((depth-.68)/.28);
    const release=1-smooth((progress-.96)/.04);
    for(let cell=0;cell<12;cell++){
      const x0=cell/12+noise(cell+front*13)*.023;
      const y0=shore(x0,s.time);
      const z=horizon+(y0-horizon)*depth;
      if((x0<.16&&z>.282&&z<.32)||(x0>.82&&z>.32&&z<.38)||(x0<.34&&z>.39&&z<.433))continue;
      const span=.014+.058*noise(cell+front*9+42);
      const points=[];
      for(let k=0;k<=4;k++){
        const x=x0+span*k/4;
        const zlocal=shore(x,s.time);
        const curving=(.0028+.005*depth)*Math.sin(7.6*x+progress*5+front*2)+.0025*Math.sin(x*33+s.t*.37);
        const y=horizon+(zlocal-horizon)*depth+curving;
        points.push([x*W,Math.min(y,seaESwashAt(x,s.t,s.time))*H]);
      }
      const flicker=.64+.36*Math.sin(s.t*.85+cell*1.47+front);
      if(s.effects.waves){
        segment(ctx,points,'rgb('+s.hour.glint+')',s.opacity*(.08+.21*shoal)*p.swell*flicker*release,1+depth*2);
      }
      if(s.effects.foam&&breaking>.015){
        const a=s.opacity*p.foam*breaking*release*storm*(.39+.42*flicker);
        segment(ctx,points,'#effdff',a,1.7+breaking*3.8);
        const [x,y]=points[2];
        for(let j=0;j<4;j++){
          const dx=(noise(cell*8+j)-.5)*span*W,ry=1.2+noise(cell+j)*1.6;
          ctx.strokeStyle='#f2fbff';ctx.lineWidth=1.05;ctx.globalAlpha=clip01(a*(.82-.11*j));
          ctx.beginPath();ctx.ellipse(x+dx,y-2-j*2,ry*1.8,ry,-.1,0,4.9);ctx.stroke();
        }
      }
    }
  }
}
function swash(ctx,s,p){
  const fall=1.5*Math.sin(s.t*.32);
  for(let i=0;i<18;i++){
    const x0=(i+noise(i)*.38)/18,len=.019+.029*noise(i+37),points=[];
    for(let j=0;j<=4;j++){
      const x=x0+j/4*len;
      const y=H*seaESwashAt(x,s.t,s.time)+1.5*Math.sin(j*1.2+i+s.t*.91);
      points.push([x*W,y]);
    }
    const a=(.23+.22*Math.cos(TAU*(waveClock(s.t)-lateral(x0))-.65))*s.opacity*p.foam;
    segment(ctx,points,'#6d8f9d',a*.70,3.9);
    segment(ctx,points.map(([x,y])=>[x,y-2+fall*.25]),'#fffcf2',a+.08*s.opacity,2.6);
  }
}
function shallowLight(ctx,s,p){
  // Small broken caustic cells grow from the sunlit ripples in front of the reef.
  const sunlight=s.season==='summer'?1.17:s.season==='winter'?.79:1;
  const visible=sunlight*(s.weather==='sunny'?1:s.weather==='cloudy'?.35:.16);
  const tint=s.time==='night'?'#b9e4ff':s.time==='evening'?'#ffddac':'#d0ffec';
  for(let row=0;row<3;row++)for(let col=0;col<9;col++){
    const x=.073+.10*col+.014*noise(col+row*9);
    const y=.458+.04*row+.012*noise(row*4+col);
    const phase=phaseAt(x,y,s.t,waveClock(s.t),shore(x,s.time));
    const a=(.18+.45*(.5+.5*Math.cos(phase))**2)*s.opacity*visible*p.glass;
    const dx=3.7*Math.sin(phase),dy=2.5*Math.cos(phase);
    const xx=x*W+dx, yy=y*H+dy;
    segment(ctx,[[xx-10,yy+3],[xx-2,yy-2],[xx+5,yy-.5],[xx+11,yy-3]],tint,a,1.65);
    if(row===2||col%2===0)segment(ctx,[[xx-2,yy-2],[xx-4+dy,yy-6],[xx+dx,yy-9]],tint,a*.61,1.05);
  }
}
function reflectedPath(ctx,s,p,clock){
  const warm=s.time==='evening'||s.time==='morning',axis=s.hour.axis;
  const direct=s.weather==='sunny'?1:s.weather==='cloudy'?.48:.28;
  const rgb=s.hour.glint;
  for(let i=0;i<22;i++){
    const depth=(i+.45)/22,y=horizon+.348*depth;
    const phase=phaseAt(axis,y,s.t,clock,shore(axis,s.time));
    const swell=.5+.5*Math.cos(phase), sparkle=swell**2;
    const x=axis*(1-depth*.03)+Math.sin(i*6.9+s.t*.48)*(.007+depth*.036);
    const w=4+depth*(11+18*sparkle);
    const a=s.opacity*p.light*direct*(.12+.54*sparkle);
    segment(ctx,[[x*W-w,y*H+2],[x*W,y*H+1-swell*3],[x*W+w,y*H]],'rgb('+rgb+')',a,1.3+depth*1.8);
    if(i%4===0)halo(ctx,x*W,y*H,9+w,3+depth*2.5,rgb,a*.52);
  }
  // At a grazing angle a passing wave turns a broad, soft reflection into several bright facets.
  // Their hue and axis come from that time slot's painted sky, including the warm sky at dawn.
  if(s.effects.magic && direct>.45){
    const haze=s.season==='winter'?.74:s.season==='summer'?1.12:1;
    for(let row=0;row<8;row++){
      const d=row/8,z=.253+.30*d,phase=phaseAt(axis,z,s.t,clock,shore(axis,s.time));
      const facing=(.5+.5*Math.cos(phase))**2, width=10+40*d;
      const x=axis*W+width*.43*Math.sin(phase*.9+row),y=z*H;
      const a=s.opacity*direct*p.air*(.16+.37*facing)*haze;
      halo(ctx,x,y,width+13,3+4.5*d,rgb,a);
      if(facing>.45){
        const r=(facing-.45)*14*p.air;
        segment(ctx,[[x-r*1.5,y],[x+r*1.5,y]],'rgb('+rgb+')',a*1.35,2.1);
        segment(ctx,[[x,y-r*.55],[x,y+r*.55]],'rgb('+rgb+')',a*1.18,1.4);
      }
    }
  }
  if(s.effects.magic && (s.time==='night'||warm)){
    const t=s.t%143;
    const moment=Math.max(0,1-Math.abs(t-23)/5,1-Math.abs(t-88)/7);
    if(moment>0) for(let i=0;i<6;i++){
      const x=axis*W+Math.sin(i*5.24+s.t*.32)*(8+3*i),y=398+i*58;
      const a=moment*s.opacity*p.air*direct*(.4+.4*Math.cos(s.t*1.8+i));
      halo(ctx,x,y,20,9,rgb,a*.66);segment(ctx,[[x,y-4],[x,y+4]],'#fffce6',a,1.5);
    }
  }
}
function coastAir(ctx,s,p){
  const clear=s.weather==='sunny';
  const warm=s.time==='morning'||s.time==='evening';
  if(s.effects.light){
    const x=s.hour.axis*W,z=s.time==='night'?236:300;
    const seasonWarmth=s.season==='autumn'?1.18:s.season==='winter'?.80:1;
    const a=s.opacity*p.air*(.19+.12*Math.sin(s.t*.24))*seasonWarmth*(clear?1:.28);
    // Soften the existing light above the horizon; never paint a second sun or moon.
    halo(ctx,x,z,warm?141:93,warm?71:45,s.hour.sky,a);
  }
  if(!s.effects.particles||s.reduced||!['rain','snow'].includes(s.weather))return;
  const rain=s.weather==='rain',n=rain?23:15;
  if(s.fallPlus)drawWeatherField(ctx,s,rain?'rain':'snow',n);
  for(let i=0;i<n;i++){
    if(!s.fallPlus){
      const t=fract(s.t*(rain?.43:.055)+noise(i));
      const x=W*noise(49+i)+(rain?t*31:Math.sin(TAU*t+i)*16),y=t*1450;
      const a=s.opacity*Math.sin(t*Math.PI)*(.23+.33*noise(i+12));
      if(rain)segment(ctx,[[x,y],[x+2,y+13]],'#dceaf6',a,1.3);
      else{ctx.globalAlpha=clip01(a);ctx.fillStyle='#f8fbff';ctx.beginPath();ctx.arc(x,y,1.6+noise(i+7)*1.7,0,TAU);ctx.fill();}
    }
    if(rain&&s.effects.water&&i%3===0){
      const u=fract(s.t*.52+noise(i+72)),rx=1+14*u;
      ctx.strokeStyle='#e1eefb';ctx.lineWidth=1.45;ctx.globalAlpha=clip01(s.opacity*(1-u)*.43);
      ctx.beginPath();ctx.ellipse(160+noise(i+6)*660,589+noise(i+25)*220,rx,rx*.18,0,0,TAU);ctx.stroke();
    }
  }
}
export function drawSeaE(ctx,state){
  const profile=profiles[state.variant],opacity=clip01(state.opacity??1),strength=Math.max(0,Math.min(2,state.strength??1));
  if(state.region!=='sea'||!profile||!(state.width>0&&state.height>0)||!opacity||!strength)return;
  const effects={water:true,waves:true,motion:true,foam:true,light:true,reflections:true,caustics:true,particles:true,magic:true,...state.effects};
  if(!effects.water&&!effects.light&&!effects.particles)return;
  const s={...state,effects,opacity:opacity*Math.min(strength,1),t:state.reduced?0:state.seconds,hour:hours[state.time]||hours.day};
  const gain=strength<=1?strength:1+(strength-1)*.5;
  const p={};for(const key of Object.keys(profile))p[key]=profile[key]*gain;
  ctx.save();ctx.scale(s.width/W,s.height/H);
  const clock=waveClock(s.t),storm=s.weather==='rain'?1.13:s.weather==='snow'?.79:1;
  if(effects.water){
    if(effects.waves&&effects.motion&&!s.reduced)refractOriginal(ctx,s,waterTexture(s.image,s.time),p.swell,storm);
    if(effects.waves||effects.foam)crests(ctx,s,p,clock,storm);
    if(effects.foam)swash(ctx,s,p);
    if(effects.light&&effects.caustics)shallowLight(ctx,s,p);
    if(effects.light&&effects.reflections)reflectedPath(ctx,s,p,clock);
  }
  coastAir(ctx,s,p);ctx.restore();
}
