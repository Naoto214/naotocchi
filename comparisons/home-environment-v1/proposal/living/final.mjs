// The final candidate: the calm strength of the living layer, with the motions that read as
// "the picture is being bent" replaced by ones that read as "the world is alive".
//  - Leaves and grass move by a smooth local shift that is zero at the edge of each spot, so
//    there is no cut-out to see, trunks and thick boughs stay put, and nothing doubles.
//  - Fireflies and drifting lights each keep their own home, path, pace and rhythm.
//  - Water keeps the gentle painters; a quiet glitter and a soft current are added on top.
import {fireflies, nightSky, waterGlints, riverFlow, gustAt} from './maximum.mjs';
import {separateFoliage, separateFoliageSoft, rimWindow, SOFT_NODES} from './foliage.mjs';

const TAU = 2 * Math.PI;
// Leafy crowns, bough tips and grass tufts: centre x/y, radius x/y in the 1000 × 1500 painting,
// and nearness (1 = foreground). Trunks, rocks, buildings and water are deliberately left out.
export const SWAY_SPOTS = Object.freeze({
  forest:[[382,108,97,63,0.97],[664,88,89,55,0.95],[776,233,94,77,0.93],[269,230,73,58,0.77],[485,323,69,52,0.8],[256,452,64,53,0.72],[692,398,64,54,0.58],[846,565,80,64,0.68],[490,570,60,46,0.31],[379,638,62,54,0.38],[689,679,63,60,0.26],[139,981,70,47,0.91],[842,1159,97,39,0.93],[358,1291,88,54,0.99],[183,1413,100,58,1]],
  river_lake:[[130,90,110,70,0.9],[270,150,90,60,0.8],[60,230,60,70,0.8],[880,270,80,70,0.5],[940,380,60,60,0.5],[70,1250,80,60,1],[200,1380,110,60,1],[40,690,40,50,0.8]],
  countryside:[[70,110,80,80,0.9],[40,300,50,70,0.9],[640,440,50,45,0.5],[930,640,70,35,0.6],[100,1050,90,50,0.9],[870,1130,90,50,0.9],[900,1350,90,60,1],[150,1330,100,60,1],[130,700,60,45,0.7]],
  mountain:[[70,1080,60,50,0.9],[100,1290,70,50,1],[60,1430,60,45,1],[900,830,60,35,0.6]],
  jungle:[[300,120,110,80,0.9],[140,300,90,80,0.8],[860,380,90,80,0.8],[600,450,70,60,0.5],[80,1280,80,70,1],[920,1320,80,70,1],[90,900,70,70,0.9],[910,930,70,70,0.9]],
  city:[[330,420,45,45,0.5],[60,1130,60,60,1],[120,1350,90,70,1],[840,790,60,40,0.7]],
  home:[[50,1380,60,60,1],[340,290,40,40,0.3]],
  memory_lake:[[110,150,90,90,0.9],[220,230,70,80,0.9],[130,380,60,70,0.9],[950,700,45,50,0.7],[90,1280,90,60,1]]
});
// Painters that cut out and re-place pieces of the painting are switched off per region; the
// groups below name what each reused painter is still asked to draw.
const CALM = {canopy:false, deform:false};
export const FINAL_EFFECTS = Object.freeze({
  forest:{...CALM, particles:false}, river_lake:{...CALM, particles:false}, countryside:{...CALM, particles:false},
  home:{...CALM}, city:{...CALM, particles:false}, snow:{...CALM}, memory_lake:{...CALM, particles:false},
  mountain:{...CALM}, jungle:{...CALM, magic:false}, desert:{...CALM}, sea:{}, deepsea:{}, star_stop:{}
});

const GRID = 8;
// How far a spot's centre moves, in painting units, for a given moment. A slow sway, a
// quicker flutter and the passing gust add up; near spots move more than far ones.
export function swayOffset(region, i, spot, seconds) {
  const [x, y, , , near] = spot, gust = gustAt(region, seconds);
  // The gust reaches each spot a little later the farther downwind it stands.
  const arrive = gust.power * Math.max(0, Math.sin(Math.PI * Math.min(1, Math.max(0, gust.progress * 1.3 - .3 * (gust.direction > 0 ? x : 1000 - x) / 1000))));
  const slow = Math.sin(seconds * (.55 + .13 * (i % 5)) + x * .011 + i);
  const flutter = Math.sin(seconds * (2.1 + .37 * (i % 7)) + y * .017 + i * 2.3);
  const reach = 2.2 + 5.2 * near;
  return {dx:reach * (.42 * slow + .16 * flutter + 1.05 * arrive * gust.direction * (1 + .25 * flutter)),
    dy:reach * (.12 * Math.cos(seconds * .7 + i) + .2 * arrive)};
}
// Re-places a spot of the painting cell by cell. Each cell shifts by the centre offset times a
// bell weight that falls to zero at the spot's rim, so the result joins the still painting
// everywhere and stretches smoothly inside.
function swaySpot(ctx, image, scale, spot, dx, dy) {
  const [cx, cy, rx, ry] = spot, cw = 2 * rx / GRID, ch = 2 * ry / GRID;
  for (let row = 0; row < GRID; row++) {
    const v = (row + .5) / GRID * 2 - 1, wy = Math.cos(v * Math.PI / 2) ** 2;
    for (let col = 0; col < GRID; col++) {
      const u = (col + .5) / GRID * 2 - 1, w = wy * Math.cos(u * Math.PI / 2) ** 2;
      if (w < .04) continue;
      const x = cx - rx + col * cw, y = cy - ry + row * ch;
      ctx.drawImage(image, x * scale.x, y * scale.y, cw * scale.x, ch * scale.y, x + dx * w - .5, y + dy * w - .5, cw + 1, ch + 1);
    }
  }
}
export function paintSway(ctx, image, region, seconds) {
  const spots = SWAY_SPOTS[region], width = image?.naturalWidth || image?.width, height = image?.naturalHeight || image?.height;
  if (!spots || !width || !height) return;
  const scale = {x:width / 1000, y:height / 1500};
  spots.forEach((spot, i) => { const o = swayOffset(region, i, spot, seconds); swaySpot(ctx, image, scale, spot, o.dx, o.dy); });
}

// ---- Trees that move as trees -------------------------------------------------------------
// Leafy spots with the point their bough grows from: centre x/y, radius x/y, nearness, pivot x/y.
// The forest pivots are the branch roots mapped for the earlier E3 work.
export const FOLIAGE = Object.freeze({
  forest:[[382,108,96,63,0.97,313,70],[664,88,89,54,0.95,728,51],[776,233,94,77,0.93,849,170],[269,230,73,58,0.77,205,242],[485,323,68,52,0.8,437,344],[256,452,64,53,0.72,207,483],[692,398,64,54,0.58,743,435],[846,565,80,64,0.68,921,598],[490,570,60,46,0.31,512,607],[379,638,62,54,0.38,370,684],[689,679,62,60,0.26,708,734],[540,732,56,38,0.19,542,768],[139,981,70,46,0.91,129,1021],[842,1159,96,38,0.93,846,1194],[358,1291,88,54,0.99,354,1340],[183,1413,100,58,1,173,1465]],
  river_lake:[[130,90,110,70,0.9,31,104],[270,150,90,60,0.8,189,162],[60,230,60,70,0.8,6,244],[880,270,80,70,0.5,880,333],[940,380,60,60,0.5,940,434],[70,1250,80,60,1,70,1304],[200,1380,110,60,1,200,1434],[40,690,40,50,0.8,40,735]],
  countryside:[[70,110,80,80,0.9,-2,126],[40,300,50,70,0.9,-5,314],[640,440,50,45,0.5,640,480],[930,640,70,35,0.6,930,672],[100,1050,90,50,0.9,100,1095],[870,1130,90,50,0.9,870,1175],[900,1350,90,60,1,900,1404],[150,1330,100,60,1,150,1384],[130,700,60,45,0.7,130,740]],
  mountain:[[70,1080,60,50,0.9,70,1125],[100,1290,70,50,1,100,1335],[60,1430,60,45,1,60,1470],[900,830,60,35,0.6,900,862]],
  jungle:[[300,120,110,80,0.9,300,48],[140,300,90,80,0.8,59,316],[860,380,90,80,0.8,941,396],[600,450,70,60,0.5,600,504],[80,1280,80,70,1,80,1343],[920,1320,80,70,1,920,1383],[90,900,70,70,0.9,90,963],[910,930,70,70,0.9,910,993]],
  city:[[330,420,45,45,0.5,330,460],[60,1130,60,60,1,60,1184],[120,1350,90,70,1,120,1413],[840,790,60,40,0.7,840,826]],
  home:[[50,1380,60,60,1,50,1434],[340,290,40,40,0.3,340,326]],
  memory_lake:[[110,150,90,90,0.9,110,69],[220,230,70,80,0.9,220,158],[130,380,60,70,0.9,130,317],[950,700,45,50,0.7,950,745],[90,1280,90,60,1,90,1334]]
});
// 'bump'   the earlier E: a smooth local shift of the painting itself
// 'tips'   leaves lifted off the painting; only leaf tips flutter, boughs do not swing
// 'branch' leaves lifted off the painting; each bough bends from its root, leaves follow, tips flutter
// 'still'  nothing moves; leaves catch the light as the wind passes
// 'wide'   'branch' made seamless and spread over more of the canopy, the far trees and the grass
// 'vivid'  'wide' with a stronger bend and livelier leaf tips
// 'tips2'  'tips' with the same motion made seamless
// 'tips3'  'tips2' spread over the wider set of spots
// 'rigid'  'tips3' plus each twig turning about its root as one rigid piece, leaves riding on it
export const TREE_SWAYS = Object.freeze(['bump','tips','branch','still','wide','vivid','tips2','tips3','rigid']);
// More of the forest for the seamless modes: upper canopy, middle and far crowns, undergrowth
// and foreground grass. Trunks and mossy bark are left out.
const MORE_FOLIAGE = {forest:[[150,62,92,56,0.95,60,118],[530,52,78,48,0.9,452,90],[905,96,88,70,0.95,990,60],[335,520,58,56,0.5,335,574],[592,498,58,50,0.45,592,546],[772,512,54,56,0.45,775,566],[158,600,68,56,0.6,150,654],[92,805,78,44,0.7,92,847],[620,790,68,40,0.35,620,828],[282,802,68,40,0.4,282,840],[935,860,58,40,0.7,935,898],[610,1385,108,58,1,610,1440],[885,1425,98,58,1,885,1480],[62,1185,58,60,0.95,62,1242]]};
export const FOLIAGE_WIDE = Object.freeze(Object.fromEntries(Object.entries(FOLIAGE).map(([region, spots]) =>
  [region, Object.freeze([...spots, ...(MORE_FOLIAGE[region] || [])])])));

// The wind at one bough: a slow personal sway plus the gust as it arrives there.
export function boughWind(region, i, spot, seconds, boost = 0) {
  const x = spot[0], gust = {...gustAt(region, seconds)};
  // `boost` holds the wind up for the comparison's strong-wind view.
  if (boost > gust.power) { gust.power = boost; gust.progress = .5; gust.direction = Math.sin(seconds * .21) > -.4 ? 1 : -1; }
  const reach = (gust.direction > 0 ? x : 1000 - x) / 1000;
  const arrive = gust.power * Math.max(0, Math.sin(Math.PI * Math.min(1, Math.max(0, gust.progress * 1.35 - .35 * reach))));
  // Every tree keeps its own period, so neighbours never swing together.
  const own = .5 + .23 * ((i * 7) % 5), slow = Math.sin(seconds * own + i * 1.9) * .6 + Math.sin(seconds * own * .43 + i) * .4;
  return {bend:.34 * slow + 1.0 * arrive * gust.direction * (.8 + .2 * Math.sin(seconds * 3.1 + i)), stir:.35 + 1.1 * arrive};
}
const TILES = 4;
// How far the leaves at (x, y) of a spot are carried, in painting units. The bough bends about
// its root, so the shift grows with distance from the root; on top of that a ripple of leaf
// flutter travels across the spot with the wind. Everything eases to zero at the spot's rim.
export function leafShift(spot, wind, seconds, i, x, y, strength) {
  const [cx, cy, rx, ry, near, px, py] = spot, win = rimWindow((x - cx) / rx, (y - cy) / ry);
  if (!win) return {dx:0, dy:0};
  const far = Math.hypot(rx, ry) + Math.hypot(cx - px, cy - py), tip = Math.min(1, Math.hypot(x - px, y - py) / far);
  // 'rigid' turns the whole bough by one angle, so its length, thickness and curve are kept.
  // Otherwise the bough bends: the turn itself grows toward the tip.
  const swing = strength.rigid ? wind.bend * (.009 + .019 * near) * strength.bend
    : wind.bend * (.012 + .034 * near) * strength.bend * (.45 + .55 * tip);
  const flutter = (.8 + 1.8 * near) * wind.stir * strength.flutter * tip ** (strength.quick ? 1.3 : 1.2);
  // A wave running downwind through the spot, longer than the spacing of the soft tiles so
  // neighbouring tiles move nearly together and the leaves stay crisp. The quick setting is
  // the fast, fine leaf-tip flutter of the original 'tips', with a second ripple across it.
  const phase = strength.quick ? seconds * (2.3 + .5 * (i % 4)) - x / 44 + y / 63 + i * 1.3
    : seconds * (2.2 + .25 * (i % 4)) - x / 68 + y / 110 + i * 1.3;
  const ripple = strength.quick ? .35 * Math.sin(phase * 1.7 + x / 31 - y / 27) : 0;
  return {dx:win * (-(y - py) * swing + flutter * (Math.sin(phase) + ripple)),
    dy:win * ((x - px) * swing + (strength.quick ? .55 : .5) * flutter * Math.cos(phase * (strength.quick ? 1.31 : 1.27) + .6))};
}
const STRENGTH = {
  wide:{bend:1, flutter:1, wide:true}, vivid:{bend:1.5, flutter:1.6, wide:true},
  // 1.8 × the gentle flutter equals the amplitude of the original 'tips'.
  tips2:{bend:0, flutter:1.8, quick:true}, tips3:{bend:0, flutter:1.8, quick:true, wide:true},
  rigid:{bend:1, flutter:1.8, quick:true, wide:true, rigid:true, twigs:true}
};
let scratch = null;
function paintFoliageSoft(ctx, image, region, time, seconds, mode, doc, boost) {
  const strength = STRENGTH[mode], spots = (strength.wide ? FOLIAGE_WIDE : FOLIAGE)[region];
  if (!spots || !image) return;
  const parts = separateFoliageSoft(image, spots, time, doc, 5, !!strength.twigs), margin = 16;
  const scale = (image.naturalWidth || image.width) / 1000, scaleY = (image.naturalHeight || image.height) / 1500;
  spots.forEach((spot, i) => {
    const part = parts[i];
    if (!part || part.cover < .05) return;
    const [cx, cy, rx, ry] = spot, wind = boughWind(region, i, spot, seconds, boost);
    const W = part.width + 2 * margin, H = part.height + 2 * margin;
    if (!scratch) scratch = typeof OffscreenCanvas === 'function' ? new OffscreenCanvas(W, H) : doc.createElement('canvas');
    if (scratch.width < W || scratch.height < H) { scratch.width = Math.max(scratch.width, W); scratch.height = Math.max(scratch.height, H); }
    const sc = scratch.getContext('2d');
    sc.globalCompositeOperation = 'source-over'; sc.clearRect(0, 0, W, H);
    // Adding the weighted tiles back together rebuilds the leaf layer, now smoothly stretched.
    sc.globalCompositeOperation = 'lighter';
    for (let b = 0; b < SOFT_NODES; b++) for (let a = 0; a < SOFT_NODES; a++) {
      const tile = part.tiles[b * SOFT_NODES + a];
      if (!tile) continue;
      const x = cx - rx + 2 * rx * a / (SOFT_NODES - 1), y = cy - ry + 2 * ry * b / (SOFT_NODES - 1);
      const shift = leafShift(spot, wind, seconds, i, x, y, strength);
      sc.drawImage(tile.canvas, margin + tile.x + shift.dx * scale, margin + tile.y + shift.dy * scaleY);
    }
    ctx.drawImage(part.plate, cx - rx, cy - ry, 2 * rx, 2 * ry);
    ctx.drawImage(scratch, 0, 0, W, H, cx - rx - margin / scale, cy - ry - margin / scaleY, W / scale, H / scaleY);
  });
}
export function paintFoliage(ctx, image, region, time, seconds, mode, doc, boost = 0) {
  if (STRENGTH[mode]) return paintFoliageSoft(ctx, image, region, time, seconds, mode, doc, boost);
  const spots = FOLIAGE[region];
  if (!spots || !image) return;
  const parts = separateFoliage(image, spots, time, doc);
  spots.forEach((spot, i) => {
    const part = parts[i];
    if (!part || part.cover < .05) return; // too few leaves here to be worth lifting
    const [cx, cy, rx, ry, near, px, py] = spot, wind = boughWind(region, i, spot, seconds, boost);
    const left = cx - rx, top = cy - ry, tw = 2 * rx / TILES, th = 2 * ry / TILES;
    const far = Math.max(Math.hypot(left - px, top - py), Math.hypot(left + 2 * rx - px, top - py),
      Math.hypot(left - px, top + 2 * ry - py), Math.hypot(left + 2 * rx - px, top + 2 * ry - py));
    const shimmer = alpha => {
      // Leaves turning in the wind catch the light: a brightening that travels with the gust.
      const wave = Math.max(0, Math.sin(seconds * 1.7 - cx * .012 + i)) * (.35 + .65 * Math.min(1, wind.stir));
      if (wave < .03) return;
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = alpha * wave * (time === 'night' ? .5 : 1);
      ctx.drawImage(part.leaves, left, top, 2 * rx, 2 * ry); ctx.restore();
    };
    if (mode === 'still') { shimmer(.2); return; }
    ctx.drawImage(part.plate, left, top, 2 * rx, 2 * ry);
    const lw = part.leaves.width / TILES, lh = part.leaves.height / TILES;
    // A bough bends by up to ~3 degrees in the foreground and ~1 degree far away.
    const swing = mode === 'branch' ? wind.bend * (.012 + .034 * near) : 0;
    const flutter = (mode === 'tips' ? 1.5 + 3.2 * near : .8 + 1.8 * near) * wind.stir;
    for (let row = 0; row < TILES; row++) for (let col = 0; col < TILES; col++) {
      const x = left + col * tw, y = top + row * th;
      // 0 at the bough's root, 1 at its farthest leaves: motion grows smoothly outward.
      const tip = Math.min(1, Math.hypot(x + tw / 2 - px, y + th / 2 - py) / far);
      const phase = seconds * (2.3 + .5 * ((i + col * 3 + row * 5) % 4)) + col * 1.7 + row * 2.9 + i - x * .01;
      const fx = flutter * tip ** 1.3 * Math.sin(phase), fy = flutter * tip ** 1.3 * .55 * Math.cos(phase * 1.31);
      ctx.save();
      ctx.translate(px, py); ctx.rotate(swing * (.45 + .55 * tip)); ctx.translate(-px, -py);
      ctx.drawImage(part.leaves, col * lw, row * lh, lw, lh, x + fx - .4, y + fy - .4, tw + .8, th + .8);
      ctx.restore();
    }
    shimmer(.07);
  });
}

const BUGS = new Set(['forest','countryside','river_lake','jungle']);
// Drawn over the calmed painters. `scene` is the painting on screen.
export function paintFinal(ctx, scene, env, seconds, doc) {
  const {region, time} = scene, clear = env.weather === 'sunny' || env.weather === 'cloudy';
  const layer = draw => { ctx.save(); draw(); ctx.restore(); };
  if (region === 'river_lake') layer(() => riverFlow(ctx, time, env.weather, seconds, {gain:.5, every:2}));
  layer(() => waterGlints(ctx, region, time, env.weather, seconds, {gain:.55, size:.7}));
  if (time === 'night' && env.weather === 'sunny') layer(() => nightSky(ctx, region, seconds, {gain:.6, size:.6, meteorEvery:41}));
  const dusk = time === 'evening' || time === 'night';
  if (clear && (region === 'memory_lake' || dusk && BUGS.has(region) && env.season === 'summer'))
    layer(() => fireflies(ctx, region, time, seconds, doc, {gain:region === 'memory_lake' && !dusk ? .55 : 1, size:.8}));
}
