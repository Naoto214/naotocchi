// Read-only target setup and observations, inserted into the native controller for QA.
const trials = [];
let currentTrial;
const nativeMove = model.move;
model.move = function (key, p, source, options) {
  const ok = nativeMove.call(this, key, p, source, options);
  if (source === 'drag' && currentTrial) {
    currentTrial.commands.push({key, ok, point: p});
  }
  return ok;
};
for (const type of ['pointerdown', 'pointerup', 'pointercancel']) {
  stage.addEventListener(type, e => {
    if (currentTrial) currentTrial.events.push([type, e.pointerType, e.isTrusted]);
  }, true);
}
function touchSample() {
  const actors = model.snapshot();
  for (const t of trials) {
    if (!t.commands.length || model.metrics().clock > t.startClock + 14) continue;
    const a = actors.find(a => a.key === t.key);
    if (a.source === 'drag') {
      t.walkedCSS = Math.max(t.walkedCSS, Math.hypot((a.x-t.foot[0])*t.scale[0], (a.y-t.foot[1])*t.scale[1]));
      if (a.target) t.sawTarget = true;
    }
  }
}
const nativeStep = model.step;
model.step = function (...args) {
  const result = nativeStep.apply(this, args);
  touchSample();
  return result;
};
window.residentTouches = {
  ready: () => model.snapshot().length===28 && !pendingResidentPresentation && !blocked() &&
    !!world?.stats().loaded && [...rows.values()].every(r=>r.owner.querySelector('img.character-asset')?.naturalWidth),
  keys: () => model.snapshot().map(a=>a.key),
  prepare(key) {
    const people=model.snapshot(), a=people.find(a=>a.key===key), v=env.NaotocchiHomeViewport.residentPresentation();
    const r=displayRect(stage), box=rows.get(key).owner.querySelector('img.character-asset').getBoundingClientRect();
    const screen=p=>[Math.round(v.x+(r.left+p.x-v.x)*v.scaleX), Math.round(v.y+(r.top+p.y-v.y)*v.scaleY)];
    let from, opaque;
    const steps=[.5,.4,.6,.3,.7,.2,.8,.1,.9,.05,.95];
    for (const dy of steps) {
      for (const dx of steps) {
        const x=Math.round(box.left+box.width*dx),y=Math.round(box.top+box.height*dy);
        const target=document.elementFromPoint(x,y);
        if (!stage.contains(target) || target.closest('button,a,input,select,textarea')) continue;
        const event={clientX:x,clientY:y}, p=point(event);
        const alpha=paintedAlpha(key,p,x,y);
        if (alpha>=128 && !opaque) opaque=[x,y];
        if (alpha===null || alpha<128) continue;
        const stack = [...new Set(document.elementsFromPoint(x,y).map(el =>
          el.closest('[data-diorama-actor]')?.dataset.dioramaActor).filter(Boolean))];
        const visibleKey = stack.find(k => {
          const opacity = paintedAlpha(k,p,x,y);
          return opacity === null || opacity > 0;
        });
        if (visibleKey === key) {from=[x,y];break;}
      }
      if(from)break;
    }
    const nav=scene.navigation,bounds=model.bounds(a);
    let goal,rank=-1, terrainRays=0, clearRays=0;
    for(const length of [30,18,10])for(let k=0;k<16;k++){
      const angle=k*Math.PI/8,p={x:a.x+length*Math.cos(angle)/v.scaleX, y:a.y+length*Math.sin(angle)/v.scaleY};
      const xy=screen(p);
      if(!stage.contains(document.elementFromPoint(...xy)) || Math.hypot(xy[0]-(from||opaque||screen(a))[0],xy[1]-(from||opaque||screen(a))[1])<10)continue;
      const terrain=p.x>=bounds.left&&p.x<=bounds.right&&p.y>=bounds.top&&p.y<=bounds.bottom&&
        nav.segmentSafe(a,p,q=>visibleAt(q,a));
      const clear=terrain&&people.every(b=>b===a||[.25,.5,.75,1].every(t=>Math.hypot(
        (a.x+(p.x-a.x)*t-b.x)/((a.w+b.w)*.5+10), (a.y+(p.y-a.y)*t-b.y)/((a.h+b.h)*.38+10))>=1));
      if(terrain)terrainRays++; if(clear)clearRays++;
      const score=(clear?200:terrain?100:0)+length;
      if(score>rank){goal=xy;rank=score;}
    }
    currentTrial={key,from:from||opaque||screen(a),targetVisible:!!from,goal:goal||screen(a),
      terrainRays,clearRays,foot:[a.x,a.y],scale:[v.scaleX,v.scaleY],
      startClock:model.metrics().clock,commands:[],events:[],walkedCSS:0,sawTarget:false};
    trials.push(currentTrial);
    return currentTrial;
  },
  settled:()=>!!currentTrial?.commands.length || !gesture&&!waitingDrop,
  record:timedOut=>{
    currentTrial.selected=model.selected();
    if (timedOut) currentTrial.timeout={blocked:blocked(), hard:hardInputBlock(),
      gesture:gesture?.key||null, waiting:waitingDrop?.key||null, visibility:doc.visibilityState};
    currentTrial=null;
  },
  finish:()=>trials.map(t=>({...t,walkedCSS:+t.walkedCSS.toFixed(2)}))
};
