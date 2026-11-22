'use strict';
const {replaceExact}=require('../home-finish-v5/native-hooks.cjs');
const {patchFastCareModel}=require('../home-mobility-v11/foot-care-fast.cjs');

// Compiled only in the 28-resident owner growth room. Each trial is armed by
// one real care transition. Nothing here runs in ordinary model updates.
// For a fixed lost ray, its owner must move unless the full terrain ray is
// legal and every blocking peer moves. This exact combinatorial lower bound
// is independent of the directions or distances the helpers might try.
function growthWitness(record) {
  const scale=scene.navigation.intentScale,obligations=[];
  for(const a of actors)for(const k of record.directions[a.key].lost){
    const [dx,dy]=bearings[k],q={x:a.x+dx/scale.x,y:a.y+dy/scale.y},box=bounds(a,scene);
    const inside=q.x>=box.left&&q.x<=box.right&&q.y>=box.top&&q.y<=box.bottom;
    const ground=inside&&scene.navigation.segmentSafe(a,q,scene.planVisibility?.(a)||(p=>visible(a,p)));
    const blockers=actors.filter(b=>a!==b&&!contactSegmentSafe(a,q,b,(a.w+b.w)*.5+10,(a.h+b.h)*.38+10)).map(b=>b.key);
    obligations.push({owner:a.key,k,ground,blockers});
  }
  let sets=[[]];
  for(const item of obligations){
    const next=new Map();
    for(const state of sets)for(const choice of [[item.owner],...(item.ground&&item.blockers.length?[item.blockers]:[])]){
      const group=[...new Set([...state,...choice])].sort();next.set(group.join('|'),group);
    }
    if(next.size>128){
      const keys=actors.map(a=>a.key),small=[];
      const covers=group=>obligations.every(o=>group.includes(o.owner)||(o.ground&&o.blockers.length&&o.blockers.every(k=>group.includes(k))));
      for(let i=0;i<keys.length;i++){
        if(covers([keys[i]]))small.push([keys[i]]);
        for(let j=i+1;j<keys.length;j++)if(covers([keys[i],keys[j]]))small.push([keys[i],keys[j]]);
      }
      return {obligations,minimum:small.length?Math.min(...small.map(s=>s.length)):3,exact:!!small.length,coveringSets:small};
    }
    sets=[...next.values()].filter(group=>![...next.values()].some(small=>small.length<group.length&&small.every(id=>group.includes(id))));
  }
  return {obligations,exact:true,minimum:sets[0]?Math.min(...sets.map(s=>s.length)):0,coveringSets:sets};
}
function searchGrowthCorrection(record,old,method){
  const scale=scene.navigation.intentScale;
  const pet=actors.find(a=>a.kind==='pet');
  const missing=actors.filter(a=>record.directions[a.key].lost.length);
  if(!missing.length||!pet)return null;
  if(method!=='minimal'&&globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches){
    record.search={proposals:0,full:0,limited:false,reducedMotion:true};return null;
  }
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
    !manualGoals.has(a.key)&&(method!=='walk'||a===pet)&&(method!=='helpers'||a!==pet&&canYield(a)));
  const dirs=method==='minimal'?[.25,.5,1,2]:[2,4,8,1,.5];
  let proposals=0,full=0;
  const witnesses=new Map();
  function nearby(person,mover,point){
    return Math.abs(person.x-point.x)<=16/scale.x+(person.w+mover.w)*.5+10+1e-6&&
      Math.abs(person.y-point.y)<=16/scale.y+(person.h+mover.h)*.38+10+1e-6;
  }
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
      if([...witnesses].some(([key,required])=>{
        const check=legalDirections(actor(key),required);return required.some((v,k)=>v&&!check[k]);
      }))continue;
      full++;
      const retained=actors.every(person=>{
        // A fixed resident's rays change only if the mover can contact at
        // least one point of its 16px search rectangle at either endpoint.
        if(person!==a&&!nearby(person,a,start)&&!nearby(person,a,to))return true;
        const required=before.people.get(person.key).directions,mask=legalDirections(person,required);
        const bad=required.map((valid,k)=>valid&&!mask[k]);
        if(bad.some(Boolean)){
          const previous=witnesses.get(person.key);
          witnesses.set(person.key,previous?bad.map((v,k)=>v||previous[k]):bad);
          return false;
        }
        return true;
      });
      if(!retained)continue;
      record.search={proposals,full,limited:false};
      return {method,key:a.key,from:start,to,distance,arrived:false,walked:0,frames:0};
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
    `  const policy=new URLSearchParams(location.search).get('growthPolicy')||'auto';
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
      a.target={...pending.to};a.route=[];a.source=pending.method==='helpers'?'yield':'ambient';
      if(pending.method==='helpers'){a.yieldFor=petKey();a.yieldAfter=clock+3;}
      a.intentRoute=true;activity(a,'walk');
    }
    const prior={x:a.x,y:a.y},scale=scene.navigation.intentScale;
    step(.016,{blocked:false,reducedMotion:globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches,autonomy:false});
    pending.walked+=Math.hypot((a.x-prior.x)*scale.x,(a.y-prior.y)*scale.y);pending.frames++;
    globalThis.paintV12Growth?.();
    pending.arrived=sameFoot(a,pending.to);
    pending.done=pending.arrived||!a.target||pending.frames>=96;
    if(!pending.done)setTimeout(advance,16);
    else {pending.reason=pending.arrived?'arrived':'native-step-stopped';finalResult=null;}
  }
  const petKey=()=>actors.find(p=>p.kind==='pet')?.key;
  globalThis.HomeV12Growth=Object.freeze({read:()=>({policy,travel:pending?{...pending}:null,
    complete:!pending||pending.done,steps:steps.map(s=>({...s}))}),directions:auditFinal});`);
  code=replaceExact(code,'    deadline=performance.now()+12000;',`    original=Object.fromEntries([...before.people].map(([k,r])=>[k,indices(r.directions)]));
    deadline=performance.now()+60000;`);
  code=replaceExact(code,'  function verify(old,oldScene,arrange) {',growthWitness.toString()+'\n'+searchGrowthCorrection.toString()+'\n  function verify(old,oldScene,arrange) {');
  code=replaceExact(code,'    record.eligible=true;',`    record.eligible=true;record.directions={};`);
  code=replaceExact(code,'      for (let i=0;i<currentMask.length;i++) {',`      const after=indices(currentMask);
      record.directions[a.key]={before:indices(previousMask),checkedAfter:after,lost:indices(previousMask.map((v,k)=>v&&!currentMask[k]))};
      for (let i=0;i<currentMask.length;i++) {`);
  code=replaceExact(code,'    record.validateMs=performance.now()-started;',`    if(record.lost)record.witness=growthWitness(record);
    if(policy==='legacy'){record.accepted=false;record.reason='legacy';}
    else if(record.lost&&steps.length===2&&['auto','minimal','walk','helpers'].includes(policy)){
      let correction=null;
      const choices=policy==='auto'?['walk','helpers','minimal']:[policy];
      record.attempts=[];
      for(const method of choices){
        correction=searchGrowthCorrection(record,old,method);
        record.attempts.push({method,...record.search,found:!!correction});
        if(correction)break;
      }
      if(correction){
        record.accepted=true;
        if(correction.method==='minimal'){
          Object.assign(actor(correction.key),correction.to);
          record.reason='local-foot-restores-directions';
        }else{
          pending=correction;record.reason=correction.method==='walk'?'resident-walk':'neighbour-yield';
          setTimeout(advance,0);
        }
        record.correction=correction;
      }
    }
    record.validateMs=performance.now()-started;`);
  return code;
}
module.exports={growthModel};
