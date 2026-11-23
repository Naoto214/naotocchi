window.preservePhoto=true;
function auditGoal(key,p){
 const a=model.snapshot().find(x=>x.key===key), b=model.bounds(a);
 const inside=p.x>=b.left&&p.x<=b.right&&p.y>=b.top&&p.y<=b.bottom;
 const bodies=[];
 for(const peer of model.snapshot()){
   if(peer.key===a.key)continue;
   const rx=(a.w+peer.w)*.5+10,ry=(a.h+peer.h)*.38+10,x=(a.x-peer.x)/rx,y=(a.y-peer.y)/ry;
   const dx=(p.x-a.x)/rx,dy=(p.y-a.y)/ry,t=Math.max(0,Math.min(1,-(x*dx+y*dy)/(dx*dx+dy*dy||1)));
   const closest=Math.hypot(x+t*dx,y+t*dy),before=Math.hypot(x,y);
   if(closest+1e-7<Math.min(1,before)||Math.hypot(x+dx,y+dy)<Math.min(1,before)+1e-7)bodies.push({key:peer.key,before,closest});
 }
 return {key,from:[a.x,a.y],requested:[p.x,p.y],inside,terrain:scene.navigation.segmentSafe(a,p),visible:scene.visible(p,a),bodies};
}
const nativeMove=model.move;
model.move=function(key,p,...args){
 const audit=auditGoal(key,p);
 const ok=nativeMove.call(this,key,p,...args);
 (window.observedMoves||=[]).push({...audit,ok});return ok;
};
regional.alternate=function(q){
 const a=model.snapshot().find(actor=>actor.key===q.key);
 const v=env.NaotocchiHomeViewport.residentPresentation(),r=displayRect(stage);
 const foot=[v.x+(r.left+a.x-v.x)*v.scaleX,v.y+(r.top+a.y-v.y)*v.scaleY];
 const seen=new Set();
 const candidates=[];
 for(const radius of [28,20,12,8,4,2,1]){
  for(let i=0;i<72;i++){
   const angle=i*Math.PI/36;
   const xy=[Math.round(foot[0]+radius*Math.cos(angle)),Math.round(foot[1]+radius*Math.sin(angle))];
   if(seen.has(xy.join(',')))continue;
   seen.add(xy.join(','));
   const p=point({clientX:xy[0],clientY:xy[1]});
   const start=point({clientX:q.from[0],clientY:q.from[1]});
   if(Math.hypot(p.x-start.x,p.y-start.y)<8)continue;
   const audit=auditGoal(q.key,p);
   if(!audit.inside||!audit.terrain||!audit.visible||audit.bodies.length)continue;
   candidates.push({xy,radius});
  }
 }
 return {tested:seen.size,clear:candidates.length,first:candidates[0]||null};
};
regional.measureOpening=()=>({target:window.inputReceipt,commands:window.observedMoves,trusted:window.regionalTrusted,trace:regionTrace});

regional.advanceWithDragTrace = function(seconds) {
  const key = window.inputReceipt.key;
  const command = window.observedMoves?.at(-1);
  const samples = [];
  const initial = model.snapshot().find(actor => actor.key === key);
  samples.push([0, initial.x, initial.y]);
  window.regionStepping = true;
  try {
    for (let step = 1; step <= seconds * 10; step++) {
      const previous = window.regionTrace.sourceHops.drag || 0;
      model.step(.1, {blocked:false, reducedMotion:false});
      if ((window.regionTrace.sourceHops.drag || 0) > previous) {
        const actor = model.snapshot().find(actor => actor.key === key);
        samples.push([step / 10, actor.x, actor.y]);
      }
    }
  } finally {
    window.regionStepping = false;
  }
  paint();
  if (command) {
    const [x,y] = command.requested;
    const distance = sample => Math.hypot(x-sample[1], y-sample[2]);
    window.inputReceipt.dragPath = {samples, initialDistance:distance(samples[0]),
      finalDragDistance:distance(samples.at(-1)), closestDistance:Math.min(...samples.map(distance))};
  }
};
