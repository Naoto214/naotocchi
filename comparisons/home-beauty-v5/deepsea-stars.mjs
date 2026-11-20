// Coordinates follow the full 2:3 painting. The compositor positions and clips it.
const TAU = Math.PI * 2;
const clamp = (value,low,high) => Math.min(high,Math.max(low,value));
const unit = value => value - Math.floor(value);
const noise = index => unit(Math.sin(index * 37.719 + 4.197) * 17939.87);

const deepColors = {
  morning: {beam:'116,246,219', bed:'#b3ffec', life:'#9cfbf1', sun:1.02},
  day:     {beam:'105,226,255', bed:'#b1f4ff', life:'#a2efff', sun:1.12},
  evening: {beam:'184,159,241', bed:'#ded1fc', life:'#e0bcff', sun:.69},
  night:   {beam:'114,152,241', bed:'#b6d2ff', life:'#9ce8ff', sun:.44},
};
const skyColors = {
  morning: {galaxy:'255,192,198', veil:'185,185,255', stars:'#fff2d6', power:.82},
  day:     {galaxy:'254,194,178', veil:'119,235,255', stars:'#e1fbff', power:.75},
  evening: {galaxy:'255,165,119', veil:'219,139,175', stars:'#ffe4bd', power:.94},
  night:   {galaxy:'255,192,168', veil:'141,202,255', stars:'#e9f7ff', power:1.12},
};

// Positions of isolated stellar highlights in the four source files, away from
// the planets' edges, the temple roof, and the central floor inlay.
const skyAnchors = {
  morning:[[884,30],[971,36],[450,30],[611,16],[817,47],[497,75],[243,11],[735,22],[508,8],[293,37],[612,56],[392,130],[391,30],[311,278],[512,293],[657,293]],
  day:[[611,16],[259,23],[884,30],[817,47],[508,8],[624,65],[291,76],[970,36],[675,12],[417,198],[745,91],[562,21],[376,270],[512,293],[652,270]],
  evening:[[937,16],[259,23],[393,229],[306,8],[818,47],[461,49],[327,118],[328,79],[612,37],[331,177],[63,37],[887,16],[297,279],[514,271],[657,293]],
  night:[[327,118],[637,35],[288,44],[857,22],[431,115],[372,129],[400,183],[948,21],[445,251],[990,61],[592,18],[449,39],[376,271],[513,294],[678,269]],
};

function glow(ctx,x,y,rx,ry,angle,rgb,alpha) {
  if (alpha < .005) return;
  ctx.save();
  ctx.translate(x,y);
  ctx.rotate(angle);
  ctx.scale(rx,ry);
  const light = ctx.createRadialGradient(0,0,0,0,0,1);
  light.addColorStop(0,'rgba('+rgb+',1)');
  light.addColorStop(.42,'rgba('+rgb+',.57)');
  light.addColorStop(1,'rgba('+rgb+',0)');
  ctx.fillStyle = light;
  ctx.globalAlpha = Math.min(1,alpha);
  ctx.fillRect(-1,-1,2,2);
  ctx.restore();
}

function point(ctx,x,y,r,alpha,color) {
  if (alpha < .013) return;
  ctx.fillStyle = color;
  ctx.globalAlpha = Math.min(1,alpha);
  ctx.beginPath();
  ctx.arc(x,y,r,0,TAU);
  ctx.fill();
}

const beams = [
  [719,-70,503,537,57],[661,-65,449,421,33],
  [790,-82,632,529,55],[830,-53,712,362,24],
];

function underwaterLight(ctx,s,color) {
  const weather = s.weather==='sunny' ? 1 : s.weather==='cloudy' ? .76 : .56;
  const intensity = s.alpha * weather * color.sun;
  for (const [i,[x,y,endX,endY,spread]] of beams.entries()) {
    const phase = s.t*(.19+i*.021)+i*2.13;
    const toX = endX + 24*Math.sin(phase);
    const dx = toX-x, dy = endY-y;
    const pulse = .72 + .28*Math.sin(phase+.55);
    glow(ctx,x+dx*.45,y+dy*.45,Math.hypot(dx,dy)*.57,spread*(.85+.18*pulse),
      Math.atan2(dy,dx),color.beam,intensity*(.16+.13*pulse));
  }
  if (!s.water) return;
  // Broken, nearly horizontal meshes follow the sandy basin. Outer rock shelves
  // remain uncovered. Near caustics are broader and turn over more slowly.
  ctx.strokeStyle = color.bed;
  ctx.lineCap = 'round';
  for (let row=0; row<4; row++) {
    const spacing = 29+8*row;
    const drift = .34*s.t + row*1.44;
    const y = [632,718,851,1045][row];
    const center = [577,520,480,574][row];
    for (let j=-2; j<=2; j++) {
      const phase = drift+j*.91;
      const reach = spacing*(.58+.13*Math.sin(phase*.65));
      const x = center+j*spacing+Math.sin(phase*.67)*7;
      const yy = y+(j*spacing*.09)+5*Math.cos(phase);
      const bright = .5+.5*Math.sin(phase);
      ctx.globalAlpha = Math.min(.58,intensity*(.06+.29*bright*bright));
      ctx.lineWidth = 1.7+row*.46;
      ctx.beginPath();
      ctx.moveTo(x-reach,yy+2.2);
      ctx.bezierCurveTo(x-reach*.4,yy-5,x,yy+4,x+reach,yy-1.7);
      if ((j+row)%2===0) {
        ctx.moveTo(x+2,yy+.2);
        ctx.quadraticCurveTo(x+reach*.47,yy+4,x+reach*.75,yy+7);
      }
      ctx.stroke();
    }
  }
}

const vents = [
  [101,563,240,-19],[872,596,235,-21],[735,578,170,18],[246,397,160,11],
];
function underwaterLife(ctx,s,color) {
  const school = .5+.5*Math.cos(TAU*(s.t-32)/79);
  const season = {spring:1.1,summer:1.19,autumn:.94,winter:.82}[s.season] ?? 1;
  for (let i=0; i<26; i++) {
    const far = i%3===0;
    const stream = unit(noise(i+1)+s.t*(far?.009:.016));
    const z = noise(i+61);
    const x = 280+noise(i+6)*440+29*Math.sin(TAU*stream+.2*i);
    const y = 550-stream*(230+108*z)+18*Math.sin(stream*TAU*2+i);
    const fade = Math.sin(Math.PI*stream);
    const pulse = (.55+.45*Math.sin(s.t*.75+i))**2;
    const alpha = s.alpha*season*fade*(.18+.49*pulse)*(.7+.3*school);
    point(ctx,x,y,far?1.35:2.1+.75*z,alpha,color.life);
    if (s.magic && i%7===0 && !far) glow(ctx,x,y,9,6,-.17,'138,224,245',alpha*.55);
  }
  if (!s.water) return;
  for (const [i,[ventX,ventY,height,current]] of vents.entries()) {
    for (let j=0;j<3;j++) {
      const rise = unit(s.t*(.037+.004*i)+j*.31+noise(i+23));
      const envelope = Math.sin(Math.PI*rise);
      const r = (2.1+i*.47+j*.59)*(1+.5*rise);
      const x = ventX+current*rise+(.8+3.5*rise)*Math.sin(rise*TAU*1.7+j);
      const y = ventY-height*rise;
      ctx.globalAlpha = Math.min(.85,s.alpha*envelope*(.50+.06*j));
      ctx.strokeStyle = color.bed;
      ctx.lineWidth = 1.3;
      ctx.beginPath();
      ctx.ellipse(x,y,r*.87,r*1.08,.28,0,TAU);
      ctx.stroke();
      point(ctx,x-r*.37,y-r*.52,Math.max(.75,r*.2),s.alpha*envelope*.9,'#e7ffff');
    }
  }
}

// The bright core is near (800,190) in all four paintings. The separate
// Milky Way knots run from top centre towards it, above the island silhouettes.
const knots = [[489,27,55,19],[538,104,62,18],[605,187,56,21],[676,248,51,17]];
function galaxyLight(ctx,s,color) {
  const air = s.weather==='sunny'?1:s.weather==='cloudy'?.86:.73;
  const amplitude = s.alpha*color.power*air;
  for (const [i,[x,y,w,h]] of knots.entries()) {
    const pulse = .49+.42*Math.sin(s.t*.18-i*1.16)+.09*Math.cos(s.t*.49+i);
    glow(ctx,x,y,w,h,.86,color.veil,amplitude*(.11+.29*pulse));
  }
  const breath = .5+.5*Math.sin(s.t*.14+.9);
  glow(ctx,794,191,71,26,-.65,color.galaxy,amplitude*(.12+.24*breath));
  glow(ctx,801,189,22,10,-.65,'255,222,172',amplitude*(.13+.19*breath));
}

function starField(ctx,s,color) {
  const stars = skyAnchors[s.time] ?? skyAnchors.day;
  const tint = s.season==='winter'?'#d2edff':color.stars;
  for (const [i,[x,y]] of stars.entries()) {
    const phase = s.t*(.30+.23*noise(i+4))+i*2.3;
    const pulse = (.5+.5*Math.sin(phase))**1.7;
    const alpha = s.alpha*color.power*(.22+.74*pulse);
    point(ctx,x,y,1.6+1.35*pulse,alpha,tint);
    if (pulse<.45) continue;
    const r = (2.7+4*pulse)*(.7+.4*noise(i+44));
    ctx.strokeStyle = tint;
    ctx.lineWidth = 1.25;
    ctx.globalAlpha = Math.min(.8,alpha*.71);
    ctx.beginPath();
    ctx.moveTo(x-r,y); ctx.lineTo(x+r,y);
    ctx.moveTo(x,y-r*1.30); ctx.lineTo(x,y+r*1.30);
    ctx.stroke();
  }
}

const meteorPasses = [[59.15,1.9,336,274,265,-76],[178.9,1.85,673,178,-226,98]];
function meteor(ctx,s,color) {
  const clock = s.t%239;
  for (const [start,duration,x,y,dx,dy] of meteorPasses) {
    const p = (clock-start)/duration;
    if (p<=0 || p>=1) continue;
    const headX = x+dx*p, headY = y+dy*p;
    const alpha = s.alpha*.82*Math.sin(p*Math.PI);
    const tail = .235*Math.min(1,5*p);
    for (let j=0;j<4;j++) {
      ctx.strokeStyle = color.stars;
      ctx.lineWidth = 2.8-j*.43;
      ctx.globalAlpha = Math.min(1,alpha*(1-j*.22));
      ctx.beginPath();
      ctx.moveTo(headX-dx*tail*j/4,headY-dy*tail*j/4);
      ctx.lineTo(headX-dx*tail*(j+1)/4,headY-dy*tail*(j+1)/4);
      ctx.stroke();
    }
    glow(ctx,headX,headY,8,5,Math.atan2(dy,dx),color.galaxy,alpha*.65);
    point(ctx,headX,headY,2.1,alpha,'#ffffff');
  }
}

export function drawDeepseaStars(ctx,state) {
  if (state.variant!=='E3' || !['deepsea','star_stop'].includes(state.region) || !(state.width>0 && state.height>0)) return;
  const strength = clamp(Number.isFinite(state.strength)?state.strength:1,0,2);
  const alpha = clamp(state.opacity??1,0,1)*Math.min(strength,1)*(1+.45*Math.max(0,strength-1));
  if (!alpha) return;
  const effects = state.effects ?? {};
  const animate = !state.reduced && effects.motion!==false;
  const s = {...state,t:animate?(state.seconds??0):0,alpha,water:effects.water!==false,magic:effects.magic!==false};
  ctx.save();
  try {
    ctx.scale(state.width/1000,state.height/1500);
    if (state.region==='deepsea') {
      const color = deepColors[state.time] ?? deepColors.day;
      if (effects.light!==false) underwaterLight(ctx,s,color);
      if (effects.particles!==false && !state.reduced) underwaterLife(ctx,s,color);
    } else {
      const color = skyColors[state.time] ?? skyColors.day;
      if (effects.light!==false) galaxyLight(ctx,s,color);
      if (effects.particles!==false) starField(ctx,s,color);
      if (s.magic && animate) meteor(ctx,s,color);
    }
  } finally {
    ctx.restore();
  }
}
