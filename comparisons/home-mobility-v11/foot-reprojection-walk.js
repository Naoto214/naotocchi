// Test-only. Replay the full recorded household and request the mathematically
// verified straight exit through the exact native planner and stepping model.
function walkAvailableBearing(record) {
  const qa=globalThis.touchQA;
  qa.matrixLoad(record.snapshot);
  qa.manual=true;
  const lead=actors.find(a=>a.kind==='pet');
  const points=record.held.strictLongBearings96;
  if(!points.length)return {outcome:'no-existing-straight-exit'};
  const angle=points[0]*Math.PI/180,length=Math.max(40,lead.w*1.2);
  const end=limit(lead,{x:lead.x+length*Math.cos(angle),y:lead.y+length*Math.sin(angle)},scene);
  const original={x:lead.x,y:lead.y},sc=scene.navigation.intentScale;
  const sameFoot=record.points.every(p=>{
    const a=actors.find(b=>b.key===p.key);
    return Math.hypot(a.x-p.before[0],a.y-p.before[1])<1e-7;
  });
  if(!sameFoot)throw Error('restore changed the household');
  const originalRoutes=actors.filter(a=>a.target).map(a=>({key:a.key,target:{...a.target},route:a.route.map(p=>({...p}))}));
  const lastPoint=r=>r.route.at(-1)||r.target;
  const priorWalks=originalRoutes.map(r=>({key:r.key,end:lastPoint(r),arrived:false,walkedCss:0}));
  const panda=actors.find(a=>a.key==='companion:panda'),pandaStart=panda&&{x:panda.x,y:panda.y};
  const syncAtStart=qa.matrixSyncShifts?.length||0;
  const accepted=move(lead.key,end,'ambient');
  let actual=0,steps=0,safetyErrors=0,maxStep=0,arrived=false;
  const initialTarget=lead.target&&{...lead.target},initialRoute=lead.route.map(p=>({...p}));
  // One live household clock and native autonomy. Every actor takes native
  // steps; the age probe independently audits swept contacts and terrain.
  const safetyBefore=structuredClone(qa.ageSafety);
  qa.ageActive=true;
  for(let i=0;accepted&&i<240;i++){
    const old={x:lead.x,y:lead.y};
    const previous=priorWalks.map(r=>{const a=actor(r.key);return {x:a.x,y:a.y};});
    qa.step(.05,{blocked:false,reducedMotion:false,autonomy:true});
    priorWalks.forEach((r,k)=>{
      const now=actor(r.key),p=previous[k];r.walkedCss+=Math.hypot((p.x-now.x)*sc.x,(p.y-now.y)*sc.y);
      if(Math.hypot(now.x-r.end.x,now.y-r.end.y)<1e-6)r.arrived=true;
    });
    const change=Math.hypot((lead.x-old.x)*sc.x,(lead.y-old.y)*sc.y);
    if(change>1e-6){
      actual+=change;steps++;maxStep=Math.max(maxStep,change);
      if(!scene.navigation.valid(lead)||!visible(lead,lead))safetyErrors++;
    }
    if(Math.hypot(lead.x-end.x,lead.y-end.y)<1e-3){arrived=true;break;}
    if(!lead.target)break;
  }
  qa.ageActive=false;
  return {bearing:points[0],start:original,end,accepted,initialTarget,initialRoute,
    sameOpening:sameFoot,originalRoutes,priorWalks,
    nonWalkingCorrections:(qa.matrixSyncShifts?.length||0)-syncAtStart,
    pandaChange:pandaStart?Math.hypot((panda.x-pandaStart.x)*sc.x,(panda.y-pandaStart.y)*sc.y):null,steps,maxStep,actualCss:actual,arrived,safetyErrors,
    finalFoot:{x:lead.x,y:lead.y},nativeSafetyDelta:Object.fromEntries(['terrain','bounds','occlusion','swept','speed'].map(k=>[k,qa.ageSafety[k]-safetyBefore[k]]))};
}
