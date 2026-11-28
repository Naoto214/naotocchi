// Where the sky ends. Far mountains are painted in nearly the colour of the sky, so colour
// alone cannot tell them apart; what differs is that the sky is smooth and the land has
// brushwork. Each column is walked down from the top until the picture stops being smooth
// blue (or bright painted cloud), and the resulting line is tidied across columns.
const clamp = (v, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, v));
export const SKY_W = 200, SKY_H = 300;
// to: lowest the sky can reach (0–1). box: the window at home. open:false where sky only shows
// through gaps in a canopy, so there is no skyline to follow. peaks:true where white may be snow.
export const SKY = Object.freeze({
  forest:{to:.32, open:false}, river_lake:{to:.16}, countryside:{to:.2}, mountain:{to:.3, peaks:true},
  city:{to:.3}, snow:{to:.22, peaks:true}, sea:{to:.244, level:true}, desert:{to:.238, level:true},
  memory_lake:{to:.19}, home:{to:.24, from:.118, box:[.275, .565]}
});
const blueSky = (r, g, b) => b > g * 1.22 && b > r * 1.5 && b > 120;
// Painted cloud: bright, and white to pale blue-grey (never warmer than neutral).
const pale = (r, g, b) => (r + g + b) / 3 > 186 && b >= g - 6 && b >= r - 6 && Math.max(r, g, b) - Math.min(r, g, b) < 110;
// data: RGBA of the daylight painting at SKY_W × SKY_H. Returns {line, mask}: line[x] is the
// row where the sky ends, mask is 0..255 per pixel.
export function findSky(data, region) {
  const sky = SKY[region], W = SKY_W, H = SKY_H, mask = new Uint8ClampedArray(W * H), line = new Float32Array(W);
  if (!sky) return {line, mask};
  const [x0, x1] = sky.box || [0, 1], top = Math.round((sky.from || 0) * H), cap = Math.round(sky.to * H);
  const px = (x, y) => { const k = 4 * (y * W + x); return [data[k], data[k + 1], data[k + 2]]; };
  const rough = (x, y) => { // brushwork: how much this pixel differs from its neighbours
    const [r, g, b] = px(x, y); let d = 0;
    for (const [dx, dy] of [[1, 0], [0, 1], [-1, 0], [1, 1]]) { const xx = clamp(x + dx, 0, W - 1), yy = clamp(y + dy, 0, H - 1), q = px(xx, yy); d += Math.abs(q[0] - r) + Math.abs(q[1] - g) + Math.abs(q[2] - b); }
    return d / 4;
  };
  if (sky.open === false) {
    for (let y = 0; y < cap; y++) for (let x = 0; x < W; x++) { const [r, g, b] = px(x, y); if (blueSky(r, g, b)) mask[y * W + x] = 255; }
    line.fill(cap);
  } else {
    for (let x = 0; x < W; x++) {
      const u = x / W;
      if (u < x0 || u > x1) { line[x] = top; continue; }
      let end = top, strikes = 0, begun = false;
      for (let y = top; y < cap; y++) {
        const [r, g, b] = px(x, y), cloud = !sky.peaks && pale(r, g, b);
        // Sky is blue and smooth; painted cloud is pale. Anything else, three rows running, is land.
        const air = cloud || blueSky(r, g, b) && rough(x, y) < 22;
        // A window frame or a branch may cross the very top before the sky begins.
        if (air) { strikes = 0; end = y + 1; begun = true; } else if (!begun) { if (y - top > 14) break; } else if (++strikes >= 6) break;
      }
      line[x] = end;
    }
    
    const raw = Float32Array.from(line);
    const inside = xx => xx >= 0 && xx < W && xx / W >= x0 && xx / W <= x1;
    const pass = (src, pick) => Float32Array.from(src, (v, x) => { let best = v; for (let d = -6; d <= 6; d++) if (inside(x + d)) best = pick(best, src[x + d]); return inside(x) ? best : v; });
    // Close narrow dips (a painted cloud's dark edge), keep wide ones (a real hill or roof).
    const span = (src, pick, reach) => Float32Array.from(src, (v, x) => { let best = v; for (let d = -reach; d <= reach; d++) if (inside(x + d)) best = pick(best, src[x + d]); return inside(x) ? best : v; });
    // First drop narrow spikes, where a column slid down a smooth, sky-coloured mountain face.
    const opened = span(span(raw, Math.min, 4), Math.max, 4);
    const closed = pass(pass(opened, Math.max), Math.min);
    // Then hold every column near the typical skyline around it, so no block reaches into the hills.
    for (let x = 0; x < W; x++) {
      const near = []; for (let d = -24; d <= 24; d += 2) if (inside(x + d)) near.push(closed[x + d]);
      near.sort((a, b) => a - b);
      line[x] = inside(x) ? Math.min(closed[x], near[near.length >> 1] + 9) : raw[x];
    }
    // Over open water the sky ends at the level horizon, all the way across.
    if (sky.level) line.fill(cap);
    // Round off the steps the passes leave.
    const stepped = Float32Array.from(line);
    for (let x = 0; x < W; x++) if (inside(x)) { let sum = 0, n = 0; for (let d = -3; d <= 3; d++) if (inside(x + d)) { sum += stepped[x + d]; n++; } line[x] = Math.min(stepped[x] + 1, sum / n); }
    for (let x = 0; x < W; x++) for (let y = top; y < line[x]; y++) {
      const [r, g, b] = px(x, y);
      // Leaves and boughs that reach up into the sky stay in front of the clouds.
      // Above a level horizon there is nothing but sky, whatever the painted weather.
      if (sky.level || blueSky(r, g, b) || !sky.peaks && pale(r, g, b)) mask[y * W + x] = Math.round(255 * clamp((line[x] - y) / 5));
    }
  }
  // Soften the mask by a pixel so no edge of it shows as a step.
  const hard = Uint8ClampedArray.from(mask);
  for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
    let sum = 0; for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) sum += hard[(y + dy) * W + x + dx];
    mask[y * W + x] = Math.min(hard[y * W + x] + 96, sum / 9);
  }
  return {line, mask};
}
