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
// 'wide' is 'clear' carried into the distance: far hills and the woods behind turn as well.
export const TINT_CHOICES = Object.freeze({none:{strength:0}, gentle:{strength:.45}, clear:{strength:1}, wide:{strength:1, far:true},
  // 'full': the whole view takes the season — far hills turn completely, blossom opens in
  // spring, and frost lies on the winter grass.
  full:{strength:1, far:true, rich:true}});
// Where seasons show, and how. `ground` is the height (0–1) below which green is grass rather
// than tree; `box` limits the change to part of the painting; `turn` scales the autumn reds.
export const SEASON_PLANTS = Object.freeze({
  // `far` is the height above which everything green is distant hillside or far woods. It is
  // always above the water, so rivers, ponds and lakes are never taken for foliage.
  forest:{ground:.535, turn:1, far:.34},
  countryside:{ground:.44, turn:1, far:.3},
  river_lake:{ground:.47, turn:1, far:.225},
  mountain:{ground:0, turn:.5, palette:'dry', far:.42}, // alpine meadow: gold and straw, little red
  city:{ground:2, turn:.85},                          // street trees and planters (glass towers can look green, so no far zone)
  memory_lake:{ground:.55, turn:.35, far:.3},         // the willow yellows; it does not redden
  home:{ground:2, turn:1, far:.31, box:[.27, .57, .115, .31]}  // only the garden and hills seen through the window
  // The jungle is evergreen, the desert and snow country have no leaves that turn, and the sea,
  // the deep sea and the stars have no seasons: all are left exactly as painted.
});
// Optional, and slight: places that keep their colour all year can still lean with the months.
// No autumn reds here — only lighter, deeper or duller greens.
export const SUBTLE_PLANTS = Object.freeze({
  jungle:{ground:2, subtle:1, shoots:true},      // fresh in spring with a few red shoots, deep in the rains, some yellow-brown leaves later
  star_stop:{ground:2, subtle:.9},               // the ivy on the arch, the planters and the leaves of the flowers
  snow:{ground:2, subtle:.8},                    // the firs: deeper and cooler in midwinter
  desert:{ground:0, subtle:1, palette:'dry'}     // dune grass: greener in spring, straw by winter
});
const HOUR = {morning:.92, day:1, evening:.8, night:.55};
const AUTUMN = [[226,188,62],[236,150,44],[214,84,42],[190,58,48],[176,172,66]];   // yellow, orange, vermilion, crimson, late green
const lum = (r, g, b) => .3 * r + .59 * g + .11 * b;
const carry = (tone, light, ref) => { const k = light / ref; return [Math.min(255, tone[0] * k), Math.min(255, tone[1] * k), Math.min(255, tone[2] * k)]; };

// The seasonal colour of one leaf pixel. `day` is the same pixel in the daylight painting,
// which tells conifers (bluish, dark) from broadleaf trees. Returns [r, g, b, amount 0..1].
export function seasonTone(season, r, g, b, day, x, y, plants, strength, time, seed = 1, far = 0, rich = false) {
  const light = lum(r, g, b), hour = HOUR[time] ?? 1;
  if (plants.subtle) {
    const k = .32 * strength * plants.subtle, patch = variety(x * 11, y * 16, seed + 5);
    // Tropical leaves stay green; only scattered patches show red new shoots or a yellow-brown leaf.
    if (plants.shoots && season === 'spring' && patch > .8) return [Math.min(255, r * 1.2 + 26), g * .86, b * .8, .5 * strength];
    if (plants.shoots && (season === 'autumn' || season === 'winter') && patch > .8) return [...carry([190, 160, 84], light, 140), (season === 'winter' ? .5 : .42) * strength];
    if (season === 'spring') return [Math.min(255, r * 1.06 + 8), Math.min(255, g * 1.06 + 8), b * .9, k];
    if (season === 'summer') return [r * .88, g * .97, b * .92, k];
    const grey = light * .9;
    if (season === 'autumn') return [r * .7 + grey * .34, g * .7 + grey * .28, b * .7 + grey * .2, k];
    return plants.palette === 'dry' ? [...carry([196, 180, 136], light, 150), k * 1.4] : [r * .82, g * .9, b * 1.02 + 4, k];
  }
  // In the distance a bluish green is haze over mixed woods, not a stand of firs, so far
  // hillsides are allowed to turn; near at hand it still marks the conifers, which stay green.
  const evergreen = smooth((day[2] / (day[1] + 1) - .5) / .22) * (1 - (rich ? .97 : .8) * far);
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
    // Far hills keep more green among the colour, as mixed mountain woods do.
    const green = rich ? .12 : .22 + .06 * far, pick = v < green ? 4 : v < .45 + .06 * far ? 0 : v < .7 ? 1 : v < .88 ? 2 : 3, red = pick === 2 || pick === 3;
    const tone = red && plants.turn < 1 && v > .7 + .3 * plants.turn ? AUTUMN[1] : AUTUMN[pick];
    tree = [...carry(tone, light, 138), (pick === 4 ? .45 : .92) * strength * hour * (1 - evergreen) * (red ? .55 + .45 * plants.turn : 1)];
    turf = [...carry([206, 178, 92], light, 150), (rich ? .8 : .6) * strength * hour * (.6 + .4 * v)];
  } else {
    // Winter: grass and broadleaf leaves lose their colour toward straw and brown; conifers stay green.
    tree = [...carry(rich ? [146, 130, 116] : [150, 128, 100], light, 132), (rich ? .88 : .72) * strength * (1 - evergreen) * (.7 + .3 * v)];
    turf = [...carry([196, 180, 136], light, 150), (rich ? .9 : .78) * strength * (.75 + .25 * v)];
    if (rich) {
      // Frost: pale, cool patches over the dry grass, and a breath of it on the bare trees.
      const frost = smooth((variety(x * 7, y * 10, seed + 9) - .3) / .5) * hour;
      turf = [turf[0] + (224 - turf[0]) * .3 * frost, turf[1] + (230 - turf[1]) * .3 * frost, turf[2] + (236 - turf[2]) * .3 * frost, turf[3]];
      tree = [tree[0] + (200 - tree[0]) * .18 * frost, tree[1] + (206 - tree[1]) * .18 * frost, tree[2] + (216 - tree[2]) * .18 * frost, tree[3]];
    }
  }
  // Trees give way to grass gradually around the ground line, never along a visible edge.
  const low = smooth((y - plants.ground) / .09 + .5);
  // Distance thins every colour a little.
  const air = rich ? 1 : 1 - .14 * far;
  return [tree[0] + (turf[0] - tree[0]) * low, tree[1] + (turf[1] - tree[1]) * low, tree[2] + (turf[2] - tree[2]) * low, (tree[3] + (turf[3] - tree[3]) * low) * air];
}

const made = new WeakMap();
function canvasOf(doc, width, height) {
  const canvas = typeof OffscreenCanvas === 'function' ? new OffscreenCanvas(width, height) : doc.createElement('canvas');
  canvas.width = width; canvas.height = height;
  return canvas;
}
// The painting as it looks in a season. Returns the painting itself where nothing changes.
// `reference` is the daylight painting of the scene (leaf shapes are read from it).
// Hazy, bluish green that is vegetation seen from far away. Sky is far bluer, cloud and snow
// have no colour, bare rock is greyer.
// `rich` also takes the bluest far woods, while still refusing sky (much bluer, or bright).
export function farFoliage(r, g, b, rich = false) {
  const max = Math.max(r, g, b), min = Math.min(r, g, b), light = .3 * r + .59 * g + .11 * b;
  return smooth(((max - min) / (max + 1) - .1) / .1) * smooth((g / (r + 1) - 1.0) / .08) * smooth((g / (b + 1) - (rich ? .76 : .8)) / .1) * (1 - smooth((light - (rich ? 170 : 190)) / 40));
}
export function seasonalPainting(image, {region, time, season, strength = 0, far = false, rich = false, subtle = false, reference = image, doc} = {}) {
  const plants = SEASON_PLANTS[region] || (subtle ? SUBTLE_PLANTS[region] : null);
  if (!plants || !(strength > 0) || !image || !reference) return image;
  let cache = made.get(image);
  if (!cache) made.set(image, cache = new Map());
  const key = season + strength + (far ? 'f' : '') + (rich ? 'r' : '') + (subtle ? 's' : '');
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
      let leaf = smooth((leafness(d[k], d[k + 1], d[k + 2], guideTime) - .2) / .4);
      // How far away this height is: 1 well above the line, easing to 0 just below it.
      const distant = far && plants.far ? smooth((plants.far - y) / .05 + .5) : 0;
      if (distant > 0 && reference !== image || distant > 0 && time === 'day') leaf = Math.max(leaf, distant * farFoliage(d[k], d[k + 1], d[k + 2], rich));
      if (leaf > .02) { tone = seasonTone(season, p[k], p[k + 1], p[k + 2], [d[k], d[k + 1], d[k + 2]], x, y, plants, strength, time, seed, distant, rich); amount = leaf * tone[3];
        // Spring in bloom: some trees carry clusters of pale pink blossom, and small flowers dot the grass.
        // Never on water or conifers: both read as bluish green in the daylight painting.
        if (rich && season === 'spring' && !plants.subtle && leaf > .5 && d[k + 2] / (d[k + 1] + 1) < .56) {
          const tree = y < plants.ground, hourly = HOUR[time] ?? 1;
          if (tree && variety(x * 8, y * 11, seed + 77) > .56 && variety(x * 120, y * 170, seed + 78) > .52) { const l = lum(p[k], p[k + 1], p[k + 2]) / 150; tone = [Math.min(255, 255 * l + 40), Math.min(255, 196 * l + 40), Math.min(255, 214 * l + 40)]; amount = .9 * leaf * hourly; }
          else if (!tree && variety(x * 210, y * 300, seed + 79) > .8) { const white = variety(x * 9, y * 9, seed + 80) > .5; tone = white ? [250, 248, 240] : [250, 226, 120]; amount = .85 * leaf * hourly; }
        } }
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
