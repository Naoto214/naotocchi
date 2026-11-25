// Presentation-only rain, snow, spring petals and rain rings for the painted 2.5D home.
// Everything is a function of the scene clock and is drawn on the backdrop canvas, in
// fractions of the 1000 × 1500 painting, so each particle keeps its place at any crop.
function hash(value) {
  let bits = Math.imul(value ^ (value >>> 16), 0x21f0aaad);
  bits = Math.imul(bits ^ (bits >>> 15), 0x735a2d97);
  return ((bits ^ (bits >>> 15)) >>> 0) / 4294967296;
}
const TAU = 2 * Math.PI;
const mix = (lo, hi, t) => lo + (hi - lo) * t;
const unit = value => value - Math.floor(value);

export const FX_COUNTS = Object.freeze({rain:[96,54,28], snow:[80,44,22], petal:[18,11,6]});
// The indoor home only shows weather through its window.
export const HOME_WINDOW = Object.freeze({x0:.27, x1:.57, y0:.115, y1:.31});
// Painted water that a raindrop can land on: points sampled across each water surface and
// kept only where the day painting is water, so rocks, sand and banks stay dry.
export const RAIN_WATER = Object.freeze({
  sea:[[0.361,0.323],[0.362,0.481],[0.834,0.448],[0.122,0.474],[0.456,0.356],[0.773,0.343],[0.353,0.435],[0.512,0.532],[0.31,0.38],[0.485,0.388],[0.588,0.483],[0.179,0.259],[0.504,0.481],[0.76,0.401],[0.417,0.44],[0.352,0.399],[0.871,0.398],[0.44,0.421],[0.524,0.442],[0.585,0.338],[0.952,0.302],[0.648,0.5],[0.027,0.278],[0.538,0.326],[0.677,0.409],[0.442,0.389],[0.912,0.343],[0.587,0.377],[0.269,0.444],[0.288,0.398],[0.245,0.468],[0.936,0.413],[0.454,0.289],[0.108,0.28],[0.225,0.323],[0.785,0.427],[0.975,0.253],[0.483,0.419],[0.805,0.386],[0.465,0.464],[0.337,0.35],[0.31,0.472],[0.405,0.483],[0.705,0.339],[0.175,0.482],[0.775,0.479],[0.388,0.508],[0.521,0.304],[0.392,0.396],[0.67,0.482],[0.199,0.3],[0.738,0.5],[0.649,0.364],[0.199,0.453],[0.71,0.383],[0.087,0.377],[0.431,0.326],[0.194,0.393],[0.62,0.291],[0.602,0.524],[0.416,0.359],[0.595,0.433],[0.537,0.257],[0.567,0.408],[0.532,0.372],[0.892,0.477],[0.27,0.353],[0.653,0.447],[0.725,0.423],[0.827,0.359],[0.241,0.376],[0.151,0.36]],
  river_lake:[[0.361,0.295],[0.834,0.431],[0.456,0.332],[0.773,0.318],[0.209,0.294],[0.76,0.38],[0.585,0.312],[0.538,0.299],[0.677,0.389],[0.587,0.354],[0.682,0.414],[0.936,0.394],[0.925,0.454],[0.785,0.408],[0.785,0.432],[0.705,0.313],[0.966,0.348],[0.775,0.465],[0.521,0.276],[0.442,0.272],[0.866,0.398],[0.649,0.34],[0.431,0.299],[0.739,0.399],[0.416,0.335],[0.897,0.489],[0.608,0.403],[0.932,0.34],[0.532,0.349],[0.892,0.462],[0.827,0.335],[0.964,0.377],[0.776,0.357],[0.633,0.305],[0.859,0.492],[0.729,0.341],[0.652,0.365],[0.551,0.323],[0.699,0.255],[0.615,0.376],[0.89,0.526],[0.683,0.345],[0.496,0.346],[0.817,0.38],[0.574,0.377],[0.949,0.473],[0.815,0.465],[0.496,0.376],[0.645,0.401],[0.853,0.356],[0.465,0.365],[0.639,0.255],[0.302,0.287],[0.703,0.367],[0.408,0.238],[0.488,0.302],[0.396,0.295],[0.854,0.46],[0.949,0.416],[0.385,0.32],[0.889,0.436],[0.673,0.3],[0.509,0.244],[0.719,0.439],[0.263,0.289],[0.651,0.436],[0.507,0.322],[0.751,0.423],[0.536,0.374],[0.57,0.288],[0.477,0.267],[0.82,0.404]],
  jungle:[[0.585,0.446],[0.648,0.507],[0.731,0.5],[0.595,0.482],[0.648,0.484],[0.633,0.443],[0.682,0.493],[0.425,0.451],[0.768,0.488],[0.557,0.472],[0.697,0.517],[0.769,0.512],[0.61,0.507]]
});
// Few trees stand on the alpine path, so its petals arrive on the valley wind.
const PETAL_SCALE = Object.freeze({mountain:.4});

const TONES = {
  morning:{rain:'241,246,248', ripple:'251,253,255', rippleGain:.75, snow:'255,255,255', petals:[['#fff6f2','#ffc9d8'],['#ffc9d8','#f7a9c0'],['#fff6f2','#f7a9c0']]},
  day:{rain:'230,242,251', ripple:'240,250,255', rippleGain:.8, snow:'255,255,255', petals:[['#fff1f3','#ffc9d8'],['#ffc9d8','#f7a9c0'],['#fff1f3','#f7a9c0']]},
  evening:{rain:'255,233,214', ripple:'255,240,220', rippleGain:.7, snow:'255,243,234', petals:[['#ffe9df','#ffbcc0'],['#ffbcc0','#f09aa8'],['#ffe9df','#f09aa8']]},
  night:{rain:'185,205,234', ripple:'201,217,245', rippleGain:.5, snow:'227,236,255', petals:[['#c9c6e6','#a99bd0'],['#a99bd0','#8f83bd'],['#c9c6e6','#8f83bd']]}
};

// Per-particle constants, built once per kind and setting.
const tracks = new Map();
function getTracks(kind, count, indoor) {
  const key = kind + count + indoor;
  if (tracks.has(key)) return tracks.get(key);
  const box = indoor ? HOME_WINDOW : {x0:-.02, x1:1.02, y0:-.04, y1:1.03}, span = box.y1 - box.y0, list = [];
  for (let i = 0; i < count; i++) {
    const z = i % 3, far = z === 0, near = z === 2;
    if (kind === 'rain') {
      const r = n => hash(1009 * 4 + i * 79 + n);
      const length = (far ? .020 : near ? .042 : .030) * mix(.78, 1.25, r(1)) * (indoor ? .55 : 1);
      const land = indoor ? box.y1 : box.y0 + span * (far ? mix(.52,.74,r(2)) : near ? mix(.94,1,r(2)) : mix(.70,.95,r(2)));
      // One shared lean with a small spread: the rain falls straight, never fanned.
      const tilt = (2.2 + 1.6 * (r(3) - .5)) * Math.PI / 180, y0 = box.y0 - length, y1 = land - length;
      const speed = (far ? .86 : near ? 1.5 : 1.14) * mix(.9, 1.12, r(4));
      list.push({x:mix(box.x0, box.x1, r(5)), y0, y1, slope:Math.tan(tilt), duration:(y1 - y0) / speed, phase:r(6), length,
        width:indoor ? 1 : far ? 1.1 : near ? 2 : 1.5, alpha:(far ? .44 : near ? .8 : .62) * (indoor ? .6 : 1)});
    } else if (kind === 'snow') {
      const r = n => hash(1009 * 5 + i * 83 + n);
      // Near flakes cross faster and swing wider; distant ones keep a narrow path.
      list.push({x:mix(box.x0, box.x1, r(6)), y0:box.y0,
        y1:indoor ? box.y1 : box.y0 + span * (far ? mix(.50,.74,r(2)) : near ? 1 : mix(.72,.96,r(2))),
        size:(far ? mix(2.4,3.6,r(1)) : near ? mix(6.5,10,r(1)) : mix(4,6,r(1))) * (indoor ? .6 : 1),
        duration:(far ? mix(17,22,r(3)) : near ? mix(8.5,10.5,r(3)) : mix(12,15,r(3))) * (indoor ? .5 : 1),
        drift:(far ? mix(.02,.06,r(4)) : near ? mix(.06,.15,r(4)) : mix(.04,.10,r(4))) * (indoor ? .3 : 1),
        sway:(far ? .005 : near ? mix(.018,.03,r(5)) : mix(.010,.016,r(5))) * (indoor ? .4 : 1),
        swayPeriod:mix(5.2,10.4,r(8)), swayPhase:r(9), phase:r(7), alpha:far ? .66 : near ? .96 : .86});
    } else {
      const r = n => hash(1009 * 6 + i * 89 + n);
      // Petals leave the canopy at different heights and settle on the ground.
      const y0 = mix(-.04, .30, r(2)), y1 = far ? mix(.58,.72,r(3)) : near ? mix(.96,1.02,r(3)) : mix(.74,.94,r(3));
      list.push({x:mix(.02,.98,r(7)), y0, y1, tone:i % 3,
        size:far ? mix(6,7.5,r(1)) : near ? mix(11.5,14,r(1)) : mix(8.5,10.5,r(1)),
        duration:(y1 - y0) * (far ? mix(30,36,r(4)) : near ? mix(17,21,r(4)) : mix(22,27,r(4))),
        drift:mix(.07, .22, r(5)) * (r(6) < .22 ? -.5 : 1), sway:mix(.014,.034,r(9)), swayPeriod:mix(5.6,9.2,r(10)), swayPhase:r(11),
        lean:mix(14,34,r(12)) * Math.PI / 180, flipPeriod:mix(2.6,5.4,r(13)), flipPhase:r(14), phase:r(8), alpha:far ? .72 : .92});
    }
  }
  tracks.set(key, list);
  return list;
}

const sprites = new Map();
function sprite(doc, key, width, height, paint) {
  if (sprites.has(key)) return sprites.get(key);
  const canvas = typeof OffscreenCanvas === 'function' ? new OffscreenCanvas(width, height) : doc?.createElement('canvas');
  if (!canvas) return null;
  canvas.width = width; canvas.height = height;
  const brush = canvas.getContext('2d');
  if (!brush) return null;
  paint(brush);
  sprites.set(key, canvas);
  return canvas;
}
const flake = (doc, rgb) => sprite(doc, 'snow' + rgb, 32, 32, c => {
  const g = c.createRadialGradient(16,16,0,16,16,16);
  g.addColorStop(0, `rgba(${rgb},1)`); g.addColorStop(.34, `rgba(${rgb},1)`);
  g.addColorStop(.58, `rgba(${rgb},.55)`); g.addColorStop(.72, `rgba(${rgb},0)`);
  c.fillStyle = g; c.fillRect(0,0,32,32);
});
const blossom = (doc, [from, to]) => sprite(doc, 'petal' + from + to, 80, 60, c => {
  c.scale(2,2);
  c.beginPath();
  c.moveTo(0,15); c.bezierCurveTo(6,3,24,-2,31,4); c.quadraticCurveTo(34,5,34,10);
  c.quadraticCurveTo(39,11,40,16); c.bezierCurveTo(39,26,20,29,0,15); c.closePath();
  const g = c.createLinearGradient(2,24,38,6);
  g.addColorStop(0, from); g.addColorStop(1, to);
  c.fillStyle = g; c.fill();
});

const envelope = p => Math.min(1, p / .07, (1 - p) / .14);
// Which falling layer a mood asks of this module. Leaves have their own painter.
export const fallingKind = mood => FX_COUNTS[mood.particle] ? mood.particle : null;

export function fallingCount(env, kind, tier = 0) {
  const level = Math.min(2, Math.max(0, tier | 0));
  return Math.round(FX_COUNTS[kind][level] * (env.region === 'home' ? .25 : kind === 'petal' ? PETAL_SCALE[env.region] ?? 1 : 1));
}

function rings(ctx, rect, env, seconds, tier, tone) {
  const spots = RAIN_WATER[env.region];
  if (!spots) return;
  const count = [spots.length, 40, 22][Math.min(2, Math.max(0, tier | 0))];
  const W = rect.width, H = rect.height, ys = spots.map(spot => spot[1]), top = Math.min(...ys), span = Math.max(...ys) - top || 1;
  ctx.strokeStyle = `rgb(${tone.ripple})`;
  for (let i = 0; i < count; i++) {
    // Each spot has its own rhythm and rests between drops, so rings appear here and
    // there over the whole surface. Far rings are small and faint, near ones wider.
    const period = 1.5 + 1.2 * hash(i + 4099), cycle = seconds / (period * 2.2) + hash(i + 4211);
    const turn = Math.floor(cycle), p = unit(cycle) * 2.2;
    if (p >= 1) continue;
    const [x, y] = spots[i], depth = (y - top) / span;
    const jx = (hash(i * 31 + turn) - .5) * .03, jy = (hash(i * 37 + turn) - .5) * .012;
    const radius = H * (.011 + .034 * depth * (.8 + .4 * hash(i + 4153))) * (.12 + 1.08 * p) * .5;
    ctx.globalAlpha = (.42 + .5 * depth) * tone.rippleGain * Math.min(1, p / .12) * (1 - p) ** 1.3;
    ctx.lineWidth = 1 + .6 * depth;
    ctx.beginPath();
    ctx.ellipse(rect.left + (x + jx) * W, rect.top + (y + jy) * H, radius, radius * .3, 0, 0, TAU);
    ctx.stroke();
  }
}

// Draws the falling layer over the finished backdrop. `seconds` is the scene clock.
export function paintFalling(ctx, rect, env, mood, seconds, {tier = 0, document:doc} = {}) {
  const kind = fallingKind(mood);
  if (!kind) return;
  const indoor = env.region === 'home', tone = TONES[env.time] || TONES.day;
  const W = rect.width, H = rect.height, list = getTracks(kind, fallingCount(env, kind, tier), indoor);
  // Sizes follow the painting, so a larger crop shows proportionally larger flakes.
  const px = Math.min(1.5, H / 720);
  ctx.save();
  if (indoor) {
    const w = HOME_WINDOW;
    ctx.beginPath();
    ctx.moveTo(rect.left + W * w.x0, rect.top + H * .12); ctx.lineTo(rect.left + W * w.x1, rect.top + H * .13);
    ctx.lineTo(rect.left + W * w.x1, rect.top + H * .30); ctx.lineTo(rect.left + W * w.x0, rect.top + H * .31);
    ctx.closePath(); ctx.clip();
  }
  if (kind === 'rain') {
    rings(ctx, rect, env, seconds, tier, tone);
    ctx.strokeStyle = `rgb(${tone.rain})`;
    ctx.lineCap = 'round';
    for (const d of list) {
      const p = unit(seconds / d.duration + d.phase), fall = d.y0 + (d.y1 - d.y0) * p;
      const x = rect.left + d.x * W + (fall - d.y0) * d.slope * H, y = rect.top + (fall + d.length) * H;
      const dx = d.slope * d.length * H, dy = d.length * H, alpha = d.alpha * envelope(p);
      ctx.lineWidth = d.width * px;
      // A faint full streak and a brighter lower half stand in for the tapering tail.
      ctx.globalAlpha = alpha * .45; ctx.beginPath(); ctx.moveTo(x - dx, y - dy); ctx.lineTo(x, y); ctx.stroke();
      ctx.globalAlpha = alpha; ctx.beginPath(); ctx.moveTo(x - dx * .45, y - dy * .45); ctx.lineTo(x, y); ctx.stroke();
    }
  } else if (kind === 'snow') {
    const image = flake(doc, tone.snow);
    for (const d of list) {
      const p = unit(seconds / d.duration + d.phase), size = d.size * px * 1.4;
      const x = rect.left + d.x * W + (d.drift * (p - .5) + d.sway * Math.sin(TAU * (seconds / d.swayPeriod + d.swayPhase))) * H;
      const y = rect.top + (d.y0 + (d.y1 - d.y0) * p) * H;
      ctx.globalAlpha = d.alpha * envelope(p);
      if (image) ctx.drawImage(image, x - size / 2, y - size / 2, size, size);
    }
  } else {
    for (const d of list) {
      const p = unit(seconds / d.duration + d.phase), swing = Math.sin(TAU * (seconds / d.swayPeriod + d.swayPhase));
      const x = rect.left + d.x * W + (d.drift * (p - .5) + d.sway * swing) * H, y = rect.top + (d.y0 + (d.y1 - d.y0) * p) * H;
      // The petal tips over its long axis: full face, edge-on, then the reverse.
      const flip = Math.cos(TAU * (seconds / d.flipPeriod + d.flipPhase));
      const image = blossom(doc, tone.petals[d.tone]), size = d.size * px;
      if (!image) continue;
      ctx.save();
      ctx.translate(x, y); ctx.rotate(d.lean * swing + .35 * flip);
      ctx.scale(1, Math.sign(flip || 1) * Math.max(.14, Math.abs(flip)));
      ctx.globalAlpha = d.alpha * envelope(p) * (.78 + .22 * Math.abs(flip));
      ctx.drawImage(image, -size / 2, -size * .37, size, size * .74);
      ctx.restore();
    }
  }
  ctx.restore();
}

const VEILS = {
  // [top wash, flat wash] — rain cools and dims, snow lifts toward a pale sky.
  rain:{morning:['rgba(120,136,150,.30)','rgba(92,108,126,.16)'], day:['rgba(112,128,144,.32)','rgba(84,100,120,.17)'],
    evening:['rgba(104,98,124,.28)','rgba(78,74,104,.15)'], night:['rgba(96,112,140,.10)','rgba(14,22,48,.14)']},
  snow:{morning:['rgba(226,234,242,.30)','rgba(214,224,236,.10)'], day:['rgba(226,234,242,.30)','rgba(214,224,236,.10)'],
    evening:['rgba(214,206,222,.26)','rgba(196,190,212,.09)'], night:['rgba(170,186,214,.10)','rgba(120,140,180,.05)']}
};
// A graduated weather veil over the painting. Cloudy keeps the approved V1 values.
export function paintWeatherVeil(ctx, t, env, mood) {
  if (!mood.cloud) return;
  const night = env.time === 'night', tones = VEILS[env.weather]?.[env.time] || VEILS[env.weather]?.day;
  ctx.save();
  if (env.region === 'home') {
    const w = HOME_WINDOW;
    ctx.beginPath();
    ctx.moveTo(t.left + t.width * w.x0, t.top + t.height * .12);
    ctx.lineTo(t.left + t.width * w.x1, t.top + t.height * .13);
    ctx.lineTo(t.left + t.width * w.x1, t.top + t.height * .30);
    ctx.lineTo(t.left + t.width * w.x0, t.top + t.height * .31);
    ctx.closePath();
    ctx.clip();
  }
  const g = ctx.createLinearGradient(0, t.top, 0, t.top + t.height * .7);
  g.addColorStop(0, tones ? tones[0] : night ? 'rgba(160,174,190,.06)' : 'rgba(135,148,158,.20)');
  g.addColorStop(1, 'rgba(160,174,190,0)');
  ctx.fillStyle = g;
  ctx.fillRect(t.left, t.top, t.width, t.height);
  if (tones) { ctx.fillStyle = tones[1]; ctx.fillRect(t.left, t.top, t.width, t.height); }
  ctx.restore();
}
