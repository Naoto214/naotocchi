// Pure 2.5D projection shared by egg and terrain; no renderer dependencies.
export function artTransform(host,stage){
 // Full artwork width is always retained. Bottom ground is pinned to the stage,
 // not the browser's dynamic address bar. Uniform scale prevents stretching.
 const width=Math.min(host.width,stage.width+2*stage.left),height=width*1.5,left=stage.left+stage.width/2-width/2,top=stage.top+stage.height-height*.94;
 return {width,height,left,top,project:p=>({x:left+p.x*width-stage.left,y:top+p.z*height-stage.top}),unproject:p=>({x:(p.x+stage.left-left)/width,z:(p.y+stage.top-top)/height,y:0})};
}

// Decorative coverage is deliberately independent of terrain/input projection.
// Only margins outside the cast stage may blend into the cover-sized painting.
export function backdropComposition(host,stage){
 const terrain=artTransform(host,stage),width=Math.max(host.width,host.height/1.5),height=width*1.5;
 return {terrain,cover:{width,height,left:(host.width-width)/2,top:(host.height-height)/2},
  fadeTop:Math.min(40,Math.max(0,stage.top-terrain.top)),
  fadeBottom:Math.min(40,Math.max(0,terrain.top+terrain.height-stage.top-stage.height))};
}
export function paintBackdrop(ctx,img,host,stage){
 const {terrain:t,cover:c,fadeTop,fadeBottom}=backdropComposition(host,stage);
 ctx.drawImage(img,c.left,c.top,c.width,c.height);
 const iw=img.naturalWidth||1024,ih=img.naturalHeight||1536;
 const strip=(y,h,alpha)=>{if(h<=0)return;ctx.globalAlpha=alpha;ctx.drawImage(img,0,y/t.height*ih,iw,h/t.height*ih,t.left,t.top+y,t.width,h);};
 ctx.save();
 strip(fadeTop,t.height-fadeTop-fadeBottom,1);
 // Small fixed strip count, never inside the gameplay stage. Static composition
 // is cached by the caller; animation does not repeat these image resamples.
 for(let i=0;i<20;i++){
  strip(i*fadeTop/20,fadeTop/20,(i+.5)/20);
  strip(t.height-fadeBottom+i*fadeBottom/20,fadeBottom/20,1-(i+.5)/20);
 }
 ctx.restore();
}
