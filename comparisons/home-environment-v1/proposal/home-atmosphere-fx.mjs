// Presentation-only rain, snow and spring petals for the painted 2.5D home.
// Positions are fractions of the 1000 × 1500 painting, so every particle keeps
// its place on the artwork at any crop. Motion runs on CSS transforms only.
function hash(value) {
  let bits = Math.imul(value ^ (value >>> 16), 0x21f0aaad);
  bits = Math.imul(bits ^ (bits >>> 15), 0x735a2d97);
  return ((bits ^ (bits >>> 15)) >>> 0) / 4294967296;
}
const fixed = (value, digits = 4) => Number(value.toFixed(digits));
const mix = (lo, hi, t) => lo + (hi - lo) * t;

export const FX_COUNTS = Object.freeze({rain:[96,54,28], snow:[80,44,22], petal:[18,11,6]});
// The indoor home only shows weather through its window.
export const HOME_WINDOW = Object.freeze({x0:.27, x1:.57, y0:.115, y1:.31});
// Painted water that a raindrop can land on.
export const RAIN_WATER = Object.freeze({
  sea:[[.16,.30],[.52,.27],[.82,.32],[.33,.38],[.68,.42],[.12,.46],[.88,.48],[.47,.50]],
  river_lake:[[.42,.27],[.60,.24],[.78,.25],[.55,.32],[.72,.34],[.90,.36],[.82,.42]],
  jungle:[[.24,.46],[.42,.45],[.58,.47],[.34,.49],[.66,.49]]
});
// Few trees stand on the alpine path, so its petals arrive on the valley wind.
const PETAL_SCALE = Object.freeze({mountain:.4});

function fallStyle(x, y0, y1, drift, duration, phase, alpha) {
  return `left:${fixed(x * 100, 2)}%;--y0:${fixed(y0)};--y1:${fixed(y1)};--dx:${fixed(drift)};` +
    `--dur:${fixed(duration, 2)}s;--delay:-${fixed(phase * duration, 2)}s;--a:${fixed(alpha, 2)}`;
}

function rain(i, seed, box, indoor) {
  const id = seed + i * 79, z = i % 3, r = n => hash(id + n);
  const far = z === 0, near = z === 2, span = box.y1 - box.y0;
  const length = (far ? .022 : near ? .055 : .036) * mix(.78, 1.25, r(1)) * (indoor ? .55 : 1);
  const land = indoor ? box.y1 : box.y0 + span * (far ? mix(.52,.74,r(2)) : near ? mix(.94,1,r(2)) : mix(.70,.95,r(2)));
  const y0 = box.y0 - length, y1 = land - length;
  // One shared lean with a small spread: the rain falls straight, never fanned.
  const tilt = 2.2 + 1.6 * (r(3) - .5), drift = (y1 - y0) * Math.tan(tilt * Math.PI / 180);
  const speed = (far ? .86 : near ? 1.5 : 1.14) * mix(.9, 1.12, r(4));
  const alpha = (far ? .44 : near ? .8 : .62) * (indoor ? .6 : 1);
  return `<i class="hfx hfx-rain" style="${fallStyle(mix(box.x0, box.x1, r(5)) - drift, y0, y1, drift, (y1 - y0) / speed, r(6), alpha)}">` +
    `<b style="--len:${fixed(length)};--wd:${indoor ? 1 : far ? 1.1 : near ? 2 : 1.5}px;--tilt:${fixed(-tilt, 2)}deg"></b></i>`;
}

function snow(i, seed, box, indoor) {
  const id = seed + i * 83, z = i % 3, r = n => hash(id + n);
  const far = z === 0, near = z === 2, span = box.y1 - box.y0;
  const size = (far ? mix(2.4,3.6,r(1)) : near ? mix(6.5,10,r(1)) : mix(4,6,r(1))) * (indoor ? .6 : 1);
  const land = indoor ? box.y1 : box.y0 + span * (far ? mix(.50,.74,r(2)) : near ? 1 : mix(.72,.96,r(2)));
  // Near flakes cross faster and swing wider; distant ones keep a narrow path.
  const duration = (far ? mix(17,22,r(3)) : near ? mix(8.5,10.5,r(3)) : mix(12,15,r(3))) * (indoor ? .5 : 1);
  const drift = (far ? mix(.02,.06,r(4)) : near ? mix(.06,.15,r(4)) : mix(.04,.10,r(4))) * (indoor ? .3 : 1);
  const sway = (far ? .005 : near ? mix(.018,.03,r(5)) : mix(.010,.016,r(5))) * (indoor ? .4 : 1);
  const alpha = far ? .66 : near ? .96 : .86;
  return `<i class="hfx hfx-snow" style="${fallStyle(mix(box.x0, box.x1, r(6)) - drift * .5, box.y0, land, drift, duration, r(7), alpha)}">` +
    `<b style="--size:${fixed(size, 1)}px;--sway:${fixed(sway)};--sd:${fixed(mix(2.6,5.2,r(8)), 2)}s;--sdelay:-${fixed(r(9) * 5, 2)}s"></b></i>`;
}

function petal(i, seed) {
  const id = seed + i * 89, z = i % 3, r = n => hash(id + n);
  const far = z === 0, near = z === 2;
  const size = far ? mix(6,7.5,r(1)) : near ? mix(11.5,14,r(1)) : mix(8.5,10.5,r(1));
  // Petals leave the canopy at different heights and settle on the ground.
  const y0 = mix(-.04, .30, r(2)), y1 = far ? mix(.58,.72,r(3)) : near ? mix(.96,1.02,r(3)) : mix(.74,.94,r(3));
  const duration = (y1 - y0) * (far ? mix(30,36,r(4)) : near ? mix(17,21,r(4)) : mix(22,27,r(4)));
  const drift = mix(.07, .22, r(5)) * (r(6) < .22 ? -.5 : 1);
  const alpha = far ? .72 : .92;
  return `<i class="hfx hfx-petal" style="${fallStyle(mix(.02,.98,r(7)) - drift * .5, y0, y1, drift, duration, r(8), alpha)}">` +
    `<b style="--sway:${fixed(mix(.014,.034,r(9)))};--sd:${fixed(mix(2.8,4.6,r(10)), 2)}s;--sdelay:-${fixed(r(11) * 5, 2)}s;--lean:${fixed(mix(14,34,r(12)), 1)}deg">` +
    `<u class="hfx-petal-${i % 3}" style="--size:${fixed(size, 1)}px;--fd:${fixed(mix(2.6,5.4,r(13)), 2)}s;--fdelay:-${fixed(r(14) * 5, 2)}s"></u></b></i>`;
}

function ripples(region, tier) {
  const spots = RAIN_WATER[region] || [];
  return spots.slice(0, [spots.length, 5, 3][tier]).map(([x, y], i) => {
    const duration = 1.9 + .5 * hash(i + 4099);
    // Rings widen toward the viewer with the painted perspective.
    return `<i class="hfx-ripple" style="left:${fixed(x * 100, 1)}%;top:${fixed(y * 100, 1)}%;--size:${fixed(.022 + .05 * (y - .2))};` +
      `--dur:${fixed(duration, 2)}s;--delay:-${fixed(hash(i + 4211) * duration, 2)}s"></i>`;
  }).join('');
}

// Returns null for the deep sea and star scenes, which keep their own drifting lights.
export function fxMarkup(env, mood, {tier = 0, reducedMotion = false} = {}) {
  const kind = mood.particle;
  if (kind === 'plankton' || kind === 'spark') return null;
  if (reducedMotion || !FX_COUNTS[kind]) return '';
  const level = Math.min(2, Math.max(0, tier | 0)), indoor = env.region === 'home';
  const box = indoor ? HOME_WINDOW : {x0:-.02, x1:1.02, y0:-.04, y1:1.03};
  const count = Math.round(FX_COUNTS[kind][level] * (indoor ? .25 : kind === 'petal' ? PETAL_SCALE[env.region] ?? 1 : 1));
  const draw = kind === 'rain' ? rain : kind === 'snow' ? snow : petal;
  let html = '';
  for (let i = 0; i < count; i++) html += draw(i, kind.length * 1009, box, indoor);
  return html + (kind === 'rain' ? ripples(env.region, level) : '');
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
