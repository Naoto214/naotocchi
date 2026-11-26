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
import {paintFinal, paintSway, paintFoliage, FINAL_EFFECTS} from './final.mjs';

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
export function paintLiving(ctx, rect, fade, seconds, env, reduced, {maximum = false, final = false, treeSway = 'tips2', wind = 0, daySource = null, layers = null, level = 1, document:doc} = {}) {
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
    if (treeSway === 'bump') paintSway(ctx, shown, scene.region, seconds);
    else paintFoliage(ctx, shown, scene.region, scene.time, seconds, treeSway, doc, wind, typeof daySource === 'function' ? daySource(scene.region) : daySource, level);
    paintFinal(ctx, scene, env, seconds, doc, layers);
  }
  ctx.restore();
}
