// Plants change colour with the season. Only pixels that the leaf test finds are touched, and
// each keeps its own light and shade: the new colour is a seasonal hue carrying the original
// brightness, so brushwork, shadows and highlights stay as painted. Sky, water, bark, rock,
// buildings and the ground are never recoloured. The 52 paintings themselves are not altered;
// a seasonal copy is made in memory and summer at strength 0 is the painting as it is.
import {leafness} from './foliage.mjs';

const clamp = (v, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, v));
const smooth = v => { const t = clamp(v); return t * t * (3 - 2 * t); };
function hash(value) {
  let bits = Math.imul(value ^ (value >>> 16), 0x21f0aaad);
  bits = Math.imul(bits ^ (bits >>> 15), 0x735a2d97);
  return ((bits ^ (bits >>> 15)) >>> 0) / 4294967296;
}
// Smooth noise a few trees wide, so neighbouring trees turn different colours.
function variety(x, y, seed) {
  const gx = Math.floor(x), gy = Math.floor(y), fx = smooth(x - gx), fy = smooth(y - gy);
  const at = (i, j) => hash((i * 7349 + j * 9151 + seed) | 0);
  return (at(gx, gy) * (1 - fx) + at(gx + 1, gy) * fx) * (1 - fy) + (at(gx, gy + 1) * (1 - fx) + at(gx + 1, gy + 1) * fx) * fy;
}

export const TINT_LEVELS = Object.freeze({none:0, gentle:.45, clear:1});
// Where seasons show, and how. `ground` is the height (0–1) below which green is grass rather
// than tree; `box` limits the change to part of the painting; `turn` scales the autumn reds.
export const SEASON_PLANTS = Object.freeze({
  forest:{ground:.535, turn:1},
  countryside:{ground:.44, turn:1},
  river_lake:{ground:.47, turn:1},
  mountain:{ground:0, turn:.5, palette:'dry'},        // alpine meadow: gold and straw, little red
  city:{ground:2, turn:.85},                          // street trees and planters
  memory_lake:{ground:.55, turn:.35},                 // the willow yellows; it does not redden
  home:{ground:2, turn:1, box:[.27, .57, .115, .31]}  // only the garden seen through the window
  // The jungle is evergreen, the desert and snow country have no leaves that turn, and the sea,
  // the deep sea and the stars have no seasons: all are left exactly as painted.
});
const HOUR = {morning:.92, day:1, evening:.8, night:.55};
const AUTUMN = [[226,188,62],[236,150,44],[214,84,42],[190,58,48],[176,172,66]];   // yellow, orange, vermilion, crimson, late green
const lum = (r, g, b) => .3 * r + .59 * g + .11 * b;
const carry = (tone, light, ref) => { const k = light / ref; return [Math.min(255, tone[0] * k), Math.min(255, tone[1] * k), Math.min(255, tone[2] * k)]; };

// The seasonal colour of one leaf pixel. `day` is the same pixel in the daylight painting,
// which tells conifers (bluish, dark) from broadleaf trees. Returns [r, g, b, amount 0..1].
export function seasonTone(season, r, g, b, day, x, y, plants, strength, time, seed = 1) {
  const light = lum(r, g, b), evergreen = smooth((day[2] / (day[1] + 1) - .5) / .22), hour = HOUR[time] ?? 1;
  const v = variety(x * 9, y * 13, seed);
  if (season === 'spring') {
    // Young leaves: lighter and yellower, a little softer.
    return [Math.min(255, r * 1.08 + 16), Math.min(255, g * 1.07 + 14), b * .78 + 6, .75 * strength * (1 - .6 * evergreen)];
  }
  if (season === 'summer') {
    // Deep, full green.
    return [r * .86, g * .97, b * .9, .5 * strength * (1 - .4 * evergreen)];
  }
  let tree, turf;
  if (season === 'autumn') {
    // Each tree takes one colour of the range; some stay green later than others.
    const pick = v < .22 ? 4 : v < .45 ? 0 : v < .7 ? 1 : v < .88 ? 2 : 3, red = pick === 2 || pick === 3;
    const tone = red && plants.turn < 1 && v > .7 + .3 * plants.turn ? AUTUMN[1] : AUTUMN[pick];
    tree = [...carry(tone, light, 138), (pick === 4 ? .45 : .92) * strength * hour * (1 - evergreen) * (red ? .55 + .45 * plants.turn : 1)];
    turf = [...carry([206, 178, 92], light, 150), .6 * strength * hour * (.6 + .4 * v)];
  } else {
    // Winter: grass and broadleaf leaves lose their colour toward straw and brown; conifers stay green.
    tree = [...carry([150, 128, 100], light, 132), .72 * strength * (1 - evergreen) * (.7 + .3 * v)];
    turf = [...carry([196, 180, 136], light, 150), .78 * strength * (.75 + .25 * v)];
  }
  // Trees give way to grass gradually around the ground line, never along a visible edge.
  const low = smooth((y - plants.ground) / .09 + .5);
  return [tree[0] + (turf[0] - tree[0]) * low, tree[1] + (turf[1] - tree[1]) * low, tree[2] + (turf[2] - tree[2]) * low, tree[3] + (turf[3] - tree[3]) * low];
}

const made = new WeakMap();
function canvasOf(doc, width, height) {
  const canvas = typeof OffscreenCanvas === 'function' ? new OffscreenCanvas(width, height) : doc.createElement('canvas');
  canvas.width = width; canvas.height = height;
  return canvas;
}
// The painting as it looks in a season. Returns the painting itself where nothing changes.
// `reference` is the daylight painting of the scene (leaf shapes are read from it).
export function seasonalPainting(image, {region, time, season, strength = 0, reference = image, doc} = {}) {
  const plants = SEASON_PLANTS[region];
  if (!plants || !(strength > 0) || !image || !reference) return image;
  let cache = made.get(image);
  if (!cache) made.set(image, cache = new Map());
  const key = season + strength;
  if (cache.has(key)) return cache.get(key);
  const W = image.naturalWidth || image.width, H = image.naturalHeight || image.height;
  // Half resolution is enough for colour and keeps the pass short; the painting's own detail
  // stays at full resolution underneath.
  const w = Math.round(W / 2), h = Math.round(H / 2);
  const read = picture => { const c = canvasOf(doc, w, h).getContext('2d', {willReadFrequently:true}); c.drawImage(picture, 0, 0, w, h); return c.getImageData(0, 0, w, h); };
  let own, guide;
  try { own = read(image); guide = reference === image ? own : read(reference); } catch { cache.set(key, image); return image; }
  const guideTime = reference === image ? (plants.palette === 'dry' && time === 'day' ? 'dry' : time) : plants.palette || 'day';
  const p = own.data, d = guide.data, seed = region.length * 131 + region.charCodeAt(0);
  const [x0, x1, y0, y1] = plants.box || [0, 1, 0, 1];
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
    const k = 4 * (j * w + i), x = i / w, y = j / h;
    let amount = 0, tone = null;
    if (x >= x0 && x <= x1 && y >= y0 && y <= y1) {
      const leaf = smooth((leafness(d[k], d[k + 1], d[k + 2], guideTime) - .2) / .4);
      if (leaf > .02) { tone = seasonTone(season, p[k], p[k + 1], p[k + 2], [d[k], d[k + 1], d[k + 2]], x, y, plants, strength, time, seed); amount = leaf * tone[3]; }
    }
    if (amount > .004) { p[k] = tone[0]; p[k + 1] = tone[1]; p[k + 2] = tone[2]; p[k + 3] = Math.round(255 * Math.min(1, amount)); }
    else p[k + 3] = 0;
  }
  const veil = canvasOf(doc, w, h);
  veil.getContext('2d').putImageData(own, 0, 0);
  const out = canvasOf(doc, W, H), c = out.getContext('2d');
  c.drawImage(image, 0, 0, W, H);
  c.imageSmoothingEnabled = true; c.imageSmoothingQuality = 'high';
  c.drawImage(veil, 0, 0, W, H);
  // The painters identify a painting by its address and natural size.
  try { out.src = image.src; out.naturalWidth = W; out.naturalHeight = H; } catch { /* a canvas that refuses extra fields */ }
  cache.set(key, out);
  return out;
}
