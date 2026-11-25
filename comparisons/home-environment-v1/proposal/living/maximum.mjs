// The "maximum" layer: everything here is added on top of the reused E3 painters to show how
// far the living home can go. Wind you can see, grass that carries the gust, a river that
// runs, a sea that rolls and glitters, fireflies that each keep their own path, and night
// skies that twinkle on the painted stars. Coordinates are the 1000 × 1500 painting.
import {RAIN_WATER} from '../home-atmosphere-fx.mjs';

const TAU = 2 * Math.PI;
const unit = value => value - Math.floor(value);
const clamp = (value, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, value));
const smooth = value => { const t = clamp(value); return t * t * (3 - 2 * t); };
function hash(value) {
  let bits = Math.imul(value ^ (value >>> 16), 0x21f0aaad);
  bits = Math.imul(bits ^ (bits >>> 15), 0x735a2d97);
  return ((bits ^ (bits >>> 15)) >>> 0) / 4294967296;
}
// How strongly the reused painters are driven in this mode (their own scale tops out at 2).
export const MAXIMUM_STRENGTH = 2;

// Painted stars found in each night sky; the twinkle sits exactly on them.
export const NIGHT_STARS = Object.freeze({
  forest:[[0.465,0.147],[0.535,0.133],[0.674,0.141],[0.225,0.069],[0.516,0.1],[0.604,0.206],[0.26,0.18],[0.059,0.048],[0.531,0.018],[0.717,0.165],[0.303,0.137],[0.271,0.014],[0.209,0.156],[0.127,0.025],[0.492,0.12],[0.459,0.082],[0.113,0.201],[0.193,0.077],[0.252,0.113],[0.51,0.148],[0.182,0.174],[0.027,0.03],[0.568,0.161],[0.713,0.141],[0.297,0.025],[0.311,0.178],[0.268,0.035],[0.756,0.116],[0.422,0.007],[0.006,0.154],[0.791,0.178],[0.873,0.283],[0.566,0.133],[0.475,0.029],[0.379,0.035],[0.588,0.036]],
  river_lake:[[0.48,0.027],[0.834,0.008],[0.738,0.033],[0.582,0.005],[0.77,0.027],[0.363,0.042],[0.43,0.029],[0.297,0.06],[0.43,0.004],[0.529,0.009],[0.75,0.008],[0.619,0.008],[0.402,0.009],[0.707,0.03],[0.5,0.009],[0.934,0.013],[0.912,0.031],[0.338,0.065],[0.66,0.021],[0.262,0.048],[0.396,0.038],[0.715,0.012],[0.902,0.005],[0.457,0.008],[0.469,0.046],[0.309,0.029],[0.684,0.008],[0.965,0.007],[0.193,0.069],[0.334,0.038],[0.49,0.255],[0.807,0.324],[0.525,0.027],[0.799,0.297],[0.793,0.009],[0.527,0.296]],
  countryside:[[0.865,0.031],[0.461,0.014],[0.836,0.029],[0.672,0.012],[0.367,0.048],[0.482,0.051],[0.973,0.008],[0.645,0.027],[0.801,0.039],[0.561,0.022],[0.34,0.029],[0.434,0.036],[0.588,0.043],[0.775,0.052],[0.852,0.009],[0.189,0.036],[0.398,0.027],[0.643,0.063],[0.521,0.039],[0.496,0.016],[0.164,0.013],[0.707,0.065],[0.59,0.004],[0.533,0.068],[0.334,0.09],[0.373,0.016],[0.707,0.005],[0.4,0.051],[0.443,0.07],[0.91,0.018],[0.307,0.085],[0.605,0.059],[0.379,0.09],[0.621,0.01],[0.893,0.143],[0.402,0.005]],
  mountain:[[0.652,0.022],[0.477,0.052],[0.023,0.008],[0.164,0.013],[0.58,0.064],[0.16,0.076],[0.242,0.059],[0.615,0.085],[0.672,0.109],[0.199,0.076],[0.369,0.013],[0.449,0.013],[0.711,0.026],[0.729,0.108],[0.348,0.089],[0.518,0.076],[0.701,0.066],[0.479,0.09],[0.525,0.008],[0.648,0.091],[0.6,0.03],[0.531,0.038],[0.891,0.04],[0.76,0.01],[0.66,0.069],[0.115,0.056],[0.338,0.069],[0.533,0.102],[0.148,0.096],[0.613,0.007],[0.391,0.16],[0.066,0.046],[0.984,0.089],[0.58,0.014],[0.084,0.016],[0.424,0.027]],
  snow:[[0.084,0.02],[0.678,0.01],[0.949,0.009],[0.521,0.022],[0.637,0.046],[0.809,0.012],[0.414,0.069],[0.729,0.034],[0.887,0.049],[0.75,0.073],[0.707,0.061],[0.852,0.039],[0.541,0.064],[0.689,0.078],[0.354,0.076],[0.795,0.073],[0.445,0.112],[0.332,0.03],[0.498,0.009],[0.682,0.033],[0.914,0.102],[0.611,0.073],[0.295,0.009],[0.467,0.008],[0.463,0.06],[0.387,0.042],[0.863,0.07],[0.721,0.085],[0.953,0.057],[0.834,0.108],[0.379,0.063],[0.711,0.017],[0.777,0.09],[0.98,0.049],[0.518,0.089],[0.33,0.087]],
  sea:[[0.072,0.059],[0.504,0.025],[0.707,0.025],[0.441,0.089],[0.27,0.005],[0.012,0.103],[0.98,0.02],[0.754,0.01],[0.768,0.089],[0.631,0.039],[0.953,0.01],[0.301,0.146],[0.051,0.12],[0.273,0.112],[0.242,0.008],[0.418,0.03],[0.904,0.009],[0.031,0.065],[0.48,0.005],[0.023,0.026],[0.396,0.078],[0.381,0.004],[0.723,0.048],[0.555,0.091],[0.729,0.07],[0.57,0.025],[0.475,0.04],[0.471,0.148],[0.338,0.035],[0.473,0.171],[0.543,0.012],[0.855,0.007],[0.51,0.005],[0.84,0.036],[0.666,0.034],[0.486,0.073]],
  desert:[[0.49,0.016],[0.664,0.008],[0.861,0.141],[0.471,0.034],[0.037,0.068],[0.178,0.018],[0.809,0.152],[0.523,0.047],[0.51,0.029],[0.34,0.155],[0.609,0.03],[0.969,0.047],[0.76,0.096],[0.229,0.048],[0.42,0.038],[0.67,0.051],[0.895,0.043],[0.455,0.167],[0.076,0.076],[0.932,0.043],[0.459,0.01],[0.92,0.025],[0.553,0.022],[0.322,0.138],[0.338,0.082],[0.068,0.151],[0.484,0.078],[0.574,0.01],[0.266,0.138],[0.924,0.135],[0.713,0.07],[0.859,0.07],[0.615,0.007],[0.961,0.029],[0.742,0.134],[0.551,0.047]],
  memory_lake:[[0.664,0.04],[0.609,0.081],[0.725,0.023],[0.809,0.013],[0.646,0.012],[0.984,0.073],[0.973,0.018],[0.57,0.092],[0.508,0.039],[0.703,0.072],[0.51,0.105],[0.627,0.061],[0.488,0.014],[0.635,0.034],[0.738,0.065],[0.602,0.016],[0.541,0.111],[0.883,0.098],[0.555,0.053],[0.906,0.085],[0.523,0.055],[0.945,0.091],[0.732,0.129],[0.537,0.029],[0.578,0.158],[0.805,0.108],[0.846,0.064],[0.4,0.076],[0.713,0.047],[0.705,0.004],[0.754,0.047],[0.475,0.083],[0.248,0.159],[0.545,0.081],[0.389,0.129],[0.68,0.133]]
});

const LIGHT = {
  morning:{wind:'255,250,236', glint:'255,246,214', band:'255,244,206'},
  day:{wind:'255,255,255', glint:'255,255,255', band:'255,252,214'},
  evening:{wind:'255,226,190', glint:'255,214,150', band:'255,196,120'},
  night:{wind:'196,214,246', glint:'206,222,255', band:'170,196,240'}
};

// One gust at a time crosses each region. It rises, holds and dies away, then the air rests.
// The direction changes from gust to gust; a light breeze never quite stops.
const EXPOSURE = {forest:.9, river_lake:.85, city:.5, countryside:1, mountain:1.15, snow:.9, sea:1.1, jungle:.45, desert:1.2};
export function gustAt(region, seconds) {
  const period = 11.5, index = Math.floor(seconds / period), local = seconds - index * period;
  const length = 4.2 + 2.6 * hash(index * 7 + 11), start = 1.2 + 2 * hash(index * 7 + 5);
  const p = (local - start) / length;
  const power = p > 0 && p < 1 ? smooth(p / .22) * smooth((1 - p) / .35) * (.7 + .3 * hash(index * 7 + 3)) : 0;
  return {power:power * (EXPOSURE[region] ?? 0), progress:clamp(p), direction:hash(index * 7 + 1) < .35 ? -1 : 1, index};
}

// Soft tapering streaks that ride the gust across the scene, like wind made visible.
function windStreaks(ctx, region, time, weather, seconds) {
  const exposure = EXPOSURE[region];
  if (!exposure) return;
  const gust = gustAt(region, seconds), tone = LIGHT[time] || LIGHT.day;
  const stormy = weather === 'rain' || weather === 'snow' ? 1.25 : 1;
  ctx.lineCap = 'round';
  for (let i = 0; i < 9; i++) {
    const id = gust.index * 131 + i * 17, breeze = i < 2;
    const power = breeze ? .32 * exposure : gust.power * stormy;
    if (power < .03) continue;
    // Streak i enters a little after its neighbours and crosses at its own height and speed.
    const lag = breeze ? unit(seconds / (9 + 4 * i) + hash(i + 71)) : clamp(gust.progress * 1.5 - .5 * hash(id + 2));
    if (lag <= 0 || lag >= 1) continue;
    const direction = breeze ? 1 : gust.direction, depth = hash(id + 3);
    const y = 130 + 1150 * hash(id + 4), length = 190 + 240 * depth;
    const head = direction > 0 ? -length + (1000 + 2 * length) * lag : 1000 + length - (1000 + 2 * length) * lag;
    const lift = 26 + 34 * hash(id + 5), bow = seconds * (1.1 + hash(id + 6)) + i;
    const alpha = power * (.14 + .2 * depth) * Math.sin(Math.PI * lag);
    for (let k = 0; k < 10; k++) {
      // The streak thins and fades toward its tail.
      const a = k / 10, b = (k + 1) / 10;
      const x0 = head - direction * length * a, x1 = head - direction * length * b;
      const y0 = y + lift * Math.sin(bow + a * 2.6) - 40 * a * a, y1 = y + lift * Math.sin(bow + b * 2.6) - 40 * b * b;
      ctx.globalAlpha = alpha * (1 - a) ** 1.4;
      ctx.lineWidth = (1.2 + 3.4 * depth) * (1 - .7 * a);
      ctx.strokeStyle = `rgb(${tone.wind})`;
      ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
    }
  }
}

// Open ground that a gust visibly crosses: a lit crest with a shaded trough behind it.
const GROUND = {
  forest:[[0,880],[250,850],[520,838],[800,852],[1000,880],[1000,1500],[0,1500]],
  countryside:[[0,690],[330,560],[470,520],[640,560],[1000,640],[1000,1500],[0,1500]],
  mountain:[[0,640],[400,560],[1000,620],[1000,1500],[0,1500]],
  river_lake:[[0,560],[150,470],[520,720],[1000,1010],[1000,1500],[0,1500]],
  desert:[[0,420],[1000,400],[1000,1500],[0,1500]],
  snow:[[0,760],[420,700],[1000,720],[1000,1500],[0,1500]]
};
function groundWaves(ctx, region, time, seconds) {
  const ground = GROUND[region];
  if (!ground) return;
  const gust = gustAt(region, seconds), tone = LIGHT[time] || LIGHT.day;
  ctx.save();
  ctx.beginPath();
  ground.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y));
  ctx.closePath(); ctx.clip();
  const night = time === 'night' ? .55 : 1;
  for (let k = 0; k < 3; k++) {
    // Three crests follow one another; between gusts a slow, faint one keeps the field breathing.
    const calm = unit(seconds / 13 + k / 3), p = gust.power > .05 ? clamp(gust.progress * 1.25 - k * .16) : calm;
    const strength = gust.power > .05 ? gust.power : .22 * (EXPOSURE[region] ?? 0);
    if (p <= 0 || p >= 1) continue;
    const direction = gust.power > .05 ? gust.direction : 1;
    const centre = direction > 0 ? -260 + 1520 * p : 1260 - 1520 * p, width = 170 + 60 * k;
    const lean = direction * 190; // the crest lies across the slope, farther up means farther along
    const band = (offset, rgb, alpha) => {
      const g = ctx.createLinearGradient(centre + offset - width, 0, centre + offset + width, 0);
      g.addColorStop(0, `rgba(${rgb},0)`); g.addColorStop(.5, `rgba(${rgb},${alpha})`); g.addColorStop(1, `rgba(${rgb},0)`);
      ctx.fillStyle = g;
      ctx.save(); ctx.transform(1, 0, -lean / 900, 1, lean * 1.25, 0);
      ctx.fillRect(centre + offset - width, 400, 2 * width, 1100); ctx.restore();
    };
    const fade = Math.sin(Math.PI * p) * strength * night;
    band(0, tone.band, .34 * fade);
    band(-direction * width * .9, '18,44,34', .2 * fade);
  }
  ctx.restore();
}

// The river runs toward the viewer's left: bright slips of current slide downstream from
// every sampled point of the painted water, each with its own length, speed and rest.
export function riverFlow(ctx, time, weather, seconds, {gain = 1, every = 1} = {}) {
  const tone = LIGHT[time] || LIGHT.day, spots = RAIN_WATER.river_lake, dull = weather === 'sunny' ? 1 : .6;
  ctx.lineCap = 'round';
  ctx.strokeStyle = `rgb(${tone.glint})`;
  spots.forEach(([u, v], i) => {
    if (i % every) return;
    const depth = clamp((v - .21) / .36), period = 1.5 + 1.7 * hash(i + 601);
    const p = unit(seconds / period + hash(i + 617));
    const travel = (70 + 130 * depth) * p, length = (22 + 46 * depth) * (.6 + .8 * hash(i + 631));
    const x = u * 1000 - .86 * travel, y = v * 1500 + .34 * travel + 3 * Math.sin(seconds * 2.3 + i);
    ctx.globalAlpha = gain * (.3 + .5 * depth) * dull * Math.sin(Math.PI * p) ** 1.5 * (time === 'night' ? .7 : 1);
    ctx.lineWidth = (1.2 + 2.2 * depth) * (gain < 1 ? .7 : 1);
    ctx.beginPath(); ctx.moveTo(x, y);
    ctx.quadraticCurveTo(x - .43 * length, y + .17 * length - 3, x - .86 * length, y + .34 * length);
    ctx.stroke();
  });
}

// Long swells roll in from the horizon and steepen toward the beach, and the whole surface
// glitters: every sampled point of the painted sea flashes on its own beat.
const SEA = {horizon:.246, shore:.57, sun:{morning:.15, day:.68, evening:.76, night:.65}};
const SEA_MASK = [[.01,.244],[.99,.244],[.99,.33],[.89,.35],[.88,.39],[.97,.41],[.97,.49],[.87,.50],[.82,.56],[.61,.585],[.4,.582],[.21,.57],[.12,.55],[.02,.56],[.02,.48],[.18,.46],[.22,.41],[.17,.39],[.06,.39],[.07,.34],[.22,.33],[.22,.306],[.01,.304]];
function seaSwell(ctx, time, weather, seconds) {
  const tone = LIGHT[time] || LIGHT.day, overcast = weather === 'sunny' ? 1 : .55, storm = weather === 'rain' ? 1.3 : 1;
  ctx.save();
  ctx.beginPath();
  SEA_MASK.forEach(([x, y], i) => i ? ctx.lineTo(x * 1000, y * 1500) : ctx.moveTo(x * 1000, y * 1500));
  ctx.closePath(); ctx.clip();
  ctx.lineCap = 'round';
  for (let k = 0; k < 11; k++) {
    // d runs 0 at the horizon to 1 at the beach; perspective packs the far swells together.
    const d = unit(seconds * .042 * storm + k / 11), z = SEA.horizon + (SEA.shore - SEA.horizon) * d ** 1.7;
    const amplitude = (2 + 15 * d) * storm, reach = 90 + 240 * d;
    ctx.lineWidth = 1 + 4.6 * d;
    for (const [rgb, shift, gain] of [['8,40,74', 5 + 9 * d, .26], [tone.glint, 0, .55]]) {
      ctx.strokeStyle = `rgb(${rgb})`;
      const level = gain * overcast * smooth(d / .12) * smooth((1 - d) / .1) * (time === 'night' ? .75 : 1);
      const height = x => z * 1500 + shift + amplitude * Math.sin(x / reach + seconds * (.7 + .5 * d) + k * 1.9)
        + .4 * amplitude * Math.sin(x / (reach * .37) - seconds * 1.3 + k);
      // A crest is not one unbroken line: it catches the light in runs that drift along it.
      for (let x = -20; x < 1020; x += 34) {
        const run = Math.sin(x / (150 + 90 * d) + k * 2.1 + seconds * .35) + .6 * Math.sin(x / 57 - k * 1.3 - seconds * .5);
        if (run < .15) continue;
        ctx.globalAlpha = level * Math.min(1, run);
        ctx.beginPath(); ctx.moveTo(x, height(x)); ctx.lineTo(x + 17, height(x + 17)); ctx.lineTo(x + 34, height(x + 34)); ctx.stroke();
      }
    }
  }
  ctx.restore();
}
function sparkle(ctx, x, y, radius) {
  ctx.beginPath();
  ctx.moveTo(x, y - radius); ctx.quadraticCurveTo(x + radius * .14, y - radius * .14, x + radius * .8, y);
  ctx.quadraticCurveTo(x + radius * .14, y + radius * .14, x, y + radius);
  ctx.quadraticCurveTo(x - radius * .14, y + radius * .14, x - radius * .8, y);
  ctx.quadraticCurveTo(x - radius * .14, y - radius * .14, x, y - radius);
  ctx.fill();
}
export function waterGlints(ctx, region, time, weather, seconds, {gain = 1, size = 1} = {}) {
  const spots = RAIN_WATER[region];
  if (!spots || weather !== 'sunny' && weather !== 'cloudy') return;
  const tone = LIGHT[time] || LIGHT.day, sun = region === 'sea' ? SEA.sun[time] : null;
  ctx.fillStyle = `rgb(${tone.glint})`;
  spots.forEach(([u, v], i) => {
    const period = 1.1 + 2.6 * hash(i + 811), cycle = seconds / period + hash(i + 823), turn = Math.floor(cycle);
    // A third of the beats stay dark, so the glitter never pulses as one.
    if (hash(i * 53 + turn) < .34) return;
    const beat = Math.sin(Math.PI * unit(cycle)) ** 3, depth = clamp((v - .25) / .3);
    // Points near the sun's or moon's path flash brighter and larger.
    const path = sun == null ? .35 : Math.exp(-(((u - sun) / .13) ** 2));
    const x = (u + (hash(i * 59 + turn) - .5) * .03) * 1000, y = (v + (hash(i * 61 + turn) - .5) * .012) * 1500;
    ctx.globalAlpha = gain * beat * (.4 + .6 * path) * (weather === 'cloudy' ? .45 : 1);
    sparkle(ctx, x, y, size * (4.5 + 8 * depth) * (.7 + .9 * path));
  });
}

// Fireflies: each has a home, wanders on its own looping path at its own pace, glows and
// rests on its own rhythm, and now and then drifts off to a new spot.
const FIREFLY_ZONES = {
  forest:[70,930,640,1180,16], countryside:[60,940,560,1080,14], river_lake:[40,700,520,1000,12],
  jungle:[140,860,520,1040,14], memory_lake:[90,910,470,960,12]
};
const brushes = new Map();
function glowBrush(doc, rgb) {
  if (brushes.has(rgb)) return brushes.get(rgb);
  const canvas = typeof OffscreenCanvas === 'function' ? new OffscreenCanvas(64, 64) : doc?.createElement('canvas');
  if (!canvas) return null;
  canvas.width = canvas.height = 64;
  const c = canvas.getContext('2d'), g = c.createRadialGradient(32,32,0,32,32,32);
  g.addColorStop(0, `rgba(${rgb},1)`); g.addColorStop(.22, `rgba(${rgb},.75)`);
  g.addColorStop(.55, `rgba(${rgb},.18)`); g.addColorStop(1, `rgba(${rgb},0)`);
  c.fillStyle = g; c.fillRect(0,0,64,64);
  brushes.set(rgb, canvas);
  return canvas;
}
export function fireflyAt(region, i, seconds) {
  const [x0, x1, y0, y1] = FIREFLY_ZONES[region], r = n => hash(i * 97 + n + 2001);
  // Every 20–40 s the fly eases over to a fresh home.
  const stay = 20 + 20 * r(1), stage = seconds / stay + r(2), move = smooth((unit(stage) - .82) / .18);
  const home = turn => [x0 + (x1 - x0) * hash(i * 89 + turn * 13 + 5), y0 + (y1 - y0) * hash(i * 83 + turn * 17 + 7)];
  const [ax, ay] = home(Math.floor(stage)), [bx, by] = home(Math.floor(stage) + 1);
  const pace = .16 + .34 * r(3), reach = 34 + 70 * r(4), t = seconds * pace + r(5) * 40;
  const x = ax + (bx - ax) * move + reach * (Math.sin(t) + .45 * Math.sin(2.3 * t + r(6) * TAU));
  const y = ay + (by - ay) * move + reach * .55 * (Math.sin(1.31 * t + r(7) * TAU) + .5 * Math.cos(.7 * t));
  const period = 2.2 + 3.6 * r(8), cycle = seconds / period + r(9), resting = hash(i * 71 + Math.floor(cycle)) < .28;
  return {x, y, glow:resting ? 0 : Math.sin(Math.PI * unit(cycle)) ** 2.2, size:.75 + .6 * r(10)};
}
export function fireflies(ctx, region, time, seconds, doc, {gain = 1, size = 1} = {}) {
  const zone = FIREFLY_ZONES[region];
  if (!zone) return;
  const lake = region === 'memory_lake', brush = glowBrush(doc, lake ? '196,220,255' : '214,255,120');
  const core = glowBrush(doc, lake ? '244,240,255' : '255,255,210');
  if (!brush || !core) return;
  for (let i = 0; i < zone[4]; i++) {
    const fly = fireflyAt(region, i, seconds), a = gain * fly.glow * (time === 'night' ? 1 : .75);
    if (a < .02) continue;
    const halo = 46 * fly.size * size, dot = 11 * fly.size * size;
    ctx.globalAlpha = a * .8; ctx.drawImage(brush, fly.x - halo, fly.y - halo, 2 * halo, 2 * halo);
    ctx.globalAlpha = a; ctx.drawImage(core, fly.x - dot, fly.y - dot, 2 * dot, 2 * dot);
  }
}

// Stars twinkle one by one on their own beats, and once in a while one falls.
export function nightSky(ctx, region, seconds, {gain = 1, size = 1, meteorEvery = 17} = {}) {
  const stars = NIGHT_STARS[region];
  if (!stars) return;
  ctx.fillStyle = '#f4f7ff';
  stars.forEach(([u, v], i) => {
    const period = 1.6 + 4.2 * hash(i + 3001), cycle = seconds / period + hash(i + 3011);
    if (hash(i * 41 + Math.floor(cycle)) < .45) return;
    const beat = Math.sin(Math.PI * unit(cycle)) ** 2;
    ctx.globalAlpha = .85 * beat * gain;
    sparkle(ctx, u * 1000, v * 1500, size * (5 + 9 * hash(i + 3023) * beat));
  });
  const every = meteorEvery, turn = Math.floor(seconds / every), p = (seconds - turn * every) / 1.1;
  if (p < 1 && hash(turn * 29 + 3) < .7) {
    const x = 180 + 640 * hash(turn * 29 + 5), y = 40 + 150 * hash(turn * 29 + 7), side = hash(turn * 29 + 9) < .5 ? -1 : 1;
    const hx = x + side * 260 * p, hy = y + 110 * p, tail = 150 * Math.sin(Math.PI * p);
    const g = ctx.createLinearGradient(hx, hy, hx - side * tail * .92, hy - tail * .39);
    g.addColorStop(0, 'rgba(255,255,255,.95)'); g.addColorStop(1, 'rgba(200,220,255,0)');
    ctx.globalAlpha = Math.sin(Math.PI * p);
    ctx.strokeStyle = g; ctx.lineWidth = 2.6; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(hx - side * tail * .92, hy - tail * .39); ctx.stroke();
  }
}

const BUGS = new Set(['forest','countryside','river_lake','jungle']);
// Draws over the reused painters. `scene` is the painting on screen; `env` the season and weather.
// During a daypart cross-fade the caller passes only the painting that currently dominates.
export function paintMaximum(ctx, scene, env, seconds, doc) {
  const {region, time} = scene, clear = env.weather === 'sunny' || env.weather === 'cloudy';
  ctx.save();
  const layer = draw => { ctx.save(); draw(); ctx.restore(); };
  layer(() => groundWaves(ctx, region, time, seconds));
  if (region === 'river_lake') layer(() => riverFlow(ctx, time, env.weather, seconds));
  if (region === 'sea') layer(() => seaSwell(ctx, time, env.weather, seconds));
  layer(() => waterGlints(ctx, region, time, env.weather, seconds));
  if (time === 'night' && env.weather === 'sunny') layer(() => nightSky(ctx, region, seconds));
  const dusk = time === 'evening' || time === 'night';
  if (dusk && clear && (region === 'memory_lake' || BUGS.has(region) && env.season === 'summer')) layer(() => fireflies(ctx, region, time, seconds, doc));
  layer(() => windStreaks(ctx, region, time, env.weather, seconds));
  ctx.restore();
}
