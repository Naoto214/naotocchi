import {drawSeaE,inSeaEContact} from './sea-e.mjs';
import {drawForestE} from './forest-e.mjs';
import {drawSnowCityLake} from './snow-city-lake.mjs';
import {drawRiverHomeCountry} from './river-home-country.mjs';
import {drawMountainJungleDesert} from './mountain-jungle-desert.mjs';
import {drawDeepseaStars} from './deepsea-stars.mjs';
import {referenceFall} from './leaf-comparison.mjs';

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

export function composeNature(ctx,rect,host,fade,engineSeconds,reduced) {
  const api=window.HomeBeauty, s=api.settings;
  const seconds=api.sampleClock(engineSeconds);
  api.paintRect={left:host.left+rect.left,top:host.top+rect.top,width:rect.width,height:rect.height};
  const cut=Math.min(rect.width,Math.max(0,window.innerWidth*s.split-api.paintRect.left));
  const shown=picture(fade.previous && fade.alpha<.5?fade.previous:fade.image);
  api.waterSurface=(x,y)=>inSeaEContact(x,y,shown?.time??s.time,reduced?0:seconds);

  function layer(image,opacity) {
    const scene=picture(image);
    const paint=regionPaint[scene?.region];
    if (!paint || opacity<=0) return;
    const state={...scene,variant:'E3',fallPlus:true,image,width:rect.width,height:rect.height,seconds,reduced,opacity,
      effects:s.effects,strength:s.strength,season:s.season,weather:s.weather};
    // Only paintings with a #568 dry autumn leaf emitter take the candidate
    // settings. During a crossfade, evaluate this for each actual image.
    const hasLeaves=s.season==='autumn' && (s.weather==='sunny'||s.weather==='cloudy') &&
      (scene.region==='forest'||(scene.region==='countryside' && scene.time!=='night'));
    const candidate=!reduced && hasLeaves && s.variant!=='E3plus';
    function draw(useCandidate,from,to,leafCut) {
      if(to<=from)return;
      ctx.save();
      try {
        ctx.translate(rect.left,rect.top);
        ctx.beginPath();
        ctx.rect(from,0,to-from,rect.height);
        ctx.clip();
        paint(ctx,{...state,leafCut,fall:useCandidate?s.fall:referenceFall,
          leafVariant:useCandidate?s.variant:null,leafColor:useCandidate?s.leafColor:'mixed'});
      } finally {ctx.restore();}
    }
    if (s.compareSplit && candidate && cut>0 && cut<rect.width && (s.fall?.wind??1)===1) {
      draw(true,0,rect.width,1000*cut/rect.width);
    } else if (s.compareSplit && candidate) {
      draw(false,0,cut);
      draw(true,cut,rect.width);
    } else draw(candidate,0,rect.width);
  }
  if (fade.previous) layer(fade.previous,1-fade.alpha);
  layer(fade.image,fade.alpha);
}
