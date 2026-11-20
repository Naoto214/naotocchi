// The five V3 scenes had an adopted comparison renderer. The other scenes use
// the actual shipped particle markup and the accent loop extracted by build.cjs.
const previousD3=new Set(['forest','sea','snow','city','memory_lake']);
export const previousIsNative=region=>!previousD3.has(region);
export const hasNativeLayer=(region,s)=>previousIsNative(region)&&(s.variant==='previous'||s.compareSplit);
const fxClocks=new WeakMap();

export function placeNativeParticles(fx,api,env,rect,host,rebuilt) {
  const s=api.settings,native=hasNativeLayer(env.region,s);
  const cut=Math.max(0,Math.min(rect.width,window.innerWidth*s.split-host.left-rect.left));
  // Legacy CSS clip intersects the authored window/water clip-path on this
  // absolutely positioned layer; it never replaces the painting's own mask.
  const clip=native && s.variant!=='previous'?'rect(auto, '+cut+'px, auto, auto)':'auto';
  if(fx.style.clip!==clip)fx.style.clip=clip;
  if(!native||!fx.childElementCount)return;
  const key=JSON.stringify([api.frozen,api.clockRevision,s.speed]);
  if(!rebuilt && fxClocks.get(fx)===key)return;
  fxClocks.set(fx,key);
  for (const animation of fx.getAnimations?.({subtree:true})||[]) {
    animation.playbackRate=s.speed;
    animation.currentTime=api.clockSeconds*1000;
    if(api.frozen)animation.pause();else animation.play();
  }
}
