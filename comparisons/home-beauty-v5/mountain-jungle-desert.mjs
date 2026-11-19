// Coordinates in the 1000 × 1500 painting space, before the production cover/contain transform.
const TAU = 2 * Math.PI;
const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
const fract = x => x - Math.floor(x);
const seed = i => fract(Math.sin(412.81 * i + 4.63) * 9328.715);
const phase = (t, period, shift = 0) => fract(t / period + shift);
const envelope = z => Math.sin(Math.PI * z) ** 1.5;
const strengthOf = x => clamp(Number.isFinite(x) ? x : 1, 0, 2);

// The pressure wave sweeps from left to right. Long fronts drive the lee mist and
// dunes; short oscillations drive individual fronds after the front has passed.
export function terrainBreeze(t, x) {
  const local = t - x * 3.7;
  const front = Math.max(0, Math.sin(local * .179 + .8 * Math.sin(local * .051))) ** 3;
  return .40 * Math.sin(local * .62) + .18 * Math.sin(local * 1.09 + x) + 1.12 * front;
}

const brushes = new Map();
function haze(ctx, x, y, rx, ry, angle, color, alpha) {
  if (alpha < .002) return;
  if (!brushes.has(color)) {
    const el = document.createElement('canvas');el.width = el.height = 64;
    const c = el.getContext('2d'), g = c.createRadialGradient(32,32,0,32,32,32);
    g.addColorStop(0,'rgba('+color+',1)');g.addColorStop(.43,'rgba('+color+',.66)');g.addColorStop(1,'rgba('+color+',0)');
    c.fillStyle = g;c.fillRect(0,0,64,64);brushes.set(color,el);
  }
  ctx.save();ctx.globalAlpha = Math.min(1,alpha);ctx.translate(x,y);ctx.rotate(angle);
  ctx.drawImage(brushes.get(color),-rx,-ry,2*rx,2*ry);ctx.restore();
}
function clipped(ctx, points) {
  ctx.beginPath();ctx.moveTo(...points[0]);
  for (let i=1;i<points.length;i++) ctx.lineTo(...points[i]);
  ctx.closePath();ctx.clip();
}

// Local source-image crops. The soft transparent edge prevents a rectangular
// seam when a leaf flexes or heat refracts a small section of the far dune.
const cache = new WeakMap();
function sampleParts(image, specs) {
  if (cache.has(image)) return cache.get(image);
  const iw=image.naturalWidth||image.width, ih=image.naturalHeight||image.height;
  if (!iw||!ih) return [];
  const result=specs.map(([x,y,w,h])=>{
    const tile=document.createElement('canvas');
    tile.width=Math.ceil(w*.72);tile.height=Math.ceil(h*.72);
    const c=tile.getContext('2d');
    c.drawImage(image,(x-w/2)*iw/1000,(y-h/2)*ih/1500,w*iw/1000,h*ih/1500,0,0,tile.width,tile.height);
    c.globalCompositeOperation='destination-in';c.scale(tile.width/2,tile.height/2);
    const g=c.createRadialGradient(1,1,0,1,1,1);
    g.addColorStop(0,'white');g.addColorStop(.61,'white');g.addColorStop(1,'transparent');
    c.fillStyle=g;c.fillRect(0,0,2,2);return tile;
  });
  cache.set(image,result);return result;
}
const skyClouds = [[157,116,248,91],[322,171,136,80],[841,200,199,73]];
const leeBasin = [[619,410],[673,424],[729,385],[812,377],[960,304],[1000,309],[1000,516],
  [928,539],[878,520],[795,521],[722,479],[653,463]];
const peakFaces = [
  [[537,251],[603,162],[624,222],[643,248],[608,235],[584,267]],
  [[142,308],[204,257],[238,286],[225,316],[197,296],[164,330]],
  [[692,290],[731,250],[777,309],[751,305],[737,285],[719,314]]
];
function mountain(ctx,s) {
  const {t,alpha,energy,effects,night,weather}=s;
  if (effects.motion && !s.reduced && !night && s.image) {
    const tiles=sampleParts(s.image,skyClouds);
    skyClouds.forEach(([x,y,w,h],i)=>{
      if (!tiles[i]) return;
      const drift=Math.sin(t*(.072+i*.017)+i+.18*t/(80+t))*energy;
      ctx.globalAlpha=alpha*.89;ctx.drawImage(tiles[i],x-w/2+drift*12,y-h/2+drift*(2+i),w,h);
    });
  }
  if (effects.motion || effects.light) {
    ctx.save();clipped(ctx,leeBasin);
    const damp=weather==='rain'||weather==='cloudy';
    const fog=night?'153,184,221':s.time==='evening'?'255,208,170':'224,239,238';
    for (let i=0;i<7;i++) {
      const travel=phase(effects.motion?t:0,31+i*2.17,i*.213);
      const y=444+i%3*20-23*travel;
      haze(ctx,650+350*travel,y,(48+15*(i%3))*(.80+.20*energy),8+6*(i%2),-.12,fog,alpha*(damp?.43:.24)*(.74+.26*energy)*envelope(travel));
    }
    ctx.restore();
  }
  if (effects.light) {
    const color=night?'190,212,248':s.time==='evening'?'255,177,111':'255,242,200';
    for (let i=0;i<peakFaces.length;i++) {
      const facet=peakFaces[i],height=facet[1][1];
      ctx.save();clipped(ctx,facet);
      const pulse=.55+.23*Math.sin(t*.29-.8*i)+.16*Math.cos(t*.13+i);
      haze(ctx,facet[1][0]+8,height+51,77,76,0,color,alpha*pulse*(weather==='sunny'?.60:.22)*(.76+.24*energy));
      ctx.restore();
    }
  }
  if (effects.particles && !s.reduced && (weather==='snow'||weather==='rain')) {
    const snow=weather==='snow';ctx.globalAlpha=alpha*(snow?.66:.43);
    ctx.fillStyle='#f3fbff';ctx.strokeStyle='#e1edf6';ctx.lineWidth=1.5;
    for(let i=0;i<21;i++){
      const z=.36+.64*seed(i+99),f=phase(t,snow?9/z:1.6/z,seed(i+42));
      const x=80+810*seed(i+29)+s.breeze*8*z+z*14*Math.sin(f*TAU+i),y=287+f*680;
      ctx.beginPath();
      if(snow){ctx.arc(x,y,1.5+z*1.5,0,TAU);ctx.fill();}
      else {ctx.moveTo(x,y);ctx.lineTo(x+3,y+11*z);ctx.stroke();}
    }
  }
}

const fronds=[
  // x, y, size, angle pivot relative to centre, depth.
  [342,116,242,194,-.43,-.42,1],[169,227,99,96,-.32,-.4,.78],
  [357,336,138,110,-.05,.35,.58],[510,411,127,102,.04,.4,.40],
  [709,407,141,111,.03,.36,.56],[910,312,124,105,.13,.43,.76],
  [146,511,152,182,-.32,.39,.83],[914,754,129,129,.32,.4,.81],
  [85,1220,155,212,-.37,.34,1],[835,1291,157,142,.32,.28,1]
];
// The crown opening and beam slant differ most at sunset, where the shaft is flatter.
const openings={
  morning:[728,105,464,667],day:[642,66,498,636],
  evening:[789,156,365,521],night:[781,100,502,633]
};
const dropTips=[[413,195,1],[239,286,.74],[411,357,.59],[748,447,.56],[912,342,.75],[177,590,.82],[855,792,.8]];
function jungle(ctx,s) {
  const {t,alpha,energy,effects,night,weather}=s,rain=weather==='rain';
  if (s.image && !s.reduced && effects.motion && effects.canopy) {
    const tiles=sampleParts(s.image,fronds);
    fronds.forEach(([x,y,w,h,px,py,z],i)=>{
      if(!tiles[i])return;
      const wind=terrainBreeze(t-i*.14,x/1000);
      // Change direction after a raindrop hits, with a short damped rebound.
      const beat=rain?phase(t,3.3+.6*z,seed(i+9)):.99;
      const rebound=rain?Math.exp(-beat*13)*Math.sin(beat*26):0;
      const bend=energy*(.67+z*.35)*(wind+.42*rebound);
      ctx.save();ctx.translate(x+w*px,y+h*py);ctx.rotate(.039*bend);
      ctx.transform(1,.009*bend,-.022*bend,1,0,0);ctx.globalAlpha=alpha;
      ctx.drawImage(tiles[i],-w*(px+.5),-h*(py+.5),w,h);ctx.restore();
    });
  }
  if (effects.light && effects.shafts && (weather==='sunny'||weather==='cloudy')) {
    const [x,y,x2,y2]=openings[s.time]||openings.day,dx=x2-x,dy=y2-y;
    const angle=Math.atan2(dy,dx),len=Math.hypot(dx,dy);
    const color=night?'173,222,244':s.time==='evening'?'255,186,106':'247,244,180';
    for(let i=0;i<3;i++){
      const breath=.74+.19*Math.sin(t*.33+i*1.8)+.07*s.breeze;
      haze(ctx,x+dx*.53+i*28,y+dy*.53+i*11,len*.54,13+i*6,angle,color,alpha*breath*(weather==='cloudy'?.12:.31));
    }
  }
  if(effects.motion||effects.water) {
    // Steam gathers in the open channel; even the farthest end remains above the water.
    const humidity=rain?.32:.18;
    for(let i=0;i<4;i++){
      const f=phase(effects.motion?t:0,22+i*3,seed(i+5));
      haze(ctx,368+267*f,720-49*f+13*(i%2),44+10*i,8+i*2,-.09,
        night?'157,203,202':'206,236,211',alpha*humidity*envelope(f));
    }
  }
  if(rain && effects.particles && !s.reduced) {
    // Rain crosses the open background first; nearby tips release larger drops later.
    ctx.strokeStyle='#c8e9e9';ctx.lineCap='round';
    for(let i=0;i<14;i++){
      const f=phase(t,1.24+.48*seed(i+61),seed(i+31));
      const x=338+382*seed(i+75)+f*11,y=312+367*f;
      ctx.lineWidth=1.2;ctx.globalAlpha=alpha*.48*envelope(f);
      ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+1.7,y+11);ctx.stroke();
    }
    ctx.strokeStyle='#d5f1ed';
    dropTips.forEach(([x,y,z],i)=>{
      const cycle=phase(t,3.3+.6*z,seed(i+9));
      // First water pools on the tip, then drops. The release follows the flex.
      if(cycle<.12 || cycle>.86)return;
      const f=(cycle-.12)/.74, xx=x+3*z+f*f*(5+4*s.breeze), yy=y+f*f*(101+43*z);
      ctx.globalAlpha=alpha*.90*Math.min(1,f*9,(1-f)*8);ctx.lineWidth=1.4+z;
      ctx.beginPath();ctx.moveTo(xx,yy);ctx.lineTo(xx+1,yy+2+f*7);ctx.stroke();
    });
  } else if (effects.particles && effects.magic && !s.reduced && s.season==='summer' && night && weather==='sunny') {
    const pulse=.30+.70*Math.max(0,Math.cos(t*.25))**5;
    for(let i=0;i<7;i++){
      const x=329+343*seed(i+3)+9*Math.sin(t*.56+i),y=635+113*seed(i+26)+8*Math.cos(t*.43+i);
      haze(ctx,x,y,7,8,0,'214,247,155',alpha*pulse*(.6+.4*Math.sin(t*.96+i*2)));
    }
  }
}

const heatPatches=[[230,432,129,64],[410,482,163,61],[744,477,143,59],[568,504,129,53]];
// The three leeward crests are below the far waterline in every adopted time variant.
const dunes=[
  [[133,438],[205,397],[245,407],[300,437],[350,452]],
  [[283,533],[385,487],[422,478],[458,488],[560,515]],
  [[648,590],[747,557],[827,515],[906,480],[991,447]]
];
const stars=[[285,19],[471,51],[548,47],[256,82],[322,117],[451,122],[651,128],[749,138],[871,117],[293,207],[424,162],[755,204],[838,244]];
function crestPoint(line,f) {
  const scaled=clamp(f,0,.9999)*(line.length-1);
  const i=Math.floor(scaled),z=scaled-i,a=line[i],b=line[i+1];
  return [a[0]+(b[0]-a[0])*z,a[1]+(b[1]-a[1])*z];
}
function desert(ctx,s) {
  const {t,alpha,energy,effects,night,weather}=s;
  const dry=weather==='sunny'||weather==='cloudy';
  if(effects.motion && !s.reduced && s.image && weather==='sunny' && s.time==='day' && s.season!=='winter') {
    const tiles=sampleParts(s.image,heatPatches);
    heatPatches.forEach(([x,y,w,h],i)=>{
      if(!tiles[i])return;
      const shimmer=energy*(.70*Math.sin(t*2.75-i)+.30*Math.sin(t*4.6+i));
      ctx.globalAlpha=alpha*(s.season==='summer'?.82:.59);
      ctx.drawImage(tiles[i],x-w/2+shimmer*2.8,y-h/2+1.1*shimmer,w,h);
    });
  }
  if (!dry && (effects.motion||effects.light)) {
    // Falling snow is excluded from this arid biome. A cool bank of haze
    // crosses the distant headland under either kind of heavy weather.
    for(let i=0;i<4;i++) {
      const f=phase(effects.motion?t:0,28+i*2.73,seed(i+44));
      haze(ctx,56+898*f,306+11*(i%2),81+energy*18,5+i*2,0,
        night?'127,153,186':'189,203,207',alpha*(.24+.09*energy)*envelope(f));
    }
  }
  if (weather==='rain' && effects.particles && !s.reduced) {
    ctx.strokeStyle='#e0e7ea';ctx.lineWidth=1.2;
    for(let i=0;i<11;i++) {
      const f=phase(t,1.03+.32*seed(i+26),seed(i+17));
      const x=134+707*seed(i+67)+f*12,y=216+199*f;
      ctx.globalAlpha=alpha*.45*envelope(f);ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+2,y+9);ctx.stroke();
    }
  }
  const wind=Math.max(.16,.61+.42*s.breeze);
  if(effects.motion && dry && !s.reduced) {
    const color=night?'165,194,219':s.time==='evening'?'255,200,124':'249,227,183';
    for(let k=0;k<dunes.length;k++)for(let j=0;j<4;j++){
      const f=phase(t,6.3+1.9*k,seed(k*13+j+9)), [x,y]=crestPoint(dunes[k],f);
      haze(ctx,x+11*f,y-3-5*Math.sin(Math.PI*f),23+32*f,3.3+5*f,-.09,
        color,alpha*(night?.21:.45)*wind*envelope(f));
    }
  }
  if(effects.particles && dry && !s.reduced) {
    ctx.strokeStyle=night?'#d6e2f0':s.time==='evening'?'#ffe0a2':'#fff1c9';ctx.lineCap='round';
    for(let i=0;i<36;i++){
      const line=dunes[i%3],f=phase(t,2.1+2.4*seed(i+29),seed(i+10));
      const [x,y]=crestPoint(line,seed(i+69)*.68+f*.30);
      const lift=(4+18*seed(i+26))*wind*energy*Math.sin(Math.PI*f);
      ctx.globalAlpha=alpha*(night?.43:.84)*envelope(f);ctx.lineWidth=.9+seed(i)*1.4;
      ctx.beginPath();ctx.moveTo(x,y-lift);ctx.lineTo(x+2+3*f,y-lift-.45);ctx.stroke();
    }
  }
  if(effects.light && night && dry) {
    for(const [i,[x,y]] of stars.entries()){
      const pulse=(.5+.5*Math.sin(t*(.63+.47*seed(i))+i*1.61))**3;
      const a=pulse*alpha*(weather==='cloudy'?.26:.80);
      haze(ctx,x,y,3+3*pulse,4+3*pulse,0,'215,234,255',a);
      if(effects.magic && pulse>.92){haze(ctx,x,y,7,1,0,'235,242,255',a*.62);haze(ctx,x,y,1,7,0,'235,242,255',a*.62);}
    }
  }
}
const renderers = {mountain,jungle,desert};
export function drawMountainJungleDesert(ctx,state) {
  const draw=renderers[state.region],energy=strengthOf(state.strength);
  const alpha=clamp(state.opacity??1,0,1)*Math.min(1,energy);
  if(!draw||!alpha||!(state.width>0&&state.height>0))return;
  const effects={motion:true,water:true,light:true,particles:true,magic:true,canopy:true,shafts:true,...state.effects};
  const t=state.reduced?0:Math.max(0,Number.isFinite(state.seconds)?state.seconds:0);
  const s={...state,effects,t,alpha,energy,breeze:terrainBreeze(t,.48),night:state.time==='night'};
  ctx.save();
  try {ctx.scale(state.width/1000,state.height/1500);draw(ctx,s);}
  finally {ctx.restore();}
}
