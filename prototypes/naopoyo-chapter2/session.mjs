import {WorldSession} from '../naopoyo-world/session.mjs';
import {clone,settle,move} from '../naopoyo-v2/engine.mjs';
import {enteredCells} from '../naopoyo-v2/input.mjs';
// Shared v2 remains authoritative; presentation never changes a saved board.
export class ForestSession extends WorldSession {
 reset(){super.reset();settle(this.state);this.motion=[];}
 apply(snapshot){super.apply(snapshot);this.motion=[];}
 advance(ms){if(!this.paused)this.time+=ms;}
 travel(p){
  this.lastResults=[];
  if(!this.active||this.paused||![p?.x,p?.y].every(Number.isFinite))return [];
  const d=this.active;
  for(const [x,y] of enteredCells(d.last,p)){
   d.intent={x,y};const dx=x-d.cursor.x,dy=y-d.cursor.y;
   if(!dx&&!dy)continue;
   const before=clone(this.state),result=move(this.state,d.id,dx,dy,this.policy());
   this.lastResults.push(result);
   if(result.ok){
    d.cursor={x,y};this.rebase();
    const swap=result.events.some(e=>e.type==='swap'),fall=result.events.some(e=>e.type==='fall');
    this.motion.push({before,after:clone(this.state),events:result.events,id:d.id,dx,dy,elapsed:0,duration:swap?(fall?420:180):(fall?340:110)});
   }
  }
  d.last={...p};return this.lastResults;
 }
 animate(ms,reduced=false){
  if(reduced){this.motion=[];return;}
  let remaining=ms*Math.max(1,this.motion.length/3);
  while(this.motion.length&&remaining>0){const f=this.motion[0],used=Math.min(remaining,f.duration-f.elapsed);f.elapsed+=used;remaining-=used;if(f.elapsed>=f.duration)this.motion.shift();}
 }
}
// Regrabbing an animation selects the visible surviving actor, then fast-forwards
// presentation only. Relative drag-B input continues from its logical position.
export function pointerActor(q,p){
 const alive=new Set(q.state.actors.map(a=>a.id));
 const candidates=visualActors(q).filter(a=>alive.has(a.id)&&Math.abs(a.x+.5-p.x)<=.5&&Math.abs(a.y+.5-p.y)<=.5);
 candidates.sort((a,b)=>Math.hypot(a.x+.5-p.x,a.y+.5-p.y)-Math.hypot(b.x+.5-p.x,b.y+.5-p.y));
 return candidates[0]||q.state.actors.find(a=>a.x===Math.floor(p.x)&&a.y===Math.floor(p.y));
}
export function visualActors(q){
 const f=q.motion[0];if(!f)return q.state.actors.map(a=>({...a,opacity:1,landing:0}));
 const t=Math.min(1,f.elapsed/f.duration),hasFall=f.events.some(e=>e.type==='fall'),swap=f.events.find(e=>e.type==='swap'),manualEnd=hasFall?(swap?180/f.duration:.28):1;
 const births=f.events.flatMap(e=>e.children||[]);
 const ids=new Set([...f.before.actors,...f.after.actors,...births].map(a=>a.id));
 return [...ids].map(id=>{
  const old=f.before.actors.find(a=>a.id===id),now=f.after.actors.find(a=>a.id===id);
  if(!old){
   const born=births.find(a=>a.id===id);
   if(!born)return {...now,opacity:Math.min(1,t*3),landing:0};
   const absorption=f.events.find(e=>e.absorbed?.some(a=>a.id===id));
   const rescued=f.events.find(e=>e.type==='rescue'&&e.id===id);
   const target=now||absorption||rescued||born;
   const p=Math.max(0,(t-manualEnd)/(1-manualEnd||1)),ease=p*p*(3-2*p);
   return {...(now||born),x:born.x+(target.x-born.x)*ease,y:born.y+(target.y-born.y)*ease,opacity:Math.min(1,t*3)*(now?1:1-p),landing:0};
  }
  let start={x:old.x,y:old.y};const exchangeTo=swap&&(id===swap.id?swap.to:id===swap.otherId?swap.from:null);
  const manual=exchangeTo||(id===f.id?{x:old.x+f.dx,y:old.y+f.dy}:(!f.events.some(e=>e.type==='fall'&&e.id===id)&&now?{x:now.x,y:now.y}:start));
  const falls=f.events.filter(e=>e.type==='fall'&&e.id===id);
  const target=now||f.events.find(e=>e.id===id&&(e.type==='rescue'||e.type==='merge'))||manual;
  let x,y;
  if(t<manualEnd){const p=t/manualEnd;x=start.x+(manual.x-start.x)*p;y=start.y+(manual.y-start.y)*p;
   if(exchangeTo){const vx=manual.x-start.x,vy=manual.y-start.y,length=Math.hypot(vx,vy),arc=Math.sin(Math.PI*p)*.16;x-=vy/length*arc;y+=vx/length*arc;}
  }
  else {const p=(t-manualEnd)/(1-manualEnd||1),ease=p*p*(3-2*p);x=manual.x+(target.x-manual.x)*ease;y=manual.y+(target.y-manual.y)*ease;}
  return {...(t>.85&&now?now:old),x,y,opacity:now?1:Math.max(0,1-t),landing:falls.length&&t>.8?Math.sin((t-.8)*Math.PI/ .2):0};
 });
}
