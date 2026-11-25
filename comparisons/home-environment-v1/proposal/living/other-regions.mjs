// Coordinates below are on the original painting scaled to 1000 × 1500.
// Keep transparent edges around the sampled texture so no moving rectangle is visible.
import {waterMask} from './nature.mjs';
import {fallCount,sampleFall} from './fall-motion.mjs';

const TAU = Math.PI * 2;
const clamp = n => Math.max(0, Math.min(1, n));
const fraction = n => n - Math.floor(n);
const noise = n => fraction(Math.sin((n + 31) * 46.147) * 45781.314);
const wave = n => (1 - Math.cos(n)) / 2;
const stripCache = new WeakMap();

const seaStrips = [
  [144,386,640,42], [194,452,595,49], [284,518,480,55],
  [108,612,680,66], [235,705,540,72], [190,784,572,85],
  [247,852,485,42]
];
const lakeStrips = [
  [282,502,433,19], [196,531,594,22], [175,556,623,25],
  [207,587,555,32], [228,622,541,31], [313,656,430,25]
];
const wetStones = [[257,806,87,145],[476,834,112,179],[693,882,80,167],[799,953,54,113]];
const windowPanes = [[.92,.317],[.92,.378],[.74,.42]];
const shopWindows = [[.121,.146],[.186,.396],[.325,.49],[.568,.507],[.70,.508],[.963,.403]];

function softStrip(image, bounds) {
  if (!image?.naturalWidth || !image.naturalHeight) return null;
  let strips = stripCache.get(image);
  if (!strips) { strips = new Map(); stripCache.set(image, strips); }
  if (strips.has(bounds)) return strips.get(bounds);
  const [x,y,w,h] = bounds;
  const buffer = typeof OffscreenCanvas === 'function' ? new OffscreenCanvas(w,h) : document.createElement('canvas');
  buffer.width=w; buffer.height=h;
  const ctx=buffer.getContext('2d');
  const sx=image.naturalWidth/1000, sy=image.naturalHeight/1500;
  ctx.drawImage(image,x*sx,y*sy,w*sx,h*sy,0,0,w,h);
  ctx.globalCompositeOperation='destination-in';
  for(const axis of ['x','y']){
    const gradient=ctx.createLinearGradient(0,0,axis==='x'?w:0,axis==='y'?h:0);
    gradient.addColorStop(0,'transparent');gradient.addColorStop(.14,'#fff');
    gradient.addColorStop(.86,'#fff');gradient.addColorStop(1,'transparent');
    ctx.fillStyle=gradient;ctx.fillRect(0,0,w,h);
  }
  strips.set(bounds,buffer);
  return buffer;
}

function deform(ctx,s,strips,amplitude,frequency){
  if(!s.effects.motion || s.reduced)return;
  strips.forEach((bounds,i)=>{
    const tile=softStrip(s.image,bounds);
    if(!tile)return;
    const phase=s.seconds*frequency-i*.8;
    const [x,y,w,h]=bounds;
    const distance=amplitude*s.physical*(.65+.06*i)*(1+.4*s.gust);
    const dx=Math.sin(phase*.91)*distance;
    const dy=Math.sin(phase+i*.13)*distance*.56;
    ctx.globalAlpha=clamp(s.opacity*.92);
    ctx.drawImage(tile,x+dx,y+dy,w,h+distance*.43*Math.cos(phase));
  });
}

function clipWater(ctx,region){
  ctx.beginPath();
  waterMask(region).forEach(([u,v],i)=>ctx[i?'lineTo':'moveTo'](u*1000,v*1500));
  ctx.closePath(); ctx.clip();
}

function glow(ctx,x,y,rx,ry,color,alpha){
  if(alpha<=.003)return;
  ctx.save();ctx.translate(x,y);ctx.scale(rx,ry);
  const g=ctx.createRadialGradient(0,0,0,0,0,1);
  g.addColorStop(0,'rgba('+color+',1)');g.addColorStop(.38,'rgba('+color+',.42)');g.addColorStop(1,'rgba('+color+',0)');
  ctx.globalAlpha=clamp(alpha);ctx.fillStyle=g;ctx.fillRect(-1,-1,2,2);ctx.restore();
}
function line(ctx,x,y,r,angle,color,alpha,width=1.65){
  ctx.strokeStyle=color;ctx.globalAlpha=clamp(alpha);ctx.lineWidth=width;ctx.beginPath();
  ctx.moveTo(x-r*Math.cos(angle),y-r*Math.sin(angle));ctx.lineTo(x+r*Math.cos(angle),y+r*Math.sin(angle));ctx.stroke();
}
function ring(ctx,x,y,r,color,alpha){
  ctx.strokeStyle=color;ctx.globalAlpha=clamp(alpha);ctx.lineWidth=1.75;ctx.beginPath();
  ctx.ellipse(x,y,r,r*.19,0,.08,Math.PI*.85);
  ctx.stroke();ctx.beginPath();ctx.ellipse(x,y,r*.94,r*.19,0,Math.PI*1.06,Math.PI*1.8);ctx.stroke();
}
function rare(s){
  if(s.reduced || s.effects.magic===false || s.variant!=='D3')return 0;
  // Uneven spacing makes these passages feel like an occasional event instead of a looped blink.
  const t=((s.seconds%257)+257)%257;
  for(const [centre,radius] of [[19,3.2],[76,5.4],[158,4.5],[230,3.8]]){
    const distance=Math.abs(t-centre)/radius;
    if(distance<1)return Math.cos(Math.PI*.5*distance)**2;
  }
  return 0;
}
function paintWater(ctx,s){
  const sea=s.region==='sea';
  const clear=s.weather==='sunny'||!sea;
  const hour=s.time;
  const hue=hour==='evening'?'255,199,135':hour==='night'?'202,221,255':'233,255,255';
  const ink='rgb('+hue+')';
  ctx.save();clipWater(ctx,s.region);
  if(s.effects.water){
    deform(ctx,s,sea?seaStrips:lakeStrips,sea?7.8:4.4,sea?.92:.63);
    // Each passing swell raises an elongated crest and leaves a smaller wake.
    const fronts=sea?6:3;
    for(let i=0;i<fronts;i++){
      const t=fraction(s.seconds*(sea?.092:.045)+i/fronts);
      const x=sea?115+i*135:360+i*144;
      const y=(sea?524:565)+t*(sea?335:90);
      const alpha=s.opacity*(.16+.18*s.physical)*Math.sin(t*Math.PI)**2;
      const span=(sea?65:35)*(1+t);
      ctx.lineWidth=(sea?2.8:1.6)+t;ctx.strokeStyle=ink;ctx.globalAlpha=clamp(alpha);
      ctx.beginPath();ctx.moveTo(x-span,y);
      ctx.bezierCurveTo(x-span*.43,y-6,x+span*.13,y+8,x+span,y-3);ctx.stroke();
      if(sea)line(ctx,x+span*.14,y-8,span*.32,-.035,ink,alpha*.62,2);
    }
    if(sea){
      // Bubbles travel with the front only as the wave breaks in the shallow turquoise strip.
      for(let i=0;i<4;i++){
        const t=fraction(s.seconds*.115+i*.263),breakPoint=clamp((t-.46)*3.4)*clamp((1-t)*4.2);
        if(!breakPoint)continue;
        const x=222+i*154+Math.sin(t*TAU)*8,y=773+t*84;
        for(let j=0;j<5;j++){
          const phase=noise(i*5+j),r=1.7+phase*2.8;
          const a=s.opacity*breakPoint*(.39+.18*s.physical);
          ctx.strokeStyle='#f6fcff';ctx.lineWidth=1.6;ctx.globalAlpha=clamp(a);ctx.beginPath();
          ctx.ellipse(x+(j-2)*12,y+Math.sin(j*1.6)*4,r+t*1.7,r*.52,0,0,Math.PI*1.67);ctx.stroke();
        }
      }
    }else{
      // Widely spaced rings run across the reflection without passing through the reeds.
      [[343,559],[604,613],[712,541]].forEach(([x,y],i)=>{
        const t=fraction(s.seconds*(.078+i*.008)+i*.413);
        if(t>.78)return;
        const w=t/.78,shine=(.18+.30*s.magic)*s.opacity*Math.sin(w*Math.PI);
        ring(ctx,x,y,3+w*45,ink,shine);
        if(w>.22)ring(ctx,x,y,2+(w-.22)*35,ink,shine*.6);
      });
    }
    if(s.weather==='rain'&&sea){
      for(let i=0;i<12;i++){
        const t=fraction(s.seconds*.53+noise(i));
        ring(ctx,90+820*noise(i+32),458+386*noise(i+87),3+18*t,ink,s.opacity*.65*Math.sin(t*Math.PI));
      }
    }
    if(s.effects.light&&clear){
      const axis=sea?({morning:125,day:670,evening:762,night:648}[hour]):600;
      const burst=rare(s);
      for(let i=0;i<13;i++){
        const light=wave(s.seconds*1.63+i*2.73);
        const x=axis+Math.sin(i*4.65+s.seconds*.34)*(10+i*(sea?4:2.8));
        const y=(sea?377:495)+i*(sea?36:12)+Math.sin(s.seconds+i)*2;
        line(ctx,x,y,2+(3+i*.87)*light,-.045,ink,s.opacity*light*(.43+.30*s.magic),1.75);
        if(burst&&i%3===0)glow(ctx,x,y,35,7,hue,s.opacity*burst*light*.75);
      }
    }
  }
  ctx.restore();
  if(!sea&&s.effects.particles){
    const burst=rare(s),n=s.variant==='D1'?5:s.variant==='D2'?10:14;
    for(let i=0;i<n;i++){
      const t=s.seconds*.28+4*i;
      const x=156+694*noise(i)+Math.sin(t*.69)*20;
      const y=519+164*noise(i+36)+Math.cos(t)*9;
      const a=s.opacity*s.magic*(.15+.73*wave(t*2.6));
      glow(ctx,x,y,8+burst*9,9+burst*11,'195,230,255',a);
      line(ctx,x,y,1.8+2*burst,0,'#fff9e8',a);
    }
  }
}

function illumination(ctx,s,points,city){
  if(!s.effects.light || !['evening','night'].includes(s.time))return;
  points.forEach(([u,v],i)=>{
    const a=(.23+.16*wave(s.seconds*.52+i*.9))*s.opacity*(.44*s.physical+.77*s.magic);
    glow(ctx,u*1000,v*1500,city?32:24,city?38:21,'255,183,75',a);
    if(!city)glow(ctx,u*1000-3,v*1500+14,25,8,'255,206,123',a*.60);
    if(city && s.magic>.35){
      // Amber storefronts alternate with the cooler distant glazing, retaining the light source.
      const glass=i===3||i===4?'181,198,255':'255,158,91';
      const shimmer=wave(s.seconds*.79+i*1.87);
      glow(ctx,u*1000,v*1500,14+s.magic*9,19+s.magic*14,glass,s.opacity*s.magic*(.26+.26*shimmer));
      line(ctx,u*1000,v*1500,2.2+shimmer*2.4,0,'#ffebcc',s.opacity*s.magic*shimmer*.71);
    }
  });
}

// All distances here are in the same complete painting coordinates as the water and lamps.
// Regions keep their own emission budgets and call this in place of their legacy fall pass.
export function drawWeatherField(ctx,s,kind,budget,glitter=0) {
  const snow=kind==='snow', village=s.region==='snow';
  const options={region:s.region,front:s.fallFront,gusts:s.effects.gusts!==false,depth:s.effects.depth!==false};
  const count=fallCount(budget,s.fall);
  const nightWindow=village && (s.time==='night'||s.time==='evening');
  const tint=snow?'#f7fbff':s.region==='sea'?'#dceaf6':'#deecff';
  ctx.save();
  ctx.lineCap='round';
  for(let i=0;i<count;i++){
    const p=sampleFall(kind,i,s.seconds,s.fall,options);
    const x=p.x*1000,y=p.y*1500;
    const alpha=s.opacity*p.alpha*(snow?.78:.53);
    if(alpha<.008)continue;
    ctx.globalAlpha=clamp(alpha);
    ctx.beginPath();
    if(snow){
      const r=(village?3.1:2.35)*p.radius;
      // Warmth is confined to the small volume immediately outside a lit pane.
      const nearLamp=nightWindow && windowPanes.some(([u,v])=>Math.abs(p.x-u)<.035&&Math.abs(p.y-v)<.029);
      ctx.fillStyle=nearLamp?'#fff0d8':tint;
      ctx.ellipse(x,y,r,r*(.84+.09*p.depth),p.rotation,0,TAU);
      ctx.fill();
      if(glitter>.02&&i%7===0)glow(ctx,x,y,r*3,r*3,'216,235,255',alpha*glitter);
    }else{
      const length=16*p.length;
      ctx.strokeStyle=tint;
      ctx.lineWidth=1.45*p.radius;
      ctx.moveTo(x,y);
      ctx.lineTo(x+length*p.dx*1000/1500,y+length);
      ctx.stroke();
    }
  }
  ctx.restore();
}

function paintSnow(ctx,s){
  illumination(ctx,s,windowPanes,false);
  if(s.effects.light && s.weather!=='rain'){
    const winter=s.season==='winter'?1:.62;
    const path=[[115,824],[211,896],[352,958],[542,1032],[703,1110],[843,1198]];
    path.forEach(([x,y],i)=>{
      const sparkle=wave(s.seconds*.86+i*2.14)**4;
      const brightness=s.opacity*s.magic*winter*(s.weather==='cloudy'?.56:1);
      glow(ctx,x,y,65,8,'203,226,255',brightness*(.15+.17*sparkle));
      line(ctx,x,y,2+6*sparkle,-.15,'#fffef2',brightness*sparkle);
      line(ctx,x,y,1+4*sparkle,1.45,'#fffef2',brightness*sparkle);
    });
  }
  if(!s.effects.particles || s.reduced || s.weather==='rain')return;
  const falling=s.weather==='snow',drift=s.season==='winter'&&s.weather==='sunny';
  if(!falling&&!drift)return;
  // Distant grains pass behind the near, slower-curving powder. Clear winter
  // skies lift snow from the bank; falling flakes require snow weather.
  const budget=falling?(s.variant==='D1'?14:s.variant==='D2'?30:40):9;
  if(s.fallPlus && falling){
    drawWeatherField(ctx,s,'snow',budget,rare(s));
    return;
  }
  const count=s.fallPlus?fallCount(budget,s.fall):budget;
  const speed=s.fallPlus?(s.fall?.speed??1):1,wind=s.fallPlus?(s.fall?.wind??1):1;
  for(let i=0;i<count;i++){
    const depth=noise(i+71),phase=fraction(s.seconds*speed*(.047+.028*depth)+noise(i));
    const x=noise(i+44)*990+(16+30*depth)*Math.sin(TAU*phase+i)*wind+s.gust*44*phase*wind;
    const y=falling?phase*1480:1020+noise(i+34)*213-Math.sin(Math.PI*phase)*18;
    const rad=(1.3+3.4*depth)*(s.fallPlus?(s.fall?.size??1):1),alpha=s.opacity*clamp(s.physical)*Math.sin(phase*Math.PI)*(.38+.5*depth);
    ctx.fillStyle='#f7fbff';ctx.globalAlpha=alpha;ctx.beginPath();ctx.ellipse(x,y,rad,rad*.83,-.3,0,TAU);ctx.fill();
    if(i%7===0 && rare(s)>.02)glow(ctx,x,y,rad*3,rad*3,'216,235,255',alpha*rare(s));
  }
}

function paintCity(ctx,s){
  const night=s.time==='night',evening=s.time==='evening',rain=s.weather==='rain';
  illumination(ctx,s,shopWindows,true);
  if(s.effects.water&&rain){
    deform(ctx,s,wetStones,2.5,.76);
    const hue=evening||night?'255,199,132':'193,222,244';
    wetStones.forEach(([x,y,w,h],i)=>{
      const a=s.opacity*(.22+.17*wave(s.seconds*.9+i))*s.physical;
      glow(ctx,x+w/2,y+h/2,w*.52,h*.66,hue,a);
      if(s.effects.light&&(evening||night)){
        // Narrow broken strokes follow the vertical lights already painted on the wet tiles.
        for(let j=0;j<6;j++){
          const u=(j+.5)/6;
          const xj=x+w*(.47+.14*Math.sin(j*4.14+i));
          const flash=wave(s.seconds*.9+j+i);
          line(ctx,xj,y+h*u,2.7+5*flash,-.12,'rgb('+hue+')',s.opacity*s.magic*(.17+.34*flash),1.5);
        }
      }
      for(let k=0;k<3;k++){
        const phase=fraction(s.seconds*.44+noise(i*3+k));
        ring(ctx,x+w*noise(i*7+k+15),y+h*noise(k*7+i+4),2+12*phase,'rgb('+hue+')',s.opacity*.54*Math.sin(phase*Math.PI));
      }
    });
  }
  if(s.effects.light&&!night&&!evening&&s.weather==='sunny'){
    // Sun-facing glass panels above the shopfronts. The middle skyline stays still.
    [[116,215],[190,373],[917,395]].forEach(([x,y],i)=>{
      glow(ctx,x,y,8,19,'255,238,185',s.opacity*(.12+.19*wave(s.seconds*.45+i)));
    });
  }
  if(s.effects.particles&&rain&&!s.reduced){
    if(s.fallPlus)drawWeatherField(ctx,s,'rain',19);
    else for(let i=0;i<19;i++){
      const phase=fraction(s.seconds*(.56+.08*noise(i))+noise(i+78));
      line(ctx,1000*noise(i+30)+phase*34,phase*1440,6+noise(i+16)*5,1.41,'#deecff',s.opacity*(.25+.15*noise(i))*Math.sin(phase*Math.PI));
    }
  }
  if(s.effects.light&&night&&rare(s)){
    // Reflected lamp halo travels across the existing wet pavement.
    wetStones.forEach(([x,y,w,h],i)=>glow(ctx,x+w*.5,y+h*.55,w*.3,h*.37,'255,216,158',s.opacity*rare(s)*(.24+.25*wave(s.seconds*.71+i))));
  }
}
function precipitation(ctx,s){
  if(!s.effects.particles || s.reduced || s.region==='memory_lake')return;
  const rain=s.weather==='rain', snow=s.weather==='snow';
  // Snow-country snowfall and city rain have their own depth/lamplight treatment.
  if((!rain&&!snow)||(s.region==='snow'&&snow)||(s.region==='city'&&rain))return;
  const count=rain?17:15;
  if(s.fallPlus){
    drawWeatherField(ctx,s,rain?'rain':'snow',count);
    return;
  }
  for(let i=0;i<count;i++){
    const depth=noise(i+86),phase=fraction(s.seconds*(rain?.48+depth*.11:.058+depth*.024)+noise(i+7));
    const x=1000*noise(i+37)+(rain?phase*30:Math.sin(TAU*phase+i)*17)+phase*s.gust*28;
    const y=phase*1460,alpha=s.opacity*(.21+.39*depth)*Math.sin(phase*Math.PI);
    if(rain)line(ctx,x,y,5+depth*5,1.37,'#deedfa',alpha);
    else{ctx.globalAlpha=alpha;ctx.fillStyle='#f9faff';ctx.beginPath();ctx.arc(x,y,1.2+2.2*depth,0,TAU);ctx.fill();}
  }
}
export function drawFullRegion(ctx,s){
  if(!(s.opacity>0))return;
  if(s.effects.magic===false)s={...s,magic:0};
  ctx.save();
  if(s.region==='sea'||s.region==='memory_lake')paintWater(ctx,s);
  else if(s.region==='city')paintCity(ctx,s);
  else if(s.region==='snow')paintSnow(ctx,s);
  precipitation(ctx,s);
  ctx.restore();
}
