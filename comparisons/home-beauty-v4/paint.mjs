import {inContactWater} from './nature.mjs';
import {drawFullMotion} from './full-motion.mjs';
import {drawSeaE,inSeaEContact} from './sea-e.mjs';
import {drawForestE} from './forest-e.mjs';

function picture(image) {
  const match=image?.src.split('/').pop().match(/^([a-z_]+)-(morning|day|evening|night)\.webp(?:\?.*)?$/);
  return match && {region:match[1],time:match[2]};
}

// Both sides run on one decoded source, one canvas, one frame clock and one cast.
export function composeNature(ctx,rect,host,fade,engineSeconds,reduced) {
  const api=window.HomeBeauty,s=api.settings;
  const seconds=api.sampleClock(engineSeconds);
  api.paintRect={left:host.left+rect.left,top:host.top+rect.top,width:rect.width,height:rect.height};
  if (!fade.image) return;
  const shown=picture(fade.previous && fade.alpha<.5?fade.previous:fade.image);
  api.waterSurface=(x,y,viewportX)=>{
    const onBaseline=s.variant==='D3' || (s.compareSplit && viewportX<window.innerWidth*s.split);
    return onBaseline ? inContactWater('sea',x,y) : inSeaEContact(x,y,shown?.time??s.time,reduced?0:seconds);
  };
  function layer(image,opacity) {
    const source=picture(image);
    if (!source || opacity<=0) return;
    const state={...s,...source,image,width:rect.width,height:rect.height,seconds,reduced,opacity};
    function draw(variant,from,to) {
      if (to<=from) return;
      ctx.save();
      try {
        ctx.translate(rect.left,rect.top);
        ctx.beginPath();ctx.rect(from,0,to-from,rect.height);ctx.clip();
        if (variant==='D3') drawFullMotion(ctx,{...state,variant});
        else if (source.region==='sea') drawSeaE(ctx,{...state,variant});
        else if (source.region==='forest') drawForestE(ctx,{...state,variant});
      } finally {ctx.restore();}
    }
    if (s.compareSplit && s.variant!=='D3') {
      const cut=Math.min(rect.width,Math.max(0,window.innerWidth*s.split-api.paintRect.left));
      draw('D3',0,cut);
      draw(s.variant,cut,rect.width);
    } else draw(s.variant,0,rect.width);
  }
  if (fade.previous) layer(fade.previous,1-fade.alpha);
  layer(fade.image,fade.alpha);
}
