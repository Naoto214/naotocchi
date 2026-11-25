// Separates foliage from the painting so that leaves can move while everything behind them
// stays exactly where it was painted. For each leafy spot it builds, once per painting:
//   plate  — the spot with its leaves painted out (filled from the surrounding sky, hills,
//            trunk and boughs), and
//   leaves — the leaves alone, on a transparent ground.
// Moving the leaf layer over the plate bends no sky, no trunk and no ground.

// How leaf-like a pixel is, 0..1. Leaves are the greens of each daypart; sky, cloud, bark,
// rock and the blue distance are not.
export function leafness(r, g, b, time) {
  const max = Math.max(r, g, b), min = Math.min(r, g, b), light = (r + g + b) / 3;
  if (max < 18) return 0;
  const step = (lo, hi, v) => { const t = Math.min(1, Math.max(0, (v - lo) / (hi - lo))); return t * t * (3 - 2 * t); };
  const vivid = step(.10, .24, (max - min) / max);
  if (time === 'night') {
    // Moonlit leaves are teal: green leads red clearly and nearly matches blue; the sky is far bluer.
    return vivid * step(1.10, 1.32, g / (r + 1)) * step(.74, .90, g / (b + 1)) * step(34, 62, light);
  }
  if (time === 'evening') {
    // Sunset leaves run from olive to gold. Bark is darker and redder, sky pinker and bluer.
    return vivid * step(.80, .96, g / (r + 1)) * step(1.16, 1.42, g / (b + 1)) * step(46, 84, light);
  }
  return vivid * step(.98, 1.12, g / (r + 1)) * step(1.06, 1.26, g / (b + 1));
}

const prepared = new WeakMap();
function makeCanvas(doc, width, height) {
  const canvas = typeof OffscreenCanvas === 'function' ? new OffscreenCanvas(width, height) : doc.createElement('canvas');
  canvas.width = width; canvas.height = height;
  return canvas;
}
// Fills the leaf pixels of `pixels` from their surroundings, ring by ring, then softens the fill.
function paintOut(pixels, alpha, width, height) {
  const known = new Uint8Array(width * height);
  for (let i = 0; i < known.length; i++) known[i] = alpha[i] < .12 ? 1 : 0;
  let frontier = [];
  for (let i = 0; i < known.length; i++) if (!known[i]) frontier.push(i);
  for (let pass = 0; pass < 200 && frontier.length; pass++) {
    const next = [], filled = [];
    for (const i of frontier) {
      const x = i % width, y = (i - x) / width;
      let r = 0, g = 0, b = 0, n = 0;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const xx = x + dx, yy = y + dy;
        if (xx < 0 || yy < 0 || xx >= width || yy >= height) continue;
        const j = yy * width + xx;
        if (!known[j]) continue;
        r += pixels[4 * j]; g += pixels[4 * j + 1]; b += pixels[4 * j + 2]; n++;
      }
      if (n) filled.push(i, r / n, g / n, b / n); else next.push(i);
    }
    if (!filled.length) break; // an island with no known neighbour keeps its paint
    for (let k = 0; k < filled.length; k += 4) {
      const i = filled[k];
      pixels[4 * i] = filled[k + 1]; pixels[4 * i + 1] = filled[k + 2]; pixels[4 * i + 2] = filled[k + 3]; known[i] = 1;
    }
    frontier = next;
  }
  // The ring-by-ring fill leaves streaks. Blur only the painted-out pixels until they read as
  // soft, out-of-focus depth behind the leaves; the untouched painting around them stays sharp.
  const lifted = [];
  for (let i = 0; i < alpha.length; i++) if (alpha[i] >= .12) lifted.push(i);
  const buffer = new Float32Array(lifted.length * 3);
  for (let pass = 0; pass < 10; pass++) {
    lifted.forEach((i, k) => {
      const x = i % width, y = (i - x) / width;
      let r = 0, g = 0, b = 0, n = 0;
      for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) {
        const xx = x + dx, yy = y + dy;
        if (xx < 0 || yy < 0 || xx >= width || yy >= height) continue;
        const j = 4 * (yy * width + xx);
        r += pixels[j]; g += pixels[j + 1]; b += pixels[j + 2]; n++;
      }
      buffer[3 * k] = r / n; buffer[3 * k + 1] = g / n; buffer[3 * k + 2] = b / n;
    });
    lifted.forEach((i, k) => { pixels[4 * i] = buffer[3 * k]; pixels[4 * i + 1] = buffer[3 * k + 1]; pixels[4 * i + 2] = buffer[3 * k + 2]; });
  }
}

// spots: [centre x, centre y, radius x, radius y, nearness, pivot x, pivot y] in the 1000 × 1500 painting.
export function separateFoliage(image, spots, time, doc) {
  let cache = prepared.get(image);
  if (!cache) prepared.set(image, cache = new Map());
  if (cache.has(spots)) return cache.get(spots);
  const width = image.naturalWidth || image.width, height = image.naturalHeight || image.height;
  const sx = width / 1000, sy = height / 1500, parts = [];
  for (const [cx, cy, rx, ry] of spots) {
    const w = Math.max(8, Math.round(2 * rx * sx)), h = Math.max(8, Math.round(2 * ry * sy));
    const source = makeCanvas(doc, w, h), sc = source.getContext('2d', {willReadFrequently:true});
    sc.drawImage(image, (cx - rx) * sx, (cy - ry) * sy, 2 * rx * sx, 2 * ry * sy, 0, 0, w, h);
    let data;
    try { data = sc.getImageData(0, 0, w, h); } catch { parts.push(null); continue; }
    const pixels = data.data, alpha = new Float32Array(w * h);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const i = y * w + x, u = (x + .5) / w * 2 - 1, v = (y + .5) / h * 2 - 1;
      // The spot ends softly: leaves near its rim stay with the painting.
      const d = Math.hypot(u, v), rim = d >= 1 ? 0 : d <= .62 ? 1 : .5 + .5 * Math.cos(Math.PI * (d - .62) / .38);
      alpha[i] = rim * leafness(pixels[4 * i], pixels[4 * i + 1], pixels[4 * i + 2], time);
    }
    const leaves = makeCanvas(doc, w, h), lc = leaves.getContext('2d'), leafData = lc.createImageData(w, h);
    for (let i = 0; i < alpha.length; i++) {
      leafData.data[4 * i] = pixels[4 * i]; leafData.data[4 * i + 1] = pixels[4 * i + 1]; leafData.data[4 * i + 2] = pixels[4 * i + 2];
      leafData.data[4 * i + 3] = Math.round(255 * alpha[i]);
    }
    lc.putImageData(leafData, 0, 0);
    paintOut(pixels, alpha, w, h);
    // Only where leaves were lifted does the plate replace the painting.
    for (let i = 0; i < alpha.length; i++) pixels[4 * i + 3] = Math.round(255 * Math.min(1, alpha[i] * 3));
    const plate = makeCanvas(doc, w, h);
    plate.getContext('2d').putImageData(data, 0, 0);
    let cover = 0;
    for (let i = 0; i < alpha.length; i++) cover += alpha[i];
    parts.push({plate, leaves, cover:cover / alpha.length});
  }
  cache.set(spots, parts);
  return parts;
}
