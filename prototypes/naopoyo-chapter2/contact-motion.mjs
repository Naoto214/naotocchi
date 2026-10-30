// Opt-in contact-v2 presentation. Ordered engine events, never final-position
// guesses, identify each merge participant. This module cannot mutate a board.
const cache=new WeakMap();
function build(frame){
 const tracks=new Map(),effects=[];let time=0;
 const add=(a,opacity=1)=>{const p={...a,opacity,time};tracks.set(a.id,{actor:a,points:[p],last:p});};
 const put=(id,change={},at=time)=>{const tr=tracks.get(id);if(!tr)return;const p={...tr.last,...change,time:at,arc:change.arc||0};tr.points.push(p);tr.last=p;};
 const travel=(targets,min=0,arc=0)=>{let duration=min;for(const [id,p]of targets){const a=tracks.get(id)?.last;if(a)duration=Math.max(duration,Math.hypot(p.x-a.x,p.y-a.y));}if(!duration)return;for(const [id]of targets)put(id);time+=duration;for(const [id,p]of targets)put(id,{...p,arc});};
 for(const a of frame.before.actors)add(a);
 const swap=frame.events.find(e=>e.type==='swap'),manualMerge=frame.events.find(e=>e.type==='merge'&&!e.fall);
 if(swap)travel([[swap.id,swap.to],[swap.otherId,swap.from]],1,.16);
 else if(!manualMerge){const a=tracks.get(frame.id)?.last;if(a)travel([[frame.id,{x:a.x+frame.dx,y:a.y+frame.dy}]],1);}
 for(const e of frame.events){
  if(e.type==='merge'){
   const c=e.contact;if(!c)throw Error('contact-v2 merge lacks participants');
   const point={x:e.x,y:e.y};
   travel([[c.incoming.id,point],[c.target.id,point]],.12);
   effects.push({type:'merge',x:e.x,y:e.y,start:time});
   // Hold the old numbers at actual contact; then resolve and separate.
   time+=.16;put(e.id,{level:e.level});
   if(e.overflow){put(c.remainderId,{level:e.overflow});travel([[c.remainderId,c.origin]],.8);}
   else for(const id of [c.incoming.id,c.target.id])if(id!==e.id)put(id,{opacity:0});
  }else if(e.type==='split'){
   travel([[e.id,{x:e.x,y:e.y}]],.12);effects.push({type:'split',x:e.x,y:e.y,start:time});
   const body=tracks.get(e.id)?.last;if(body)put(e.id,{level:body.level-e.count});
   for(const child of e.children||[]){add({...child,x:e.x,y:e.y},0);put(child.id,{opacity:1});}
   travel((e.children||[]).map(a=>[a.id,{x:a.x,y:a.y}]),.25);
  }else if(e.type==='fall')travel([[e.id,{x:e.x,y:e.to}]]);
  else if(e.type==='rescue'){travel([[e.id,{x:e.x,y:e.y}]],.12);effects.push({type:'rescue',x:e.x,y:e.y,start:time});put(e.id,{opacity:0});}
  else if(e.type==='phase')travel([[e.id,{x:e.x,y:e.y}]]);
 }
 // Final reconciliation is a continuity guard, not a new logical move.
 travel(frame.after.actors.map(a=>[a.id,{x:a.x,y:a.y}]),.12);
 const final=new Map(frame.after.actors.map(a=>[a.id,a]));
 for(const [id]of tracks)put(id,final.has(id)?{...final.get(id),opacity:1}:{opacity:0});
 return {tracks:[...tracks.values()],effects,end:time||1};
}
function timeline(frame){let result=cache.get(frame);if(!result){result=build(frame);cache.set(frame,result);}return result;}
export function contactVisualActors(frame,t){
 const {tracks,end}=timeline(frame),time=Math.max(0,Math.min(1,t))*end;
 return tracks.map(({actor,points})=>{
  let from=points[0],to=from;for(const p of points){if(p.time<=time){from=p;to=p;}else{to=p;break;}}
  const p=Math.max(0,Math.min(1,(time-from.time)/(to.time-from.time||1))),ease=p*p*(3-2*p),dx=to.x-from.x,dy=to.y-from.y,length=Math.hypot(dx,dy)||1,arc=Math.sin(Math.PI*p)*(to.arc||0);
  return {...actor,level:from.level,x:from.x+dx*ease-dy/length*arc,y:from.y+dy*ease+dx/length*arc,opacity:time<points[0].time?0:from.opacity,landing:0};
 });
}
export function contactEffects(frame,t){const {effects,end}=timeline(frame);return effects.map(e=>({...e,progress:(t*end-e.start)/Math.max(.3,end-e.start)})).filter(e=>e.progress>=0&&e.progress<=1);}
