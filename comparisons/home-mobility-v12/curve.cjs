'use strict';
const {replaceExact}=require('../home-finish-v5/native-hooks.cjs');

// Runs after both native straight-help searches. Planning operates on copied
// feet; only beginPairStage and the original integrator may move a resident.
function* curvedHandoff(a,goal,goals,ambient) {
  const nav=scene.navigation,s=nav?.intentScale,source=ambient?'ambient':'drag';
  if(!s||!goals?.length)return null;
  const start={x:a.x,y:a.y};
  const cast=actors.map(b=>({key:b.key,x:b.x,y:b.y,w:b.w,h:b.h,box:bounds(b,scene),live:b}));
  const owner=cast.find(b=>b.key===a.key);
  const known=new Map(cast.map(b=>[b.key,b]));
  const eligible=b=>b.key!==a.key && canHelpAmbient(b.live) &&
    !(waiting.get(b.key)?.expires>clock) && !manualGoals.has(b.key) && !crowdMisses.has(b.key) &&
    !(b.live.source==='yield' && clock-b.live.lastWalk<24);
  const dist=(p,q)=>Math.hypot((p.x-q.x)*s.x,(p.y-q.y)*s.y);
  const point=(p,d,r)=>({x:p.x+r*d[0]/s.x,y:p.y+r*d[1]/s.y});
  const inside=(b,p)=>p.x>=b.box.left&&p.x<=b.box.right&&p.y>=b.box.top&&p.y<=b.box.bottom;
  const trig=Array.from({length:48},(_,i)=>[Math.cos(i*Math.PI/24),Math.sin(i*Math.PI/24)]);
  const legs=(b,from,to)=>({b,from,to});
  const ground=(b,from,to)=>nav.segmentSafe(from,to,b.ink??=scene.planVisibility?.(b.live)||(q=>visible(b.live,q)));
  const stats={probes:0,ground:0,goals:0,protected:0};
  const protectedBy={};
  const maxProbes=7680;
  const contact=(leg,other,pos=other)=>contactSegmentSafe(leg.from,leg.to,pos,(leg.b.w+other.w)*.5+10,(leg.b.h+other.h)*.38+10);
  function hits(segments,b,exceptions,oneAllowed) {
    const found=[];
    for(const other of nearBy.get(b)){
      if(exceptions?.has(other.key))continue;
      if(!segments.some(l=>!walkLeg(b,l.from,l.to,other,other)))continue;
      if(!oneAllowed||found.length||!eligible(other))return null;
      found.push(other);
    }
    return found;
  }
  const nearBy=new Map();
  for(const b of cast){
    nearBy.set(b,cast.filter(peer=>peer!==b && Math.abs(peer.x-b.x)<=(b.w+peer.w)*.5+10+32/s.x &&
                                                 Math.abs(peer.y-b.y)<=(b.h+peer.h)*.38+10+32/s.y));
  }
  const foot=b=>({x:b.x,y:b.y});
  function* routes(b,clear,allowOne){
    const pivots=[null];
    // A short first step can leave the tangent of an existing contact.
    for(const r of [1])for(let i=0;i<48;i+=3){
      const mid=point(b,trig[i],r);
      if(!inside(b,mid))continue;
      const leg=legs(b,b,mid),blocked=hits([leg],b,null,allowOne);
      if(blocked){stats.ground++;if(ground(b,b,mid))pivots.push({mid,leg,blocked});}
    }
    // Walk from the bend along the next heading. These endpoints differ from
    // projecting one ray from the original foot, especially at a tangency.
    for(const r of [6,12,3,16,24])for(let heading=0;heading<trig.length;heading++){
      const d=trig[(heading*13)%trig.length];
      for(const pivot of pivots){
        if(stats.probes>=maxProbes)return;
        if(++stats.probes%96===0)yield null;
        const from=pivot?.mid||b,to=point(from,d,r);
        if(!inside(b,to)||!clear.every(l=>contact(l,b,to)))continue;
        const second=legs(b,from,to),ls=pivot?[pivot.leg,second]:[second];
        const blocked=hits(ls,b,null,allowOne);
        if(!blocked)continue;
        stats.ground++;
        if(!ground(b,from,to))continue;
        yield {key:b.key,from:foot(b),to,...(pivot?{via:pivot.mid}:{}),blocked,legs:ls};
      }
    }
  }
  const rays=Array.from({length:96},(_,i)=>[Math.cos(i*Math.PI/48),Math.sin(i*Math.PI/48)]);
  const opening=new Map();
  function walkLeg(b,from,to,other,pos){
    const leg=legs(b,from,to);
    if(!contact(leg,other,pos))return false;
    const rx=(b.w+other.w)*.5+10,ry=(b.h+other.h)*.38+10;
    const before=Math.hypot((from.x-pos.x)/rx,(from.y-pos.y)/ry);
    if(before>=1)return true;
    const dt=Math.min(1,.35/Math.hypot(to.x-from.x,to.y-from.y));
    const near=Math.hypot((from.x+(to.x-from.x)*dt-pos.x)/rx,(from.y+(to.y-from.y)*dt-pos.y)/ry);
    return near>=1 || near>before+1e-6;
  }
  function* hasExit(b,at,first=-1){
    const from=at.get(b.key)||b;
    const others=cast.filter(peer=>{
      const pos=at.get(peer.key)||peer;
      return peer!==b && Math.abs(pos.x-from.x)<=(b.w+peer.w)*.5+10+8/s.x &&
        Math.abs(pos.y-from.y)<=(b.h+peer.h)*.38+10+8/s.y;
    });
    for(let i=first<0?0:-1;i<rays.length;i++){
      if(i!==-1&&i===first)continue;
      if(stats.probes>=maxProbes)return null;
      if(++stats.probes%96===0)yield;
      const n=i<0?first:i,to=point(from,rays[n],8);
      if(!inside(b,to)||!others.every(peer=>walkLeg(b,from,to,peer,at.get(peer.key)||peer)))continue;
      stats.ground++;
      if(ground(b,from,to))return n;
    }
    return -1;
  }
  function* preserves(stages,q){
    const at=new Map(),empty=new Map();
    for(const {key,from,to,via} of [...stages,{key:a.key,from:start,to:q}]){
      const moved=known.get(key);let previous=from;
      for(const next of via?[via,to]:[to]){
        at.set(key,next);
        for(const b of cast){
          if(b===owner)continue;
          const foot=at.get(b.key)||b;
          const near=p=>Math.abs(p.x-foot.x)<=(b.w+moved.w)*.5+10+8/s.x &&
                          Math.abs(p.y-foot.y)<=(b.h+moved.h)*.38+10+8/s.y;
          if(b!==moved&&!near(previous)&&!near(next))continue;
          if(b!==moved && b.live.target && !contact(legs(b,b,b.live.target),moved,next))return false;
          if(!opening.has(b))opening.set(b,yield* hasExit(b,empty));
          const old=opening.get(b);if(old===null)return false;
          if(old<0)continue;
          const current=yield* hasExit(b,at,old);
          if(current===null)return false;
          if(current<0){stats.protected++;protectedBy[b.key]=(protectedBy[b.key]||0)+1;return false;}
        }
        previous=next;
      }
    }
    return true;
  }
  function* complete(q,stages){
    if(!stages.some(t=>t.via)||!(yield* preserves(stages,q)))return null;
    // Occupancy used by the opportunity proof must still match on commitment.
    // Include every footprint near a planned endpoint or its 8px neighbors.
    const moving=[...stages.map(t=>known.get(t.key)),owner];
    const watched=cast.filter(b=>moving.some(m=>Math.abs(m.x-b.x)<=(m.w+b.w)*.5+10+72/s.x &&
                                                Math.abs(m.y-b.y)<=(m.h+b.h)*.38+10+72/s.y));
    return {origin:start,q,curved:true,feet:watched.map(b=>[b.key,b.x,b.y,b.w,b.h]),stages:stages.map(({key,from,to,via})=>({key,from,to,...(via?{via}:{})}))};
  }
  // Keep angularly distinct native destinations; do not make a new goal.
  const options=[];
  for(const o of goals){
    const q=o.p||o.q,blocks=o.blocked.map(b=>known.get(b.key));
    if(!blocks.length||blocks.length>2||blocks.some(b=>!b||!eligible(b)))continue;
    if(options.some(p=>p.blocks.length===blocks.length && p.blocks.every(k=>blocks.includes(k)) && dist(p.q,q)<6))continue;
    options.push({q,blocks});
    if(options.length===6)break;
  }
  if(!options.length)return null;
  globalThis.HomeV12CurveEvent?.('search',{owner:a.key,goal,clock,source});
  const freeByHelper=new Map();
  function* freeMoves(first,o){
    let phases=freeByHelper.get(first);
    if(!phases){phases=new Map();freeByHelper.set(first,phases);}
    if(phases.has(o.to))return phases.get(o.to);
    const list=[],seen=new Set();
    for(const m of routes(first,[o],false)){
      if(!m){yield;continue;}
      const tag=Math.round(m.to.x*s.x*2)+'/'+Math.round(m.to.y*s.y*2);
      if(!seen.has(tag)){list.push(m);seen.add(tag);}
    }
    phases.set(o.to,list);return list;
  }
  let answer=null;
  outer:for(const count of [1,2])for(const {q,blocks} of options){
    if(count<blocks.length)continue;
    stats.goals++;
    const ownerLeg=legs(owner,owner,q);
    for(const last of blocks){
      const required=blocks.find(b=>b!==last);
      for(const candidate of routes(last,[ownerLeg],count===2)){
        if(!candidate){yield;continue;}
        const first=required||candidate.blocked[0];
        if(!first && count===1){
          answer=yield* complete(q,[candidate]);
        }else if(first && count===2 && candidate.blocked.every(b=>b===first)){
          for(const help of yield* freeMoves(first,ownerLeg)){
            if(++stats.probes%96===0)yield;
            if(stats.probes>=maxProbes)break outer;
            if(!candidate.legs.every(l=>contact(l,first,help.to)))continue;
            answer=yield* complete(q,[help,candidate]);
            if(answer)break;
          }
        }
        if(answer)break outer;
        if(stats.probes>=maxProbes)break outer;
      }
    }
  }
  globalThis.HomeV12CurveEvent?.('plan',{owner:a.key,clock,source,goal,found:!!answer,q:answer?.q,stages:answer?.stages,protectedBy,...stats});
  return answer;
}

function currentCurveFeet(pair,stage){
  const done=new Map(pair.stages.slice(0,stage).map(t=>[t.key,t.to]));
  return pair.feet.every(([key,x,y,w,h])=>{
    const b=actor(key);
    return !!b&&b.w===w&&b.h===h&&sameFoot(b,done.get(key)||{x,y});
  });
}
function patchCurve(source){
  let s=replaceExact(source,'function* intentPlan(a, goal) {',curvedHandoff.toString()+'\nfunction* intentPlan(a, goal) {');
  s=replaceExact(s,'  return null;\n}\nfunction rememberBlocked(a, p) {','  return yield* curvedHandoff(a,goal,goals,true);\n}\nfunction rememberBlocked(a, p) {');
  s=replaceExact(s,'      return null;\n    }\n    function sameFoot','      return yield* curvedHandoff(a,goal,goals,ambient);\n    }\n    function sameFoot');
  s=replaceExact(s,"if(!b||!sameFoot(b,leg.from)||!(request.owner?canHelpAmbient(b):canYield(b))||!yieldLeg(b,b,leg.to,predicted))return false;",`if(!b||!sameFoot(b,leg.from)||!(request.owner?canHelpAmbient(b):canYield(b)))return false;
        if(pair.curved && (!canHelpAmbient(b) || waiting.get(b.key)?.expires>clock || manualGoals.has(b.key) || crowdMisses.has(b.key) || (b.source==='yield' && clock-b.lastWalk<24)))return false;
        if(leg.via && !yieldLeg(b,b,leg.via,predicted))return false;
        if(!yieldLeg(b,leg.via||b,leg.to,predicted))return false;`);
  s=replaceExact(s,'    function beginPairStage(a,request,pair,stage){',currentCurveFeet.toString()+
    '\n    const curveReceipts=new WeakMap();\n    function beginPairStage(a,request,pair,stage){\n      if(pair.curved && !currentCurveFeet(pair,stage))return false;');
  const begin="b.route=[];b.target=leg.to;b.source='yield';b.yieldFor=a.key;b.yieldAfter=clock+3;";
  s=replaceExact(s,begin,`b.route=leg.via?[leg.to]:[];b.target=leg.via||leg.to;b.source='yield';b.yieldFor=a.key;b.yieldAfter=clock+3;
      if(pair.curved&&!request.owner&&globalThis.HomeV12CurveEvent)curveReceipts.set(request,pair);
      if(pair.curved)globalThis.HomeV12CurveEvent?.('start',{owner:a.key,source:request.owner?'ambient':'drag',clock,helper:b.key,stage,goal:request.point,q:pair.q,stages:pair.stages});`);
  const clear='  const b=actor(relief.yieldPeer);';
  s=replaceExact(s,clear,`  if(relief.pair?.curved)globalThis.HomeV12CurveEvent?.('stop',{owner:relief.owner,clock,source:'ambient',goal:relief.point,q:relief.pair.q,stage:relief.stage,helpers:relief.pair.stages.map(t=>t.key),accepted:!!relief.curveAccepted});
`+clear);
  s=replaceExact(s,"    if(actors.filter(b=>b.target&&b.source==='ambient').length>=2)return;\n    r.ready=true;", "    if(r.pair.curved&&!currentCurveFeet(r.pair,r.stage)){clearRelief();return;}\n    if(actors.filter(b=>b.target&&b.source==='ambient').length>=2)return;\n    r.ready=true;");
  const finish="r.ready=true;move(a.key,r.point,'ambient');clearRelief();return;";
  s=replaceExact(s,finish,`r.ready=true;const accepted=move(a.key,r.point,'ambient');
    if(r.pair.curved)r.curveAccepted=accepted;
    if(r.pair.curved)globalThis.HomeV12CurveEvent?.('owner',{owner:a.key,clock,source:'ambient',goal:r.point,q:r.pair.q,accepted});
    clearRelief();return;`);
  s=replaceExact(s,'if(beginPairStage(a,request,pair,1))continue;\n            request.handoff=null;',
    'if(pair.stages.length>1){if(beginPairStage(a,request,pair,1))continue;request.handoff=null;}');
  const retry="try{move(key,request.point,request.source,{pointerDrop:request.pointerDrop});}finally{retryingKey=null;}";
  s=replaceExact(s,retry,`try{
            const accepted=move(key,request.point,request.source,{pointerDrop:request.pointerDrop});
            const pair=curveReceipts.get(request);
            if(pair){globalThis.HomeV12CurveEvent?.('owner',{owner:key,clock,source:'drag',goal:request.point,q:pair.q,accepted});curveReceipts.delete(request);}
          }finally{retryingKey=null;}`);
  return s;
}
module.exports={patchCurve};
