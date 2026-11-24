import {inContactWater} from './nature.mjs';
import {drawFullMotion} from './full-motion.mjs';
import {drawSeaE,inSeaEContact} from './sea-e.mjs';
import {drawForestE} from './forest-e.mjs';
import {drawSnowCityLake} from './snow-city-lake.mjs';
import {drawRiverHomeCountry} from './river-home-country.mjs';
import {drawMountainJungleDesert} from './mountain-jungle-desert.mjs';
import {drawDeepseaStars} from './deepsea-stars.mjs';
import {hasNativeLayer,previousIsNative} from './ambient.mjs';
import {drawNativeAccents} from './native-accents.mjs';

const regionPaint={
  sea:drawSeaE, forest:drawForestE,
  snow:drawSnowCityLake, city:drawSnowCityLake, memory_lake:drawSnowCityLake,
  river_lake:drawRiverHomeCountry, home:drawRiverHomeCountry, countryside:drawRiverHomeCountry,
  mountain:drawMountainJungleDesert, jungle:drawMountainJungleDesert, desert:drawMountainJungleDesert,
  deepsea:drawDeepseaStars, star_stop:drawDeepseaStars
};
function picture(image) {
  const match=image?.src.split('/').pop().match(/^([a-z_]+)-(morning|day|evening|night)\.webp(?:\?.*)?$/);
  return match && {region:match[1],time:match[2]};
}

export function composeNature(ctx,rect,host,fade,engineSeconds,reduced,official={}) {
  const api=window.HomeBeauty,s=api.settings;
  const seconds=api.sampleClock(engineSeconds);
  api.paintRect={left:host.left+rect.left,top:host.top+rect.top,width:rect.width,height:rect.height};
  const region=official.region??s.region;
  api.nativeReference=previousIsNative(region);
  const cut=Math.min(rect.width,Math.max(0,window.innerWidth*s.split-api.paintRect.left));
  const shown=picture(fade.previous && fade.alpha<.5?fade.previous:fade.image);
  api.waterSurface=(x,y,viewportX)=>{
    const onBaseline=s.variant==='previous' || (s.compareSplit && viewportX<window.innerWidth*s.split);
    return onBaseline ? inContactWater('sea',x,y) : inSeaEContact(x,y,shown?.time??s.time,reduced?0:seconds);
  };
  function layer(image,opacity) {
    const source=picture(image);
    if (!source || opacity<=0) return;
    const state={...s,...source,image,width:rect.width,height:rect.height,seconds,reduced,opacity};
    function draw(previous,from,to) {
      if (to<=from || (previous && previousIsNative(source.region))) return;
      ctx.save();
      try {
        ctx.translate(rect.left,rect.top);
        ctx.beginPath();ctx.rect(from,0,to-from,rect.height);ctx.clip();
        if (previous) drawFullMotion(ctx,{...state,variant:'D3'});
        else regionPaint[source.region]?.(ctx,{...state,variant:'E3'});
      } finally {ctx.restore();}
    }
    if (s.compareSplit && s.variant!=='previous') {
      draw(true,0,cut);
      draw(false,cut,rect.width);
    } else draw(s.variant==='previous',0,rect.width);
  }
  if (fade.previous) layer(fade.previous,1-fade.alpha);
  layer(fade.image,fade.alpha);
  // The native home decorates the blended painting once. Its original accents
  // are not texture-locked, unlike the E3 layers. Preserve that distinction.
  if (hasNativeLayer(region,s) && !reduced) {
    ctx.save();
    if (s.variant!=='previous') {
      ctx.beginPath();ctx.rect(0,0,Math.max(0,window.innerWidth*s.split-host.left),host.height);ctx.clip();
    }
    drawNativeAccents(ctx,rect,region,seconds*1000,official.contain??window.innerWidth>window.innerHeight,{reducedMotion:reduced});
    ctx.restore();
  }
}
