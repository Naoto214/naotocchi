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
// field slide past each other. `look.travel` is how far the wind has carried the clouds (it
// defaults to the clock), `look.size` the scale of their shapes.
function cloudField(u, d, seconds, layer, look) {
  const L = LAYERS[layer], scale = L.scale / (look?.size || 1), squeeze = 1 + 1.3 * d * d, wind = (look?.travel ?? seconds) * L.speed;
  const a = field(u * scale * 2 + wind + L.seed, d * scale * squeeze * .8 + L.seed * 3);
  const b = field(u * scale * 3.1 - wind * .6 + L.seed * 7, d * scale * squeeze * 1.3 + seconds * .0011);
  return a * .82 + b * .18;
}
// More cover lowers the level the field must clear, and overcast leaves no gaps.
const solid = (n, cover) => smooth((n - (.78 - .62 * cover - .4 * smooth((cover - .75) / .25))) / (.2 + .1 * cover));
export function cloudDensity(u, d, seconds, cover, layer, look = null) {
  return solid(cloudField(u, d, seconds, layer, look), cover);
}
const opacity = look => .55 + .45 * (look?.thick ?? 1);
// How much of the sky above a point (in painting units) is hidden by cloud right now.
export function cloudVeil(region, x, y, seconds, cover, look = null) {
  const sky = SKY[region];
  if (!sky || !(cover > .02)) return 0;
  const [x0, x1] = sky.box || [0, 1], u = (x / 1000 - x0) / (x1 - x0), d = clamp((y / 1500 - (sky.from || 0)) / (sky.to - (sky.from || 0)));
  let clear = 1;
  for (let l = 0; l < 2; l++) clear *= 1 - cloudDensity(u, d, seconds, cover, l, look) * LAYERS[l].weight * .92 * opacity(look);
  return 1 - clear;
}
// One palette for every weather: a bright cloud and a dark cloud for each hour, lit top and
// shaded underside. `look.bright` moves between them. Evening tops warm toward the horizon.
const BRIGHT = {morning:[[255,246,232],[216,212,226]], day:[[255,255,255],[204,214,232]], evening:[[255,214,160],[206,140,150]], night:[[128,142,188],[40,50,88]]};
const DARK = {morning:[[176,180,194],[92,98,116]], day:[[178,186,198],[84,94,114]], evening:[[178,146,150],[78,70,96]], night:[[62,70,100],[18,24,46]]};
const GLOW = {evening:[255,168,132], morning:[255,224,206]};
const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
export function cloudTone(time, bright) {
  const hi = BRIGHT[time] || BRIGHT.day, lo = DARK[time] || DARK.day, t = clamp(bright);
  return [mix(lo[0], hi[0], t), mix(lo[1], hi[1], t)];
}
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
let work = null, pixels = null, wide = null, widePixels = null, drawn = {}, placed = null;
// cover: 0 a clear sky … 1 overcast. look: {bright, thick, size, travel} (see home-climate.mjs).
// A drawn cloud picture could later be swapped in here: only this function fills `work`.
export function paintClouds(ctx, day, region, time, seconds, cover, doc, look = null) {
  const sky = SKY[region];
  placed = null;
  if (!sky || !day || !(cover > .02)) return;
  const found = skyOf(day, region, doc);
  if (!found) return;
  if (!work) { work = canvasOf(doc, W, H); pixels = work.getContext('2d').createImageData(W, H); wide = canvasOf(doc, W, H); widePixels = wide.getContext('2d').createImageData(W, H); }
  const bright = look?.bright ?? 1, thick = look?.thick ?? 1, size = look?.size || 1;
  // Clouds drift slowly, so their picture is worked out four times a second and reused between.
  const key = [region, time].join(), fresh = drawn.key === key && drawn.day === day && Math.abs(seconds - drawn.at) < .25 && Math.abs(cover - drawn.cover) < .02
    && Math.abs(bright - drawn.bright) < .02 && Math.abs(thick - drawn.thick) < .03 && Math.abs(size - drawn.size) < .01;
  // Only the band that holds sky is copied to the backdrop, never the whole painting.
  const [bx0, bx1] = sky.box || [0, 1], sx = Math.floor(bx0 * W), sw = Math.ceil(bx1 * W) - sx, sy = Math.floor((sky.from || 0) * H), sh = Math.ceil(sky.to * H) + 1 - sy;
  const put = (target, from) => { target.save(); target.imageSmoothingEnabled = true; target.drawImage(from, sx, sy, sw, sh, sx * 1000 / W, sy * 1500 / H, sw * 1000 / W, sh * 1500 / H); target.restore(); };
  placed = found.wide ? target => put(target, wide) : null;
  if (fresh) { put(ctx, work); return; }
  drawn = {key, day, at:seconds, cover, bright, thick, size};
  const [lit, shade] = cloudTone(time, bright), glow = GLOW[time], out = pixels.data, mask = found.mask, out2 = widePixels.data, mask2 = found.wide;
  const [x0, x1] = sky.box || [0, 1], top = (sky.from || 0), span = sky.to - top, dense = opacity(look), dark = 1 - bright;
  const rows = Math.ceil(sky.to * H) + 1, ix0 = Math.floor(x0 * W), ix1 = Math.ceil(x1 * W);
  out.fill(0); if (mask2) out2.fill(0);
  for (let j = Math.floor(top * H); j < rows; j++) {
    const d = clamp((j / H - top) / span), warm = glow ? .55 * d * d * bright : 0;
    for (let i = ix0; i < ix1; i++) {
      const m = mask[j * W + i], m2 = mask2 ? mask2[j * W + i] : 0;
      if (!m && !m2) continue;
      const u = (i / W - x0) / (x1 - x0);
      let r = 0, g = 0, b = 0, alpha = 0;
      for (let l = 0; l < 2; l++) {
        const n = cloudField(u, d, seconds, l, look), here = solid(n, cover);
        if (here < .01) continue;
        // Light comes from above: where the cloud thickens downward we are looking at its lit
        // top, where it thins we are under it. A dark cloud is darkest at its heart; a bright
        // one glows there.
        const below = cloudField(u, d + .05, seconds, l, look), above = cloudField(u, d - .05, seconds, l, look);
        const light = clamp(.5 + 2.6 * (below - above) + .9 * (n - .5) * (.4 - 1.4 * dark) - .1 * dark + (l === 0 ? -.1 : 0));
        const a = here * LAYERS[l].weight * (l === 0 ? .8 : .94) * dense, k = a * (1 - alpha);
        r += k * (shade[0] + (lit[0] - shade[0]) * light); g += k * (shade[1] + (lit[1] - shade[1]) * light); b += k * (shade[2] + (lit[2] - shade[2]) * light);
        alpha += k;
      }
      if (alpha < .004) continue;
      const k = 4 * (j * W + i);
      r /= alpha; g /= alpha; b /= alpha;
      if (warm) { r += (glow[0] - r) * warm; g += (glow[1] - g) * warm; b += (glow[2] - b) * warm; }
      out[k] = r; out[k + 1] = g; out[k + 2] = b; out[k + 3] = alpha * m;
      if (m2) { out2[k] = r; out2[k + 1] = g; out2[k + 2] = b; out2[k + 3] = alpha * m2; }
    }
  }
  work.getContext('2d').putImageData(pixels, 0, 0);
  if (mask2) wide.getContext('2d').putImageData(widePixels, 0, 0);
  put(ctx, work);
}
// Under a canopy the leaves move, and the gaps they open must show the same cloud, not the
// painted blue. This redraws the clouds of the last paintClouds call inside a rectangle, with
// the sky taken a little wider so it reaches under the leaf edges. Leaves are drawn after it.
export function cloudsUnder(ctx, x, y, w, h) {
  if (!placed) return;
  ctx.save(); ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip(); placed(ctx); ctx.restore();
}
// The row (0–1 of the painting's height) where the sky ends above a point, for other painters.
export function skylineAt(day, region, doc, x) {
  const found = SKY[region] && day ? skyOf(day, region, doc) : null;
  return found ? found.line[Math.min(W - 1, Math.max(0, Math.round(x * W)))] / H : 0;
}
