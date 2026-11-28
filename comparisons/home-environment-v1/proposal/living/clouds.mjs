// Clouds with shape. Each layer is a field of fractal noise drifting across the sky; where the
// field rises above a level set by the cover there is cloud, so edges are billowed, not round.
// Tops are lit and undersides shaded by comparing the field with itself a little lower down.
// Toward the horizon the field is squeezed, so far clouds are small and flat and near ones large.
// Clouds are drawn only inside the sky found by skyline.mjs: never over hills, trees or roofs.
import {SKY, SKY_W as W, SKY_H as H, findSky} from './skyline.mjs';
export {SKY};
const clamp = (v, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, v));
const smooth = v => { const t = clamp(v); return t * t * (3 - 2 * t); };
function hash(value) {
  let bits = Math.imul(value ^ (value >>> 16), 0x21f0aaad);
  bits = Math.imul(bits ^ (bits >>> 15), 0x735a2d97);
  return ((bits ^ (bits >>> 15)) >>> 0) / 4294967296;
}
// A 128 × 128 tile of four-octave noise that repeats seamlessly, built once.
const N = 128;
let tile = null;
function noiseTile() {
  if (tile) return tile;
  tile = new Float32Array(N * N);
  let lo = 1e9, hi = -1e9;
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    let v = 0, amp = .5;
    for (let o = 0, cells = 4; o < 4; o++, cells *= 2, amp *= .5) {
      const fx = x / N * cells, fy = y / N * cells, ix = Math.floor(fx), iy = Math.floor(fy), tx = smooth(fx - ix), ty = smooth(fy - iy);
      const at = (i, j) => hash(((i % cells) * 73 + (j % cells) * 151 + o * 1013) | 0);
      v += amp * ((at(ix, iy) * (1 - tx) + at(ix + 1, iy) * tx) * (1 - ty) + (at(ix, iy + 1) * (1 - tx) + at(ix + 1, iy + 1) * tx) * ty);
    }
    tile[y * N + x] = v; lo = Math.min(lo, v); hi = Math.max(hi, v);
  }
  for (let i = 0; i < tile.length; i++) tile[i] = (tile[i] - lo) / (hi - lo);
  return tile;
}
function field(u, v) {
  const t = noiseTile(), fx = ((u % 1) + 1) % 1 * N, fy = ((v % 1) + 1) % 1 * N, ix = fx | 0, iy = fy | 0, tx = fx - ix, ty = fy - iy;
  const x1 = (ix + 1) % N, y1 = (iy + 1) % N;
  return (t[iy * N + ix] * (1 - tx) + t[iy * N + x1] * tx) * (1 - ty) + (t[y1 * N + ix] * (1 - tx) + t[y1 * N + x1] * tx) * ty;
}
// Two layers: high, small and slow behind; low, large and quicker in front.
const LAYERS = [{scale:1.9, speed:.0022, seed:.37, weight:.8}, {scale:1.05, speed:.0052, seed:.81, weight:1}];
// Thickness of cloud, 0..1, at a point of the sky. u across (0–1 of the sky's width), d down
// (0 at the top of the sky, 1 at the horizon). The shape slowly changes as two copies of the
// field slide past each other.
// Returns the raw field as well, which carries the cloud's inner light and dark even where the
// cloud itself is solid.
function cloudField(u, d, seconds, layer, stormy) {
  const L = LAYERS[layer], squeeze = 1 + 1.3 * d * d, wind = seconds * L.speed * (stormy ? 1.7 : 1);
  const a = field(u * L.scale * 2 + wind + L.seed, d * L.scale * squeeze * .8 + L.seed * 3);
  const b = field(u * L.scale * 3.1 - wind * .6 + L.seed * 7, d * L.scale * squeeze * 1.3 + seconds * .0011);
  return a * .82 + b * .18;
}
// More cover lowers the level the field must clear, and overcast leaves no gaps.
const solid = (n, cover) => smooth((n - (.78 - .62 * cover - .4 * smooth((cover - .75) / .25))) / (.2 + .1 * cover));
export function cloudDensity(u, d, seconds, cover, layer, stormy = false) {
  return solid(cloudField(u, d, seconds, layer, stormy), cover);
}
// How much of the sky above a point (in painting units) is hidden by cloud right now.
export function cloudVeil(region, x, y, seconds, cover, layers = 2, stormy = false) {
  const sky = SKY[region];
  if (!sky || !(cover > .02)) return 0;
  const [x0, x1] = sky.box || [0, 1], u = (x / 1000 - x0) / (x1 - x0), d = clamp((y / 1500 - (sky.from || 0)) / (sky.to - (sky.from || 0)));
  let clear = 1;
  for (let l = 2 - layers; l < 2; l++) clear *= 1 - cloudDensity(u, d, seconds, cover, l, stormy) * LAYERS[l].weight * .92;
  return 1 - clear;
}
const TONE = {
  // lit top, shaded underside
  sunny:{morning:[[255,246,236],[214,214,226]], day:[[255,255,255],[206,216,232]], evening:[[255,214,176],[176,138,156]], night:[[104,118,158],[34,44,78]]},
  cloudy:{morning:[[238,238,240],[168,174,186]], day:[[244,246,248],[162,170,184]], evening:[[226,196,184],[136,120,138]], night:[[86,96,128],[28,36,64]]},
  rain:{morning:[[190,196,206],[98,106,122]], day:[[188,196,206],[92,102,120]], evening:[[166,154,164],[82,78,100]], night:[[64,72,100],[20,26,48]]},
  snow:{morning:[[246,247,250],[190,196,208]], day:[[248,249,252],[192,198,210]], evening:[[232,216,216],[166,156,172]], night:[[100,110,138],[40,48,76]]}
};
const skies = new WeakMap();
const canvasOf = (doc, w, h) => { const c = typeof OffscreenCanvas === 'function' ? new OffscreenCanvas(w, h) : doc.createElement('canvas'); c.width = w; c.height = h; return c; };
function skyOf(day, region, doc) {
  if (skies.has(day)) return skies.get(day);
  const c = canvasOf(doc, W, H).getContext('2d', {willReadFrequently:true});
  c.drawImage(day, 0, 0, W, H);
  let found = null;
  try { found = findSky(c.getImageData(0, 0, W, H).data, region); } catch { /* unreadable painting: no clouds */ }
  skies.set(day, found);
  return found;
}
let work = null, pixels = null, drawn = {};
// cover: 0 a clear sky … 1 overcast. layers: 1 a single deck, 2 with a high far layer behind.
export function paintClouds(ctx, day, region, time, weather, seconds, cover, doc, layers = 2) {
  const sky = SKY[region];
  if (!sky || !day || !(cover > .02)) return;
  const found = skyOf(day, region, doc);
  if (!found) return;
  if (!work) { work = canvasOf(doc, W, H); pixels = work.getContext('2d').createImageData(W, H); }
  // Clouds drift slowly, so their picture is worked out four times a second and reused between.
  const key = [region, time, weather, layers].join(), fresh = drawn.key === key && drawn.day === day && Math.abs(seconds - drawn.at) < .25 && Math.abs(cover - drawn.cover) < .02;
  // Only the band that holds sky is copied to the backdrop, never the whole painting.
  const [bx0, bx1] = sky.box || [0, 1], sx = Math.floor(bx0 * W), sw = Math.ceil(bx1 * W) - sx, sy = Math.floor((sky.from || 0) * H), sh = Math.ceil(sky.to * H) + 1 - sy;
  const place = () => { ctx.save(); ctx.imageSmoothingEnabled = true; ctx.drawImage(work, sx, sy, sw, sh, sx * 1000 / W, sy * 1500 / H, sw * 1000 / W, sh * 1500 / H); ctx.restore(); };
  if (fresh) { place(); return; }
  drawn = {key, day, at:seconds, cover};
  const tone = (TONE[weather] || TONE.sunny)[time] || TONE.sunny.day, [lit, shade] = tone, out = pixels.data, mask = found.mask;
  const [x0, x1] = sky.box || [0, 1], top = (sky.from || 0), span = sky.to - top, stormy = weather === 'rain' || weather === 'snow';
  const rows = Math.ceil(sky.to * H) + 1, ix0 = Math.floor(x0 * W), ix1 = Math.ceil(x1 * W);
  out.fill(0);
  for (let j = Math.floor(top * H); j < rows; j++) {
    const d = clamp((j / H - top) / span);
    for (let i = ix0; i < ix1; i++) {
      const m = mask[j * W + i];
      if (!m) continue;
      const u = (i / W - x0) / (x1 - x0);
      let r = 0, g = 0, b = 0, alpha = 0;
      for (let l = 2 - layers; l < 2; l++) {
        const n = cloudField(u, d, seconds, l, stormy), here = solid(n, cover);
        if (here < .01) continue;
        // Light comes from above: where the cloud thickens downward we are looking at its lit
        // top, where it thins we are under it. Thick cloud is darker at its heart.
        const below = cloudField(u, d + .05, seconds, l, stormy), above = cloudField(u, d - .05, seconds, l, stormy);
        const light = clamp(.5 + 2.6 * (below - above) + .9 * (n - .5) * (stormy ? -1 : .4) - (stormy ? .1 : 0) + (l === 0 ? -.1 : 0));
        const a = here * LAYERS[l].weight * (l === 0 ? .8 : .94), k = a * (1 - alpha);
        r += k * (shade[0] + (lit[0] - shade[0]) * light); g += k * (shade[1] + (lit[1] - shade[1]) * light); b += k * (shade[2] + (lit[2] - shade[2]) * light);
        alpha += k;
      }
      if (alpha < .004) continue;
      const k = 4 * (j * W + i);
      out[k] = r / alpha; out[k + 1] = g / alpha; out[k + 2] = b / alpha; out[k + 3] = alpha * m;
    }
  }
  work.getContext('2d').putImageData(pixels, 0, 0);
  place();
}
// The earlier, simpler clouds (soft puffs over a flat base), kept only for comparison.
let puff = null, flat = null;
export function paintCloudsFlat(ctx, day, region, time, weather, seconds, cover, doc) {
  const sky = SKY[region], found = sky && day && cover > .02 ? skyOf(day, region, doc) : null;
  if (!found) return;
  if (!puff) { puff = canvasOf(doc, 64, 64); const c = puff.getContext('2d'), g = c.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(.45, 'rgba(255,255,255,.6)'); g.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = g; c.fillRect(0, 0, 64, 64); }
  if (!flat) flat = canvasOf(doc, W, H);
  const c = flat.getContext('2d'), tone = (TONE[weather] || TONE.sunny)[time] || TONE.sunny.day;
  const [x0, x1] = sky.box || [0, 1], span = (x1 - x0) * W, band = sky.to * H;
  c.globalCompositeOperation = 'source-over'; c.globalAlpha = 1; c.clearRect(0, 0, W, H); c.fillStyle = '#fff';
  if (cover > .55) { c.globalAlpha = smooth((cover - .55) / .4) * .94; c.fillRect(x0 * W, 0, span, band + 8); }
  for (let i = 0; i < 16; i++) {
    const present = smooth((cover * 1.25 - i / 16) / .2);
    if (present <= 0) continue;
    const r = n => hash(i * 131 + n), u = ((r(2) + seconds * (.004 + .008 * r(1))) % 1.5) - .25, cx = x0 * W + u * span, cy = band * (.08 + .8 * r(3)), size = (.16 + .2 * r(4)) * span * (.8 + .7 * cover), squash = .34 + .14 * r(5);
    c.globalAlpha = present * (.55 + .4 * cover);
    for (let k = 0; k < 6; k++) { const s = size * (.5 + .35 * hash(i * 17 + k)); c.drawImage(puff, cx + (k - 2.5) * size * .19 - s / 2, cy - s * squash / 2, s, s * squash); }
  }
  c.globalAlpha = 1; c.globalCompositeOperation = 'source-in';
  const g = c.createLinearGradient(0, 0, 0, band + 8);
  g.addColorStop(0, `rgb(${tone[0]})`); g.addColorStop(.8, `rgb(${tone[1]})`); g.addColorStop(1, `rgb(${tone[1]})`);
  c.fillStyle = g; c.fillRect(0, 0, W, H);
  const data = c.getImageData(0, 0, W, H);
  for (let i = 0; i < found.mask.length; i++) data.data[4 * i + 3] = data.data[4 * i + 3] * found.mask[i] / 255;
  c.putImageData(data, 0, 0);
  ctx.save(); ctx.drawImage(flat, 0, 0, 1000, 1500); ctx.restore();
}
// The row (0–1 of the painting's height) where the sky ends above a point, for other painters.
export function skylineAt(day, region, doc, x) {
  const found = SKY[region] && day ? skyOf(day, region, doc) : null;
  return found ? found.line[Math.min(W - 1, Math.max(0, Math.round(x * W)))] / H : 0;
}
