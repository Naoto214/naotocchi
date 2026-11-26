// Clouds that drift across the painted sky. The sky is found in the daylight painting (blue
// sky and the white of painted clouds, above a per-region line), so clouds never cross
// mountains, trees, buildings or the window frame. How much sky they cover follows the weather.
const clamp = (v, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, v));
const smooth = v => { const t = clamp(v); return t * t * (3 - 2 * t); };
function hash(value) {
  let bits = Math.imul(value ^ (value >>> 16), 0x21f0aaad);
  bits = Math.imul(bits ^ (bits >>> 15), 0x735a2d97);
  return ((bits ^ (bits >>> 15)) >>> 0) / 4294967296;
}
// The lowest height (0–1) at which open sky is found, and whether white there is cloud
// (true) or may be snow on a peak (false). The jungle canopy, the deep sea and the stars have no such sky.
export const SKY = Object.freeze({
  forest:{to:.3, white:true}, river_lake:{to:.13, white:true}, countryside:{to:.13, white:true}, mountain:{to:.2, white:false},
  city:{to:.22, white:true}, snow:{to:.14, white:false}, sea:{to:.245, white:true}, desert:{to:.24, white:true},
  memory_lake:{to:.22, white:true}, home:{to:.2, white:true, box:[.27, .57]}
});
export function skyness(r, g, b, white) {
  const light = (r + g + b) / 3, blue = smooth((b / (r + 1) - 1.18) / .2) * smooth((b / (g + 1) - 1.0) / .1) * smooth((light - 70) / 40);
  const pale = white ? smooth((light - 205) / 30) * smooth((.16 - (Math.max(r, g, b) - Math.min(r, g, b)) / 255) / .08) : 0;
  return Math.max(blue, pale);
}
const W = 200, H = 300, masks = new WeakMap();
const canvasOf = (doc, w, h) => { const c = typeof OffscreenCanvas === 'function' ? new OffscreenCanvas(w, h) : doc.createElement('canvas'); c.width = w; c.height = h; return c; };
function skyMask(day, region, doc) {
  if (masks.has(day)) return masks.get(day);
  const sky = SKY[region], canvas = canvasOf(doc, W, H), c = canvas.getContext('2d', {willReadFrequently:true});
  c.drawImage(day, 0, 0, W, H);
  let data;
  try { data = c.getImageData(0, 0, W, H); } catch { masks.set(day, null); return null; }
  const p = data.data, [x0, x1] = sky.box || [0, 1];
  for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
    const k = 4 * (j * W + i), y = j / H, x = i / W;
    const inside = x >= x0 && x <= x1 ? smooth((sky.to + .05 - y) / .05) : 0;
    const a = inside ? inside * skyness(p[k], p[k + 1], p[k + 2], sky.white) : 0;
    p[k] = p[k + 1] = p[k + 2] = 255; p[k + 3] = Math.round(255 * a);
  }
  // Painted clouds have grey undersides that are neither blue nor white. Soften the mask so
  // those small gaps close, without reaching more than about one percent into the land.
  for (let pass = 0; pass < 2; pass++) {
    const src = new Uint8ClampedArray(p);
    for (let j = 1; j < H - 1; j++) for (let i = 1; i < W - 1; i++) {
      let sum = 0;
      for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) sum += src[4 * ((j + dj) * W + i + di) + 3];
      p[4 * (j * W + i) + 3] = Math.min(255, sum / 9 * 1.25);
    }
  }
  c.putImageData(data, 0, 0);
  masks.set(day, canvas);
  return canvas;
}
let puff = null, work = null;
function puffOf(doc) {
  if (puff) return puff;
  puff = canvasOf(doc, 64, 64);
  const c = puff.getContext('2d'), g = c.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(.45, 'rgba(255,255,255,.6)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  c.fillStyle = g; c.fillRect(0, 0, 64, 64);
  return puff;
}
// Lit top and shaded base of the clouds, by hour and weather.
const TONE = {
  sunny:{morning:['255,246,236','226,224,232'], day:['255,255,255','226,232,240'], evening:['255,206,170','196,150,160'], night:['96,110,150','40,50,84']},
  cloudy:{morning:['232,232,234','186,190,198'], day:['236,238,240','186,192,200'], evening:['214,184,176','150,132,146'], night:['78,88,118','34,42,70']},
  rain:{morning:['176,182,192','126,134,148'], day:['172,180,190','118,128,142'], evening:['150,140,152','100,96,116'], night:['58,66,92','26,32,54']},
  snow:{morning:['236,238,242','204,208,216'], day:['238,240,244','204,210,218'], evening:['222,206,208','176,166,180'], night:['92,102,130','46,54,82']}
};
// cover: 0 a clear sky … 1 overcast. Sixteen clouds drift at their own heights and speeds;
// more of them are present, and each is broader and thicker, as the cover grows.
export function paintClouds(ctx, day, region, time, weather, seconds, cover, doc) {
  const sky = SKY[region];
  if (!sky || !day || !(cover > .02)) return;
  const mask = skyMask(day, region, doc);
  if (!mask) return;
  if (!work) work = canvasOf(doc, W, H);
  const c = work.getContext('2d'), tone = (TONE[weather] || TONE.sunny)[time] || TONE.sunny.day, brush = puffOf(doc);
  c.globalCompositeOperation = 'source-over'; c.clearRect(0, 0, W, H);
  const [x0, x1] = sky.box || [0, 1], span = (x1 - x0) * W, band = (sky.to + .04) * H;
  // The clouds are first laid down as plain cover, then given their colour in one pass: lit
  // above and shaded below. An even layer grows in under heavy cover, so no blue shows through.
  c.fillStyle = '#fff';
  if (cover > .55) { c.globalAlpha = smooth((cover - .55) / .4) * .94; c.fillRect(x0 * W, 0, span, band + 8); }
  for (let i = 0; i < 16; i++) {
    const present = smooth((cover * 1.25 - i / 16) / .2);
    if (present <= 0) continue;
    const r = n => hash(i * 131 + n), speed = (.004 + .008 * r(1)) * (weather === 'rain' || weather === 'snow' ? 1.6 : 1);
    const u = ((r(2) + seconds * speed) % 1.5) - .25, cx = x0 * W + u * span, cy = band * (.08 + .8 * r(3));
    const size = (.16 + .2 * r(4)) * span * (.8 + .7 * cover), flat = .34 + .14 * r(5);
    c.globalAlpha = present * (.55 + .4 * cover);
    for (let k = 0; k < 6; k++) {
      // A cloud is a row of overlapping soft puffs that slowly shift against each other.
      const ox = (k - 2.5) * size * .19 + size * .05 * Math.sin(seconds * .05 + i + k), s = size * (.5 + .35 * hash(i * 17 + k));
      c.drawImage(brush, cx + ox - s / 2, cy - s * flat / 2, s, s * flat);
    }
  }
  c.globalAlpha = 1; c.globalCompositeOperation = 'source-in';
  const g = c.createLinearGradient(0, 0, 0, band + 8);
  g.addColorStop(0, `rgb(${tone[0]})`); g.addColorStop(weather === 'rain' ? .45 : .8, `rgb(${tone[1]})`); g.addColorStop(1, `rgb(${tone[1]})`);
  c.fillStyle = g; c.fillRect(0, 0, W, H);
  c.globalAlpha = 1; c.globalCompositeOperation = 'destination-in'; c.drawImage(mask, 0, 0);
  c.globalCompositeOperation = 'source-over';
  ctx.save(); ctx.imageSmoothingEnabled = true; ctx.drawImage(work, 0, 0, 1000, 1500); ctx.restore();
}
