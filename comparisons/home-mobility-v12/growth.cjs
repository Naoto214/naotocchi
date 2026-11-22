'use strict';
const {replaceExact}=require('../home-finish-v5/native-hooks.cjs');
const {patchFastCareModel}=require('../home-mobility-v11/foot-care-fast.cjs');

// Compiled only in the 28-resident owner growth room. Each trial is armed by
// one real care transition. Nothing here runs in ordinary model updates.
function searchGrowthCorrection(record,old){
  const scale=scene.navigation.intentScale;
  const pet=actors.find(a=>a.kind==='pet');
  const missing=actors.filter(a=>record.directions[a.key].lost.length);
  if(!missing.length||!pet)return null;
  // The witness for a lost ray is either its owner, terrain, or a peer whose
  // contact ellipse now cuts that ray. Moving any other resident cannot open it.
  const eligible=new Set();
  for(const a of missing){
    eligible.add(a);
    for(const k of record.directions[a.key].lost){
      const [dx,dy]=bearings[k],end={x:a.x+dx/scale.x,y:a.y+dy/scale.y};
      for(const b of actors)if(b!==a&&!contactSegmentSafe(a,end,b,(a.w+b.w)*.5+10,(a.h+b.h)*.38+10))eligible.add(b);
    }
  }
  const people=[...eligible].filter(a=>!a.target&&!old.find(p=>p.key===a.key)?.target&&
    !manualGoals.has(a.key)&&(policy!=='walk'||a===pet)&&(policy!=='helpers'||a!==pet&&canYield(a)));
  const dirs=policy==='minimal'?[.25,.5,1,2]:[.5,1,2,4,8];
  let proposals=0,full=0;
  const empty=new Map();
  for(const distance of dirs)for(const a of people)for(let i=0;i<12;i++){
    if(++proposals>480||full>=8){record.search={proposals:proposals-1,full,limited:true};return null;}
    const angle=i*Math.PI/6,start={x:a.x,y:a.y};
    const to={x:start.x+Math.cos(angle)*distance/scale.x,y:start.y+Math.sin(angle)*distance/scale.y};
    if(!yieldLeg(a,start,to,empty))continue;
    try{
      Object.assign(a,to);
      if(!missing.every(person=>{
        const lost=record.directions[person.key].lost,required=new Array(144).fill(false);
        for(const id of lost)required[id]=true;
        const check=legalDirections(person,required);
        return lost.every(id=>check[id]);
      }))continue;
      full++;
      const retained=actors.every(person=>{
        const required=before.people.get(person.key).directions,mask=legalDirections(person,required);
        return required.every((valid,k)=>!valid||mask[k]);
      });
      if(!retained)continue;
      record.search={proposals,full,limited:false};
      return {key:a.key,from:start,to,distance,arrived:false,walked:0,frames:0};
    }finally{Object.assign(a,start);}
  }
  record.search={proposals,full,limited:false};
  return null;
}
function growthModel(source){
  let code=patchFastCareModel(source);
  // The native planner caches fixed foreground polygons for one synchronous
  // batch, and falls back to pointwise visibility when occlusion can vary.
  code=replaceExact(code,'    const dx=16/scale.x,dy=16/scale.y;',`
    const canSee=scene.planVisibility?.(a)||(p=>visible(a,p));
    const dx=16/scale.x,dy=16/scale.y;`);
  code=replaceExact(code,'mask[k]=nav.segmentSafe(a,to,p=>visible(a,p));','mask[k]=nav.segmentSafe(a,to,canSee);');
  code=replaceExact(code,"  const enabled=new URLSearchParams(location.search).get('careGuard')==='1';",
    `  const policy=new URLSearchParams(location.search).get('growthPolicy')||'keep';
  const enabled=true;
  let pending=null,original=null,finalResult=null;
  const indices=mask=>mask.flatMap((on,k)=>on?[k]:[]);
  function auditFinal(){
    if(!original||finalResult)return finalResult;
    const out={};
    for(const a of actors){
      const prior=original[a.key],after=indices(legalDirections(a)),all=new Set(after);
      out[a.key]={before:prior,after,lost:prior.filter(k=>!all.has(k))};
    }
    finalResult=out;return out;
  }
  function advance(){
    if(!pending||pending.done)return;
    const a=actor(pending.key);
    if(!a){pending.done=true;return;}
    if(!pending.started){
      if(!sameFoot(a,pending.from)||a.target||!yieldLeg(a,a,pending.to,new Map())){pending.done=true;pending.reason='live-leg-closed';return;}
      pending.started=true;
      a.target={...pending.to};a.route=[];a.source=policy==='helpers'?'yield':'ambient';
      if(policy==='helpers'){a.yieldFor=petKey();a.yieldAfter=clock+3;}
      a.intentRoute=true;activity(a,'walk');
    }
    const prior={x:a.x,y:a.y},scale=scene.navigation.intentScale;
    step(.035,{blocked:false,reducedMotion:false,autonomy:false});
    pending.walked+=Math.hypot((a.x-prior.x)*scale.x,(a.y-prior.y)*scale.y);pending.frames++;
    globalThis.paintV12Growth?.();
    pending.arrived=sameFoot(a,pending.to);
    pending.done=pending.arrived||!a.target||pending.frames>=96;
    if(!pending.done)setTimeout(advance,35);
    else {pending.reason=pending.arrived?'arrived':'native-step-stopped';finalResult=null;}
  }
  const petKey=()=>actors.find(p=>p.kind==='pet')?.key;
  globalThis.HomeV12Growth=Object.freeze({read:()=>({policy,travel:pending?{...pending}:null,
    complete:!pending||pending.done,steps:steps.map(s=>({...s}))}),directions:auditFinal});`);
  code=replaceExact(code,'    deadline=performance.now()+12000;',`    original=Object.fromEntries([...before.people].map(([k,r])=>[k,indices(r.directions)]));
    deadline=performance.now()+60000;`);
  code=replaceExact(code,'  function verify(old,oldScene,arrange) {',searchGrowthCorrection.toString()+'\n  function verify(old,oldScene,arrange) {');
  code=replaceExact(code,'    record.eligible=true;',`    record.eligible=true;record.directions={};`);
  code=replaceExact(code,'      for (let i=0;i<currentMask.length;i++) {',`      const after=indices(currentMask);
      record.directions[a.key]={before:indices(previousMask),checkedAfter:after,lost:indices(previousMask.map((v,k)=>v&&!currentMask[k]))};
      for (let i=0;i<currentMask.length;i++) {`);
  code=replaceExact(code,'    record.validateMs=performance.now()-started;',`    if(policy==='legacy'){record.accepted=false;record.reason='legacy';}
    else if(record.lost&&steps.length===2&&['minimal','walk','helpers'].includes(policy)){
      const correction=searchGrowthCorrection(record,old);
      if(correction){
        record.accepted=true;
        if(policy==='minimal'){
          Object.assign(actor(correction.key),correction.to);
          record.reason='local-foot-restores-directions';
        }else{
          pending=correction;record.reason=policy==='walk'?'resident-walk':'neighbour-yield';
          setTimeout(advance,0);
        }
        record.correction=correction;
      }
    }
    record.validateMs=performance.now()-started;`);
  return code;
}
module.exports={growthModel};
