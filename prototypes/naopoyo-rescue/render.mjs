import {matchesCondition} from './conditions.mjs';
import {drawTerrain} from './themes.mjs';
import { drawExit, drawGate, drawCondition } from './fixtures.mjs';
import {drawSprite} from './sprites.mjs';
// Display geometry only; input and all collision rules continue to use engine cells.
export const DRAG_SCALE=1.4;
export function actorVisual(a,s,scale=1){
 const w=.84*scale,h=.65*scale;
 return {x:Math.max(.025,Math.min(s.w-w-.025,a.x+.5-w/2)),
 y:Math.max(.025,Math.min(s.h-h-.025,a.y+.36-h/2)),w,h};
}
// Transient display only: active adjacent actor wins; otherwise a gate occupant.
// Idle neighbours do not compete. No timed reaction may override current conditions.
export function gateVisual(s,g,activeId){
 const active=s.actors.find(a=>a.id===activeId);
 const near=active&&Math.max(Math.abs(active.x-g.x),Math.abs(active.y-g.y))<=1;
 const occupant=s.actors.find(a=>a.x===g.x&&a.y===g.y);
 const subject=near?active:occupant;
 // A split child can already be inside a gate it could not newly enter.
 // Keep the passage clear for departure; entry permission still belongs to the active actor.
 const permitted=!!subject&&(subject===occupant||matchesCondition(subject,g));
 return {open:!!occupant||permitted,subjectId:subject?.id??null};
}
export function renderer(canvas){const c=canvas.getContext('2d'),positions=new Map(),gateStates=new Map();let lastState=null,lastRescued=0;const rescues=[];let reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
 function draw(s,selected,time,dragging=null,dragMode='A'){if(s!==lastState){positions.clear();gateStates.clear();rescues.length=0;lastRescued=s.rescued;lastState=s}const r=canvas.getBoundingClientRect(),d=Math.min(devicePixelRatio||1,2);if(canvas.width!==Math.round(r.width*d)||canvas.height!==Math.round(r.width*d*s.h/s.w)){canvas.width=Math.round(r.width*d);canvas.height=Math.round(r.width*d*s.h/s.w)}
 const size=canvas.width/s.w;c.setTransform(size,0,0,size,0,0);c.clearRect(0,0,s.w,s.h);
 drawTerrain(c,s);
 for(const e of s.exits)drawExit(c,e);
 for(const[x,y]of s.spikes){c.fillStyle='#ceaa78';for(let k=0;k<3;k++){c.beginPath();c.moveTo(x+.15+k*.23,y+.75);c.lineTo(x+.27+k*.23,y+.39);c.lineTo(x+.39+k*.23,y+.75);c.fill()}}
 for(const g of s.gates){
  const key=`${g.x},${g.y}`,v=gateVisual(s,g,dragging),previous=gateStates.get(key);
  const start=previous?.open===v.open?previous.start:time;
  // Opening is immediate, so a fast drag never sees closed bars over a valid actor.
  // Closing slides back over 140ms; visual state never grants engine permission.
  const from=previous?.amount??0;
  const amount=v.open?1:reduced?0:Math.max(0,from-(time-(previous?.time??time))/140);
  const flash=v.open&&!reduced?Math.max(0,1-(time-start)/220):0;
  gateStates.set(key,{open:v.open,start,time,amount});
  drawGate(c,{...g,open:v.open,flash},amount);

 }
 const ids=new Set(s.actors.map(a=>a.id));
 if(s.rescued>lastRescued&&!reduced)for(const e of s.exits)rescues.push({...e,start:time});
 lastRescued=s.rescued;
 for(const id of positions.keys())if(!ids.has(id))positions.delete(id);
 // Draw the dragged actor last so its silhouette stays visible over neighbours.
 for(const a of [...s.actors].sort((a,b)=>(a.id===dragging)-(b.id===dragging))){
 const active=a.id===dragging;
 const old=positions.get(a.id)||{x:a.x,y:a.y,level:a.level,born:time,scale:1,t:time};
 if(old.level!==a.level)old.born=time;old.level=a.level;
 old.x+=(a.x-old.x)*(active||reduced?1:.28);old.y+=(a.y-old.y)*(active||reduced?1:.28);
 const dt=Math.max(0,Math.min(50,time-old.t));old.t=time;
 const target=active?DRAG_SCALE:1;
 old.scale=reduced?target:old.scale+Math.sign(target-old.scale)*Math.min(Math.abs(target-old.scale),dt/120*(DRAG_SCALE-1));
 const pulse=reduced?0:Math.sin(Math.min(1,(time-old.born)/450)*Math.PI)*.06;
 const box=actorVisual(old,s,old.scale+pulse);
 if(active&&dragMode==='B')box.y=Math.max(.025,box.y-10/(r.width/s.w));
 positions.set(a.id,old);
 c.save();
 c.fillStyle='#172c3c30';c.beginPath();c.ellipse(old.x+.5,old.y+.67,.31,.065,0,0,Math.PI*2);c.fill();
 if(active){
  // The marker stays on the logical cell in both display modes.
  c.strokeStyle='#fff4bd';c.lineWidth=.035;c.beginPath();c.ellipse(old.x+.5,old.y+.67,.32,.07,0,0,Math.PI*2);c.stroke();
  // A bright perimeter remains locatable even when a finger covers the centre.
  c.strokeStyle='#fff4bd';c.lineWidth=.055;c.beginPath();
  c.roundRect(box.x-.015,box.y-.015,box.w+.03,box.h+.03,.16);c.stroke();
  c.strokeStyle='#987443';c.lineWidth=.018;c.stroke();
 }else if(selected===a.id){c.strokeStyle='#c79337';c.lineWidth=.025;c.beginPath();c.ellipse(old.x+.5,old.y+.66,.38,.07,0,0,Math.PI*2);c.stroke()}
 drawSprite(c,a.species,a.level,box);
 const onGate=s.gates.some(g=>g.x===a.x&&g.y===a.y);
 const nx=old.x+(onGate?.86:.5),ny=old.y+(onGate?.15:.85);
 c.fillStyle='#243d4a';c.strokeStyle='#fff5d9';c.lineWidth=.05;c.lineJoin='round';
 c.textAlign='center';c.textBaseline='middle';c.font=`bold ${onGate?.22:.28}px ui-monospace,monospace`;
 c.strokeText(String(a.level),nx,ny);c.fillText(String(a.level),nx,ny);c.restore();
 }
 // Labels always remain above expanded art, never hidden behind its silhouette.
 for(const fixture of [...s.exits,...s.gates])drawCondition(c,fixture);

 for(let i=rescues.length-1;i>=0;i--){
  const e=rescues[i],t=(time-e.start)/360;if(t>=1){rescues.splice(i,1);continue}
  c.save();c.globalAlpha=1-t;c.strokeStyle='#dfb851';c.lineWidth=.035;
  c.beginPath();c.arc(e.x+.5,e.y+.36,.12+t*.32,0,Math.PI*2);c.stroke();c.restore();
 }
 }
 return draw;
}


