(()=>{
// This experiment runs on a native V9 home with the original 28 images, stage,
// ground and environment. No production entry loads these observation hooks.
const fixedCast=window.fixedCast={};
const fixedPainters=PAINTERS;
const stepSeconds=.12;
let fixedActors,frames,pose,clipSize;
const motionName=new WeakMap();
function fixedEffectName(animation){
  const el=animation.effect?.target;
  if(!el)return '';
  if(!motionName.has(el)){
    const path=[];
    for(let n=el;n&&n!==stage;n=n.parentElement){
      if(n.dataset.dioramaActor){path.unshift(n.dataset.dioramaActor);break;}
      path.unshift(n.tagName+'['+Array.prototype.indexOf.call(n.parentElement?.children||[],n)+']');
    }
    motionName.set(el,path.join('/'));
  }
  return motionName.get(el)+'/'+(animation.animationName||animation.transitionProperty||'animation');
}
fixedCast.capture=({clips,size,scan,seed,stress=false})=>{
  window.holdGameTasks=true;
  HomeCastTrial.apply({paused:false});
  const model=mobilityPerf.reset(seed),snapshot=model.snapshot;
  fixedActors=snapshot();clipSize=size;
  const initial=fixedActors.map(a=>[a.key,a.x,a.y,a.w,a.h]);
  const candidates=[];
  let previous=fixedActors;
  for(let c=0;c<scan;c++){
    const window=[],moving=new Set();let score=0;
    for(let j=0;j<size;j++){
      // The native model clamps a single step to 100ms. Advance the real 120ms.
      model.step(.1,{blocked:false,reducedMotion:false});
      model.step(.02,{blocked:false,reducedMotion:false});
      const state=snapshot();const moved=[];
      const positions=state.map((a,i)=>{
        if(Math.hypot(a.x-previous[i].x,a.y-previous[i].y)>1e-7){moved.push(i);moving.add(i);}
        return [a.x,a.y,a.direction,a.activity,a.target?.x??null,a.target?.y??null,a.source];
      });
      if(j>=2)score+=moved.length;
      window.push({at:(c*size+j+1)*stepSeconds,positions,moved});previous=state;
    }
    candidates.push({index:c,score,window,moving:[...moving]});
  }
  // Select complete, disjoint native stretches solely by physical foot movement.
  // At clip changes the first two outgoing display intervals are excluded.
  const ranked=[...candidates].sort((a,b)=>b.score-a.score||a.index-b.index);
  const selected=ranked.slice(0,clips).sort((a,b)=>a.index-b.index);
  frames=selected.flatMap(c=>c.window);
  let sourcesPerResident=null;
  if(stress){
    // Renderer-only pressure experiment. Each resident follows its own intact
    // native stretch. The simultaneous combination is not a navigable game state.
    sourcesPerResident=fixedActors.map((a,k)=>{
      const windows=candidates.map(c=>({index:c.index,score:c.window.slice(2).filter(f=>f.moved.includes(k)).length}));
      windows.sort((a,b)=>b.score-a.score||a.index-b.index);
      const moving=windows.filter(w=>w.score>0),pool=moving.length?moving:windows;
      return Array.from({length:clips},(_,i)=>pool[i%pool.length].index);
    });
    frames=frames.map((frame,i)=>{
      const clip=Math.floor(i/size),within=i%size,moved=[];
      const positions=fixedActors.map((a,k)=>{
        const source=candidates[sourcesPerResident[k][clip]].window[within];
        if(source.moved.includes(k))moved.push(k);
        return source.positions[k];
      });
      return {at:frame.at,moved,positions};
    });
  }
  model.snapshot=()=>pose||snapshot();
  return {initial,frames,clips:selected.map(({index,score,moving})=>({index,score,moving})),
    stress,sourcesPerResident,allScores:candidates.map(c=>c.score),sourceSeconds:scan*size*stepSeconds,stepSeconds,clipSize:size};
};
fixedCast.run=async(arm,warm)=>{
  const render=fixedPainters[arm],phaseLog=[],gaps=[],intervalFrames=[],environment=[],walkers=[],countByKey={};
  const born=new WeakMap();const svg=[...stage.querySelectorAll('svg')].filter(n=>n.querySelector('animate,animateTransform,animateMotion'));
  for(const n of svg)n.pauseAnimations?.();
  for(const row of rows.values())row.paintStamp=null;
  pose=fixedActors.map(a=>({...a,activity:'rest',target:null}));render();
  const beauty=env.HomeBeauty,originalClock=beauty.sampleClock;
  let sourceTime=0,envCalls=0,previous;
  // The native environment still paints every prescribed sample; all three use
  // the same scene timestamp, including jumps between the selected real clips.
  beauty.sampleClock=()=>{envCalls++;beauty.clockSeconds=sourceTime;return sourceTime;};
  const nextFrame=()=>new Promise(resolve=>mobilityPerf.nativeRaf(resolve));
  try{
    for(let i=0;i<=frames.length;i++){
      const stamp=await nextFrame();
      const last=i-1;
      if(last>=warm && last%clipSize>=2){gaps.push(stamp-previous);intervalFrames.push(last);}
      if(i===frames.length)break;
      if(i===warm)await window.markSampling(performance.now());
      previous=stamp;const frame=frames[i];sourceTime=frame.at;
      pose=frame.positions.map(([x,y,direction,activity,tx,ty,source],k)=>({...fixedActors[k],x,y,direction,activity,source,target:tx===null?null:{x:tx,y:ty}}));
      const before=envCalls;world.draw(stepSeconds,{paused:false,reducedMotion:false,tier:flags.tier||0});
      environment.push([sourceTime,envCalls-before]);render();
      const effects=[];
      for(const a of stage.getAnimations({subtree:true})){
        const name=fixedEffectName(a);if(!name)continue;
        if(!born.has(a)){a.pause();born.set(a,i);}
        const ms=(i-born.get(a))*stepSeconds*1000;a.currentTime=ms;effects.push(name+'@'+ms.toFixed(1));
      }
      for(const n of svg)n.setCurrentTime?.(i*stepSeconds);
      phaseLog.push(effects.sort().join('|'));walkers.push(pose.filter(a=>a.target).length);
      for(const k of frame.moved){const key=fixedActors[k].key;countByKey[key]=(countByKey[key]||0)+1;}
    }
  }finally{beauty.sampleClock=originalClock;}
  return {intervals:gaps,intervalFrames,phaseLog,environment,walkers,countByKey,cast:rows.size,svg:svg.length,painting:stage.ownerDocument.querySelector('canvas[data-mobility-painting]').dataset.mobilityPainting};
};
})();
