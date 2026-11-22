// Approved leaf B artwork and motion from #569, in 1000 × 1500 painting coordinates.
const TAU = 2 * Math.PI;
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const unit = value => value - Math.floor(value);
const smooth = value => {
  const t = clamp(value, 0, 1);
  return t * t * (3 - 2 * t);
};
function hash(value) {
  let bits = Math.imul(value ^ (value >>> 16), 0x21f0aaad);
  bits = Math.imul(bits ^ (bits >>> 15), 0x735a2d97);
  return ((bits ^ (bits >>> 15)) >>> 0) / 4294967296;
}
const records = new Map();
function getTrack(i, region, seed) {
  const key = region;
  let group = records.get(key);
  if (!group) {
    group = [];
    records.set(key, group);
  }
  if (group[i]) return group[i];
  const id = Math.imul(seed, 331) + i * 79 + 1787;
  const band = ((i % 3) + .15 + .70 * hash(id)) / 3;
  const track = {
    id, band, offset: hash(id + 1), tempo: .82 + .37 * hash(id + 2),
    sway: .63 + .73 * hash(id + 3), eddy: .46 + .56 * hash(id + 4),
    rotation: (hash(id + 5) - .5) * TAU, spin: .68 + .67 * hash(id + 6),
    chirality: hash(id + 7) > .5 ? 1 : -1,
    susceptible: hash(id + 8) < .36, variation: .81 + .37 * hash(id + 9),
    windAge: new Float64Array(64), windBend: new Float64Array(64),
    windGust: new Float64Array(64)
  };
  group[i] = track;
  return track;
}

const windSpacing = .65;
// A displacement is the integral of the signed wind. This keeps a leaf moving
// downwind through a front and gently settles its lateral speed after passage.
// Cache the integral and field at uniform knots per fall. The knot count is
// fixed even at 25% speed, and grows lazily by at most one in ordinary playback.
function windTransport(track, localAge, life, birth, sourceX, z, front) {
  const step = Math.max(windSpacing, life / 60);
  const knot = Math.floor(localAge / step);
  const evaluate = index => front(birth + index * step, sourceX, z, true);
  if (track.birth !== birth) {
    track.birth = birth;
    const first = evaluate(0);
    track.windAge[0] = 0; track.windBend[0] = first.bend; track.windGust[0] = first.gust;
    track.knots = 0;
  }
  const bends = track.windBend, gusts = track.windGust, integral = track.windAge;
  while (track.knots <= knot) {
    const j = track.knots + 1, field = evaluate(j);
    bends[j] = field.bend; gusts[j] = field.gust;
    integral[j] = integral[j - 1] + .5 * (bends[j - 1] + bends[j]) * step;
    track.knots = j;
  }
  const f = localAge / step - knot;
  const bend = bends[knot] + f * (bends[knot + 1] - bends[knot]);
  return {
    distance: (integral[knot] + .5 * (bends[knot] + bend) * f * step),
    bend,
    gust: (gusts[knot] + f * (gusts[knot + 1] - gusts[knot]))
  };
}

function sampleLeaf(i, seconds, region, seed, sourceX, front) {
  const track = getTrack(i, region, seed);
  const z = track.band;
  const life = 22.5 * track.tempo / (.70 + .76 * z);
  const progress = seconds / life + track.offset;
  const flight = Math.floor(progress), phase = unit(progress);
  const opacity = .70 + .30 * hash(track.id + 37 * flight + 47);
  const radius = (.46 + .98 * z) * track.variation;
  const birth = (flight - track.offset) * life;
  const alpha = smooth(phase / .075) * smooth((1 - phase) / .11) * opacity * (.65 + .35 * z);
  const flow = windTransport(track, phase * life, life, birth, sourceX, z, front);
  const slow = Math.sin(seconds * (.17 + .13 * track.eddy) + track.rotation);
  const arc = Math.sin(seconds * (.57 + .38 * track.eddy) + track.rotation + .77 * slow);
  const x = sourceX + .035 * flow.distance + .020 * track.sway * arc;
  const pitch = seconds * (.81 + .42 * track.eddy) * track.spin;
  const rotation = track.rotation + track.chirality * (pitch + .82 * slow) + .44 * flow.bend;
  const lift = track.susceptible ? smooth((flow.gust - .25) / .77) : 0;
  const y = phase + Math.sin(phase * Math.PI) * (.008 * arc - lift * .12);
  return {x, y, phase, radius, depth:z, rotation, face:Math.cos(rotation * .83 + .72 * arc),
    alpha:alpha * smooth((x + .01) / .045) * smooth((1.01 - x) / .045), gust:flow.gust, bend:flow.bend};
}

const mod=(x,p)=>((x%p)+p)%p;
const noise=i=>mod(Math.sin(i*45.839+18)*9340.115,1);
const weatherFronts=[[12,1,2.8,.93],[35,-1,2.1,.52],[59,1,4.3,1],[89,-1,2.9,.70],
  [121,-1,3.7,.89],[151,1,2.4,.64],[186,1,4.2,.97],[214,-1,2.7,.77]];
function bump(x){return Math.abs(x)<1?(.5+.5*Math.cos(Math.PI*x)):0;}
function forestFront(seconds,u,depth,enabled=true){
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

const releaseBoughs=[[.29,205],[.49,320],[.76,238],[.25,448],[.68,395],
  [.82,558],[.38,631],[.61,450],[.17,335]];
function fieldWind(t,u){
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
const fieldSources=[
  // Far orchard, middle field-tree and near verge repeat in the sampler's depth order.
  [650,376],[385,450],[175,705],[673,389],[792,526],[869,941],[322,512]
];
// This crown sits just right of the path in all four paintings. A near
// candidate leaf can pass in front of it even in the narrow portrait crop.
const orchardCrown=[625,305];
const fieldNoise = i => mod(Math.sin(i*73.169+49)*31743.31,1);

const clamp01 = x => Math.min(1, Math.max(0, x));

function sampleAutumnLeaf(i, p, baseSize, state) {
  const t = state.t;
  const z = p.depth, z2 = z * z;
  const field = state.region === 'countryside';
  const offset = 2.39996 * i + (field ? 1.31 : 0);
  const tempo = .75 + .31 * ((i * 13) % 17) / 16;
  const slow = Math.sin(t * (.21 + .08 * tempo) + offset);
  const bank = t * tempo + offset + .82 * slow;
  const swing = Math.sin(bank), tilt = Math.cos(bank);
  const flutter = Math.sin(bank * 1.73 - offset * .42);
  const flight = Math.sin(Math.PI * p.phase);
  const gust = clamp01((p.gust - .14) / .76);
  const lift = gust * gust * (3 - 2 * gust) * (i % 4 === 1 ? .38 : 1);
  // A broad, slowing bank, a smaller roll, then a quicker downward slip.
  // The shorter field pass keeps the movement close to the orchard or verge.
  const dx = flight * (field ? .88 : 1) * (7 + 40 * z2) * (swing + .31 * flutter);
  const dy = flight * (field ? .60 : 1) * ((2.3 + 15 * z2) * (tilt - .42 * flutter)
    - (9 + 89 * z2) * lift);
  const rotation = .66 * p.rotation + (.40 + .84 * z) * tilt + .19 * flutter + .13 * p.bend;
  const face = Math.sin(1.30 * p.face + .25 * flutter);
  return {
    dx, dy, rotation, face,
    roll:.23 + .77 * Math.abs(face),
    radius:baseSize * p.radius * 2 * (.91 + .25 * z),
    opacityGain:1.09 + .27 * z
  };
}

// Body, sunlit plane, rim, and midrib for the face and the muted reverse.
const pigments = {
  red:[['#c84b31','#fb8953','#80382e','#ffd097'], ['#af5947','#d99173','#763e35','#efbd90']],
  orange:[['#d77828','#ffb955','#8c4826','#ffe2a0'], ['#ae7245','#e6a772','#815437','#f8d393']],
  gold:[['#dfa332','#ffe086','#895c2b','#a27032'], ['#c38d4e','#edc27f','#825b38','#946738']],
  orchardRed:[['#ce4138','#fb7853','#83362e','#ffd39a'], ['#a73548','#df6971','#713330','#f4b391']]
};
const mix = ['gold','orange','red','red','gold','orange','orange','red','gold'];

function blade(ctx, lobed) {
  ctx.beginPath();
  ctx.moveTo(-.82,.13);
  if (lobed) {
    ctx.quadraticCurveTo(-.87,-.04,-.77,-.22);
    ctx.lineTo(-.90,-.51);
    ctx.quadraticCurveTo(-.62,-.47,-.42,-.32);
    ctx.lineTo(-.49,-.70);
    ctx.quadraticCurveTo(-.14,-.58,.10,-.37);
    ctx.lineTo(.23,-.55);
    ctx.quadraticCurveTo(.47,-.36,.52,-.24);
  } else {
    ctx.quadraticCurveTo(-.90,-.20,-.63,-.38);
    ctx.lineTo(-.71,-.46);
    ctx.quadraticCurveTo(-.49,-.50,-.33,-.44);
    ctx.lineTo(-.39,-.57);
    ctx.quadraticCurveTo(-.02,-.61,.21,-.45);
    ctx.lineTo(.20,-.54);
    ctx.quadraticCurveTo(.43,-.46,.54,-.28);
  }
  ctx.quadraticCurveTo(.75,-.18,1,-.12);
  ctx.quadraticCurveTo(.80,.04,.62,.23);
  if (lobed) {
    ctx.lineTo(.55,.39); ctx.lineTo(.33,.35);
    ctx.quadraticCurveTo(.14,.58,-.13,.68);
    ctx.lineTo(-.10,.46);
    ctx.quadraticCurveTo(-.41,.67,-.70,.61);
    ctx.lineTo(-.61,.40);
  } else {
    ctx.lineTo(.53,.40); ctx.lineTo(.44,.34);
    ctx.quadraticCurveTo(.27,.53,.03,.55);
    ctx.lineTo(.07,.44);
    ctx.quadraticCurveTo(-.40,.66,-.61,.43);
  }
  ctx.quadraticCurveTo(-.78,.36,-.82,.13);
  ctx.closePath();
}

function paintFace(ctx, lobed, colors) {
  const [body, light, rim, rib] = colors;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = rim;
  ctx.lineWidth = .095;
  ctx.beginPath();
  ctx.moveTo(-1.03,.28);
  ctx.quadraticCurveTo(-.95,.17,-.72,.12);
  ctx.stroke();
  blade(ctx,lobed);
  ctx.fillStyle = body;
  ctx.fill();
  ctx.stroke();
  ctx.save();
  ctx.clip();
  // Give the folded blade one lit side with a slightly curved central ridge.
  ctx.beginPath();
  ctx.moveTo(-.90,.16);
  ctx.quadraticCurveTo(-.23,-.08,1,-.12);
  ctx.lineTo(1,-.75); ctx.lineTo(-.95,-.75); ctx.closePath();
  const wash = ctx.createLinearGradient(-.88,.14,.97,-.24);
  wash.addColorStop(0,body); wash.addColorStop(.31,light);
  wash.addColorStop(.66,light); wash.addColorStop(1,body);
  ctx.fillStyle = wash; ctx.fill();
  ctx.beginPath(); ctx.moveTo(-.85,.16);
  ctx.quadraticCurveTo(-.22,-.07,.83,-.11);
  ctx.moveTo(-.35,.046); ctx.quadraticCurveTo(-.16,.21,-.04,.33);
  ctx.strokeStyle = rib; ctx.lineWidth = .064; ctx.stroke();
  ctx.restore();
}

// Both silhouettes, three palette families and the orchard accent use at most fourteen sprites.
// A particle blits one sprite even while it is banking or crossing a gust.
const sprites = new Map();
const spriteWidth = 112, spriteHeight = 80, texels = 48;
function getSprite(key, lobed, colors, ctx) {
  if (sprites.has(key)) return sprites.get(key);
  const doc = ctx.canvas?.ownerDocument ?? globalThis.document;
  const sprite = typeof OffscreenCanvas === 'function'
    ? new OffscreenCanvas(spriteWidth,spriteHeight) : doc?.createElement('canvas');
  if (!sprite) return null;
  sprite.width = spriteWidth; sprite.height = spriteHeight;
  const brush = sprite.getContext('2d');
  if (!brush) return null;
  brush.setTransform(texels,0,0,texels,spriteWidth/2,spriteHeight/2);
  paintFace(brush,lobed,colors);
  sprites.set(key,sprite);
  return sprite;
}

function drawAutumnLeaf(ctx, i, p, x, y, baseSize, alpha, state) {
  if (p.alpha <= 0 || alpha <= 0) return;
  const g = sampleAutumnLeaf(i,p,baseSize,state);
  const hue = state.region === 'countryside' && i === 5 ? 'orchardRed' : mix[i % mix.length];
  const reverse = g.face < 0, lobed = i % 3 !== 1;
  const colors = pigments[hue][Number(reverse)];
  const sprite = getSprite(hue + Number(reverse) + Number(lobed),lobed,colors,ctx);
  ctx.save();
  ctx.translate(x + g.dx, y + g.dy);
  ctx.rotate(g.rotation);
  ctx.scale(g.radius, g.radius * g.roll * (reverse ? -1 : 1));
  ctx.globalAlpha = clamp01(alpha * Math.min(1,p.alpha * g.opacityGain));
  if (sprite) {
    ctx.drawImage(sprite,-spriteWidth/(2*texels),-spriteHeight/(2*texels),spriteWidth/texels,spriteHeight/texels);
  } else {
    paintFace(ctx,lobed,colors);
  }
  ctx.restore();
}


export function usesAutumnLeaves(region, time, env) {
  return env.season === 'autumn' && ['sunny','cloudy'].includes(env.weather) &&
    (region === 'forest' || (region === 'countryside' && time !== 'night'));
}

export function paintAutumnLeaves(ctx, rect, region, time, seconds, opacity) {
  const forest = region === 'forest', dusk = time === 'evening';
  const count = forest ? 20 : dusk ? 6 : 14;
  const state = {region, t:seconds};
  ctx.save();
  ctx.translate(rect.left,rect.top);
  ctx.scale(rect.width/1000,rect.height/1500);
  ctx.beginPath();
  ctx.rect(0,0,1000,1500);
  ctx.clip();
  for (let i=0; i<count; i++) {
    if (forest) {
      const [u,v] = releaseBoughs[i % releaseBoughs.length];
      const origin = u + (noise(i+14)-.5)*.092;
      const start = v + (noise(i+67)-.5)*61;
      const p = sampleLeaf(i,seconds,region,0,origin,forestFront);
      drawAutumnLeaf(ctx,i,p,p.x*1000,start+(913+119*p.depth-start)*p.y,4.4,opacity,state);
    } else {
      const [u,v] = i===5 ? orchardCrown : fieldSources[i % fieldSources.length];
      const p = sampleLeaf(i,seconds,region,83,u/1000,fieldFront);
      const x = u+(i===5 ? 0 : 54*(fieldNoise(i+11)-.5))+(p.x-u/1000)*810;
      const y = v+(54+72*p.depth)*p.y;
      drawAutumnLeaf(ctx,i,p,x,y,dusk ? 4.6+5.6*p.depth : 4.3,opacity*.93,state);
    }
  }
  ctx.restore();
}
