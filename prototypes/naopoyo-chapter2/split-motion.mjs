// Presentation-only replay of the engine's ordered contact events. In particular,
// repeated contacts at one cell must wait for their donors, not share a timestamp.
// The settled logical board is never changed by this timeline.
const timelines=new WeakMap();
function timeline(frame){
 const tracks=new Map();let time=0;
 const add=(a,opacity=1)=>{const point={...a,time,opacity};tracks.set(a.id,{actor:a,points:[point],last:point});};
 const put=(id,change,at=time)=>{const track=tracks.get(id);if(!track)return;const point={...track.last,...change,time:at};track.points.push(point);track.last=point;};
 for(const a of frame.before.actors)add(a);
 const swap=frame.events.find(e=>e.type==='swap');
 const active=tracks.get(frame.id)?.last;
 time=1;
 if(swap){put(swap.id,swap.to);put(swap.otherId,swap.from);}
 else if(active)put(frame.id,{x:active.x+frame.dx,y:active.y+frame.dy});
 const contact=(destinations,minDuration=0)=>{
  const start=time;let duration=minDuration;
  for(const [id,p] of destinations){const a=tracks.get(id)?.last;if(a)duration=Math.max(duration,Math.hypot(a.x-p.x,a.y-p.y));}
  if(!duration)return;
  for(const [id] of destinations)put(id,{},start);
  time+=duration;for(const [id,p] of destinations)put(id,p);
 };
 for(const e of frame.events){
  if(e.type==='merge'){
   const body=tracks.get(e.id)?.last;if(!body)continue;
   const donors=(e.absorbed||[]).map(a=>a.id),destinations=[[e.id,{x:e.x,y:e.y}],...donors.map(id=>[id,{x:e.x,y:e.y}])];
   // Overflow retains both existing IDs. The event records the new body and
   // remainder amount; locate its other participant in the preceding positions.
   let remainder;
   if(e.overflow){
    remainder=[...tracks.values()].find(v=>v.actor.id!==e.id&&v.last.opacity>0&&v.last.x===e.x&&v.last.y===e.y);
    if(e.fall&&body.x===e.x&&body.y===e.y)remainder=[...tracks.values()].find(v=>v.actor.id!==e.id&&v.last.opacity>0&&v.last.x===e.x&&v.last.y===e.y-1);
    const origin=e.fall?(body.x===e.x&&body.y===e.y?remainder?.last:body):frame.before.actors.find(a=>a.id===frame.id);
    if(remainder&&origin)destinations.push([remainder.actor.id,{x:origin.x,y:origin.y}]);
   }
   contact(destinations,.12);put(e.id,{level:e.level});
   for(const id of donors)put(id,{opacity:0});
   if(remainder)put(remainder.actor.id,{level:e.overflow});
  }else if(e.type==='split'){
   contact([[e.id,{x:e.x,y:e.y}]],.12);
   const body=tracks.get(e.id)?.last;if(body)put(e.id,{level:body.level-e.count});
   for(const child of e.children||[]){add(child,0);put(child.id,{opacity:1},time+.12);}
   time+=.12;
  }else if(e.type==='fall'){
   // A fall is logged after its arrival effects. A preceding merge/split has
   // already brought the relevant actors to this contact; do not replay it.
   contact([[e.id,{x:e.x,y:e.to}]]);
  }else if(e.type==='rescue'){
   contact([[e.id,{x:e.x,y:e.y}]],.12);put(e.id,{opacity:0});
  }else if(e.type==='phase')contact([[e.id,{x:e.x,y:e.y}]]);
 }
 // Exact settled endpoints, including any overflow not separately logged.
 const final=new Map(frame.after.actors.map(a=>[a.id,a]));
 contact(frame.after.actors.map(a=>[a.id,{x:a.x,y:a.y}]),.12);
 for(const [id,track] of tracks)put(id,final.has(id)?{...final.get(id),opacity:1}:{opacity:0});
 const end=time;
 for(const track of tracks.values())for(const p of track.points)p.t=p.time<=1?p.time*.24:.24+(p.time-1)/(end-1)*.76;
 return [...tracks.values()];
}
export function splitVisualActors(frame,t){
 let tracks=timelines.get(frame);if(!tracks){tracks=timeline(frame);timelines.set(frame,tracks);}
 return tracks.map(({actor,points})=>{
  let from=points[0],to=from;
  for(const p of points){if(p.t<=t){from=p;to=p;}else{to=p;break;}}
  const p=Math.max(0,Math.min(1,(t-from.t)/(to.t-from.t||1))),ease=p*p*(3-2*p);
  // Birth/death and number changes occur at the contact keyframe. Position
  // interpolates; integer levels never jump ahead to a future merge.
  const opacity=t<points[0].t?0:to.opacity>from.opacity?from.opacity+(to.opacity-from.opacity)*p:from.opacity;
  return {...actor,level:from.level,x:from.x+(to.x-from.x)*ease,y:from.y+(to.y-from.y)*ease,opacity,landing:0};
 });
}
