// The final candidate: the calm strength of the living layer, with the motions that read as
// "the picture is being bent" replaced by ones that read as "the world is alive".
//  - Leaves and grass move by a smooth local shift that is zero at the edge of each spot, so
//    there is no cut-out to see, trunks and thick boughs stay put, and nothing doubles.
//  - Fireflies and drifting lights each keep their own home, path, pace and rhythm.
//  - Water keeps the gentle painters; a quiet glitter and a soft current are added on top.
import {fireflies, nightSky, waterGlints, riverFlow, gustAt} from './maximum.mjs';

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
