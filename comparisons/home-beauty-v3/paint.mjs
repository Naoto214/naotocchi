import {drawNature,inContactWater} from './nature.mjs';
import {drawFullMotion} from './full-motion.mjs';

// Geometry and fade are supplied by the same call that paints the WebP.
export function composeNature(ctx, rect, host, fade, seconds, reduced) {
  const api=window.HomeBeauty, s=api.settings;
  api.paintRect={left:host.left+rect.left,top:host.top+rect.top,width:rect.width,height:rect.height};
  api.inContactWater=inContactWater;
  if (!fade.image) return;
  function layer(image,opacity) {
    if (!image || opacity<=0) return;
    const name=image.src.split('/').pop().split('.')[0];
    const parts=name.match(/^(.+)-(morning|day|evening|night)$/);
    if (!parts) return;
    ctx.save();
    ctx.translate(rect.left,rect.top);
    ctx.beginPath();ctx.rect(0,0,rect.width,rect.height);ctx.clip();
    const state={...s,region:parts[1],time:parts[2],width:rect.width,height:rect.height,seconds,reduced,opacity};
    if (s.variant.startsWith('D')) drawFullMotion(ctx,{...state,image});
    else drawNature(ctx,state);
    ctx.restore();
  }
  if (s.variant==='current') return;
  layer(fade.previous,1-fade.alpha);
  layer(fade.image,fade.alpha);
}
