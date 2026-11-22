'use strict';

// A single proposed new-household seat from the new painted bay. Re-test the
// complete current roster and camera; a different household can decline it.
function tryBaySeat(actors,nav,boxFor,inkFor,clearance,contactSafe,keepLane) {
  const result={changed:false,width:nav.v13Width};
  if(nav.v13Width!==375)return {...result,reason:'no-certified-proposal'};
  const actor=actors.find(a=>a.key==='companion:clock');
  if(!actor)return {...result,reason:'absent'};
  const point=nav.visibleGround.point;
  const origin=point({x:0,y:0}),basis=point({x:1,y:1});
  const to={x:(.6849696969696968-origin.x)/(basis.x-origin.x),y:(.5883030303030299-origin.z)/(basis.z-origin.z)};
  const scale=nav.intentScale;
  const distance=Math.hypot((to.x-actor.x)*scale.x,(to.y-actor.y)*scale.y);
  const inside=(p,b)=>p.x>=b.left&&p.x<=b.right&&p.y>=b.top&&p.y<=b.bottom;
  if(distance>30||!inside(to,boxFor(actor))||!nav.valid(to)||nav.v13Opening.valid(to)||
     !inkFor(actor)(to)||!keepLane({...actor,...to}))return {...result,reason:'geometry-or-lane'};
  const moved={...actor,...to};
  for(const b of actors)if(b!==actor&&clearance(moved,moved,b)+1e-9<Math.min(1,clearance(actor,actor,b))){
    return {...result,reason:'would-worsen-contact',key:b.key};
  }

  const directions=Array.from({length:96},(_,i)=>({
    x:Math.cos(i*Math.PI/48)/scale.x,y:Math.sin(i*Math.PI/48)/scale.y
  }));
  const opened=[];
  let tested=0;
  for(const before of actors){
    const after=before===actor?moved:before,box=boxFor(before),ink=inkFor(before);
    const others=actors.filter(b=>b!==before),peers=others.map(b=>b===actor?moved:b);
    function possible(a,others,delta,d){
      const dx=delta.x*d,dy=delta.y*d;
      const target={x:a.x+dx,y:a.y+dy};
      if(!inside(target,box)||!nav.segmentSafe(a,target,ink))return false;
      const first=Math.min(1,.35/Math.hypot(dx,dy)),step={x:a.x+dx*first,y:a.y+dy*first};
      for(const b of others){
        const rx=(a.w+b.w)*.5+10,ry=(a.h+b.h)*.38+10;
        if(Math.abs(b.x-a.x)>rx+Math.abs(dx)||Math.abs(b.y-a.y)>ry+Math.abs(dy))continue;
        if(!contactSafe(a,target,b,rx,ry))return false;
        const old=clearance(a,a,b),next=clearance(a,step,b);
        if(old<1&&next<1&&next<=old+1e-6)return false;
      }
      return true;
    }
    let old8=false,new8=false;
    // The old and new location of the one changed peer cannot reach these
    // segments. Every other predicate, seat, and ray origin is identical.
    const near=candidate=>Math.abs(candidate.x-before.x)<=(candidate.w+before.w)/2+10+16/scale.x&&
      Math.abs(candidate.y-before.y)<=(candidate.h+before.h)*.38+10+16/scale.y;
    if(before!==actor&&!near(actor)&&!near(moved))continue;
    for(const d of [3,8,16])for(const delta of directions){
      const old=possible(before,others,delta,d);
      if(!old&&(d!==8||new8))continue;
      const next=possible(after,peers,delta,d);
      tested++;
      if(old&&!next)return {...result,reason:'would-remove-direction',key:before.key,d};
      if(d===8){old8||=old;new8||=next;}
    }
    if(!old8&&new8)opened.push(before.key);
  }
  if(!opened.length)return {...result,reason:'no-new-walker'};
  const from={x:actor.x,y:actor.y};
  Object.assign(actor,to);
  return {...result,changed:true,key:actor.key,from,to,distance,opened,tested};
}
module.exports={tryBaySeat};
