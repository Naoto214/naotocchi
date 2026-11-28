// Living-world layer for the painted home: swaying boughs and grass, water, light and lamps.
// The region painters are the E3 set from #567/#568 (2935622e), reused unchanged. Their own
// falling particles are switched off here; rain, snow, petals and leaf B come from the newer layers.
import {drawSeaE} from './sea-e.mjs';
import {drawForestE} from './forest-e.mjs';
import {drawSnowCityLake} from './snow-city-lake.mjs';
import {drawRiverHomeCountry} from './river-home-country.mjs';
import {drawMountainJungleDesert} from './mountain-jungle-desert.mjs';
import {drawDeepseaStars} from './deepsea-stars.mjs';
import {paintMaximum, MAXIMUM_STRENGTH} from './maximum.mjs';
import {paintFinal, paintSway, paintFoliage, FINAL_EFFECTS, daylightOf} from './final.mjs';
import {paintClouds, cloudsUnder, cloudVeil, SKY} from './clouds.mjs';

const painters = {
  sea:drawSeaE, forest:drawForestE,
  snow:drawSnowCityLake, city:drawSnowCityLake, memory_lake:drawSnowCityLake,
  river_lake:drawRiverHomeCountry, home:drawRiverHomeCountry, countryside:drawRiverHomeCountry,
  mountain:drawMountainJungleDesert, jungle:drawMountainJungleDesert, desert:drawMountainJungleDesert,
  deepsea:drawDeepseaStars, star_stop:drawDeepseaStars
};
const noFall = Object.freeze({count:0, size:1, speed:1, wind:1});
function picture(image) {
  const match = image?.src?.split('/').pop().match(/^([a-z_]+)-(morning|day|evening|night)\.webp(?:\?.*)?$/);
  return match && {region:match[1], time:match[2]};
}
export const livingRegions = Object.freeze(Object.keys(painters));

// `maximum` drives the reused painters at full strength and adds the maximum layer on top.
// `final` keeps them at their calm strength, without cut-out deformation, and adds the final layer.
export function paintLiving(ctx, rect, fade, seconds, env, reduced, {maximum = false, final = false, treeSway = 'tips2', wind = 0, daySource = null, layers = null, level = 1, sky:look = null, clouds = true, document:doc} = {}) {
  function layer(image, opacity) {
    const scene = picture(image), paint = painters[scene?.region];
    if (!paint || opacity <= 0) return;
    ctx.save();
    try {
      ctx.translate(rect.left, rect.top);
      ctx.beginPath();
      ctx.rect(0, 0, rect.width, rect.height);
      ctx.clip();
      paint(ctx, {...scene, variant:'E3', image, width:rect.width, height:rect.height, seconds, reduced, opacity,
        ...(final ? {effects:FINAL_EFFECTS[scene.region]} : null),
        strength:maximum ? MAXIMUM_STRENGTH : 1, season:env.season, weather:env.weather, fallPlus:true, fall:noFall});
    } finally { ctx.restore(); }
  }
  if (fade.previous) layer(fade.previous, 1 - fade.alpha);
  layer(fade.image, fade.alpha);
  if (!maximum && !final || reduced) return;
  const shown = fade.previous && fade.alpha < .5 ? fade.previous : fade.image, scene = picture(shown);
  if (!scene) return;
  ctx.save();
  ctx.translate(rect.left, rect.top);
  ctx.beginPath(); ctx.rect(0, 0, rect.width, rect.height); ctx.clip();
  ctx.scale(rect.width / 1000, rect.height / 1500);
  if (maximum) paintMaximum(ctx, scene, env, seconds, doc);
  else {
    const cover = clouds && SKY[scene.region] ? look?.cover || 0 : 0, canopy = SKY[scene.region]?.open === false;
    let under = null;
    if (look && SKY[scene.region]) {
      // Less light reaches the ground under heavy cloud. The painting is multiplied by a cool
      // tone, so its shading and texture stay; the sky itself is left to the clouds.
      const dim = (1 - look.light) * (scene.time === 'night' ? .5 : 1) * (scene.region === 'home' ? 0 : 1);
      if (dim > .01) {
        const to = SKY[scene.region].to * 1500, g = ctx.createLinearGradient(0, to * .5, 0, to + 90), tone = k => `rgb(${Math.round(255 - 62 * k)},${Math.round(255 - 54 * k)},${Math.round(255 - 38 * k)})`;
        g.addColorStop(0, tone(dim * .25)); g.addColorStop(1, tone(dim));
        ctx.save(); ctx.globalCompositeOperation = 'multiply'; ctx.fillStyle = g; ctx.fillRect(0, 0, 1000, 1500); ctx.restore();
      }
    }
    // Clouds go on first, so trees, hills and roofs stay in front of them.
    if (cover > 0) {
      const source = typeof daySource === 'function' ? daySource(scene.region) : daySource;
      const day = /-day\.webp(?:\?|$)/.test(shown.src || '') ? shown : source ? daylightOf(scene.region + '#sky', shown, doc, source) : null;
      if (day) {
        paintClouds(ctx, day, scene.region, scene.time, seconds, cover, doc, look);
        // Stars and shooting stars are hidden where cloud lies over them, and show in the gaps.
        if (layers) layers = {...layers, hidden:(x, y) => cloudVeil(scene.region, x, y, seconds, cover, look)};
        if (canopy) under = (x, y, w, h) => { if (y < SKY[scene.region].to * 1500) cloudsUnder(ctx, x, y, w, h); };
      }
    }
    if (treeSway === 'bump') paintSway(ctx, shown, scene.region, seconds);
    else paintFoliage(ctx, shown, scene.region, scene.time, seconds, treeSway, doc, wind, typeof daySource === 'function' ? daySource(scene.region) : daySource, level, under);
    paintFinal(ctx, scene, env, seconds, doc, layers);
  }
  ctx.restore();
}
