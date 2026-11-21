// Installed inside the native controller only by the fixed-workload experiment.
// Independently timed ordinary play uses the original controller and clocks.
const experiment=window.fixedCast={};
const painters=PAINTERS;
const scriptStep=.12;
let fixture,baseActors,activePose,realSnapshot;
experiment.capture=(count,seed)=>{
  window.holdGameTasks=true;
  HomeCastTrial.apply({paused:false});
  const active=mobilityPerf.reset(seed);
  realSnapshot=active.snapshot;
  baseActors=realSnapshot().map(a=>({...a}));
  fixture=[];
  const moving=new Set(),activities=new Set(),distance=new Map(),initial=baseActors.map(a=>[a.key,a.x,a.y,a.w,a.h]);
  let previous=baseActors;
  for(let index=0;index<count;index++){
    active.step(scriptStep,{blocked:false,reducedMotion:false});
    const state=realSnapshot();
    const pose=state.map((a,i)=>{
      const delta=Math.hypot(a.x-previous[i].x,a.y-previous[i].y);
      if(delta>0){moving.add(a.key);distance.set(a.key,(distance.get(a.key)||0)+delta);}
      activities.add(a.activity);
      return [a.x,a.y,a.direction,a.activity,a.target?.x??null,a.target?.y??null];
    });
    fixture.push(pose);
    previous=state;
  }
  active.snapshot=()=>activePose||realSnapshot();
  return {initial,pose:fixture,moving:[...moving],distance:Object.fromEntries(distance),activities:[...activities]};
};
const nextReplayFrame=()=>new Promise(resolve=>mobilityPerf.nativeRaf(resolve));
const advance=pose=>{
  activePose=pose.map(([x,y,direction,activity,tx,ty],i)=>({...baseActors[i],x,y,direction,activity,target:tx===null?null:{x:tx,y:ty}}));
};
const locationOf=new WeakMap();
function effectName(effect){
  const el=effect.effect?.target;
  if(!el)return null;
  if(!locationOf.has(el)){
    const path=[];
    for(let n=el;n&&n!==stage;n=n.parentElement){
      const owner=n.dataset.dioramaActor;
      if(owner){path.unshift(owner);break;}
      path.unshift(n.tagName+'['+Array.prototype.indexOf.call(n.parentElement?.children||[],n)+']');
    }
    locationOf.set(el,path.join('/'));
  }
  return locationOf.get(el)+'/'+(effect.animationName||effect.transitionProperty||'web-animation');
}
experiment.run=async(arm,warmup)=>{
  const render=painters[arm];
  const byAnimation=new WeakMap(),motionSteps=[],gaps=[],activeByFrame=[];
  for(const row of rows.values())row.paintStamp=null;
  activePose=baseActors.map(a=>({...a,activity:'rest',target:null}));
  render();
  const svgs=[...stage.querySelectorAll('svg')].filter(n=>n.querySelector('animate,animateTransform,animateMotion'));
  svgs.forEach(n=>n.pauseAnimations?.());
  const q=mobilityPerf;
  function phase(index){
    const tokens=[];
    for(const animation of stage.getAnimations({subtree:true})){
      const name=effectName(animation);
      if(!name)continue;
      if(!byAnimation.has(animation)){animation.pause();byAnimation.set(animation,index);}
      const elapsed=Math.max(0,index-byAnimation.get(animation))*scriptStep*1000;
      animation.currentTime=elapsed;
      tokens.push(name+'@'+elapsed.toFixed(2));
    }
    for(const svg of svgs)svg.setCurrentTime?.(index*scriptStep);
    return tokens.sort().join('|');
  }
  let prev;
  // Draw/measure on successive *native* callbacks; the final callback closes
  // the last interval, including its raster and compositor scheduling.
  for(let i=0;i<fixture.length;i++){
    const stamp=await nextReplayFrame();
    if(i>warmup)gaps.push(stamp-prev);
    if(i===warmup){await window.markSampling(performance.now());}
    prev=stamp;
    advance(fixture[i]);
    HomeBeauty.clockSeconds=i*scriptStep;
    world.draw(scriptStep,{paused:false,reducedMotion:false,tier:flags.tier||0});
    render();
    const signature=phase(i);
    motionSteps.push(signature);
    activeByFrame.push(activePose.filter(a=>a.target).length);
  }
  gaps.push(await nextReplayFrame()-prev);
  const art=document.querySelector('canvas[data-mobility-painting]')?.dataset.mobilityPainting;
  return {intervals:gaps,motionSteps,activeByFrame,svgAnimations:svgs.length,art,cast:rows.size};
};
