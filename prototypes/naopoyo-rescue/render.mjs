import {gatePassages} from './engine.mjs';
import {drawTerrain} from './themes.mjs';
import { drawExit, drawGate, drawCondition } from './fixtures.mjs';
import {drawSprite} from './sprites.mjs';
export function renderer(canvas){const c=canvas.getContext('2d'),positions=new Map(),gateStates=new Map();let lastState=null,lastRescued=0;const rescues=[];let reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
 function draw(s,selected,time){if(s!==lastState){positions.clear();gateStates.clear();rescues.length=0;lastRescued=s.rescued;lastState=s}const r=canvas.getBoundingClientRect(),d=Math.min(devicePixelRatio||1,2);if(canvas.width!==Math.round(r.width*d)||canvas.height!==Math.round(r.width*d*s.h/s.w)){canvas.width=Math.round(r.width*d);canvas.height=Math.round(r.width*d*s.h/s.w)}
 const size=canvas.width/s.w;c.setTransform(size,0,0,size,0,0);c.clearRect(0,0,s.w,s.h);
 drawTerrain(c,s);
 for(const e of s.exits)drawExit(c,e);
 for(const[x,y]of s.spikes){c.fillStyle='#ceaa78';for(let k=0;k<3;k++){c.beginPath();c.moveTo(x+.15+k*.23,y+.75);c.lineTo(x+.27+k*.23,y+.39);c.lineTo(x+.39+k*.23,y+.75);c.fill()}}
 for(const g of s.gates){
 const key=`${g.x},${g.y}`,previous=gateStates.get(key);
 const occupant=s.actors.find(a=>a.x===g.x&&a.y===g.y);
 const count=gatePassages(s).get(key)||0;
 const arriving=count>(previous?.count||0);
 const openedAt=arriving?time:previous?.openedAt??-Infinity;
 gateStates.set(key,{count,openedAt});
 const elapsed=time-openedAt,opening=reduced?(occupant?1:0):Math.max(0,Math.min(1,elapsed/100,(440-elapsed)/140));
 drawGate(c,{...g,open:!!occupant||opening>0},occupant?1:opening,!!occupant);
 }
 const ids=new Set(s.actors.map(a=>a.id));
 if(s.rescued>lastRescued&&!reduced)for(const e of s.exits)rescues.push({...e,start:time});
 lastRescued=s.rescued;
 for(const id of positions.keys())if(!ids.has(id))positions.delete(id);
 for(const a of s.actors){const old=positions.get(a.id)||{x:a.x,y:a.y,level:a.level,born:time};const changed=old.level!==a.level;if(changed)old.born=time;old.level=a.level;old.x+=(a.x-old.x)*(reduced?1:.28);old.y+=(a.y-old.y)*(reduced?1:.28);positions.set(a.id,old);
 const pulse=reduced?0:Math.sin(Math.min(1,(time-old.born)/450)*Math.PI)*.08;
 const onGate=s.gates.some(g=>g.x===a.x&&g.y===a.y);
 c.save();c.translate(old.x,old.y);
 c.fillStyle='#41615d22';c.beginPath();c.ellipse(.5,.64,.31,.065,0,0,Math.PI*2);c.fill();
 if(selected===a.id){c.strokeStyle='#c79337';c.lineWidth=.035;c.beginPath();c.ellipse(.5,.62,.41,.10,0,0,Math.PI*2);c.stroke()}
 c.save();c.translate(.5,.38);c.scale(1+pulse,1-pulse);c.translate(-.5,-.38);
 drawSprite(c,a.species,a.level,onGate?{x:.30,y:.16,w:.64,h:.51}:{x:.08,y:.035,w:.84,h:.65});c.restore();
 if(!onGate){c.fillStyle='#fffdf1';c.beginPath();c.roundRect(.30,.71,.40,.25,.055);c.fill();c.fillStyle='#294e5e';c.textAlign='center';c.textBaseline='middle';c.font='bold .28px ui-monospace,monospace';c.fillText(String(a.level),.5,.84)}
 c.restore();
 }
 for(const fixture of [...s.exits,...s.gates])drawCondition(c,fixture);
 // Keep the occupant's own level readable above the door's condition strip.
 for(const a of s.actors.filter(a=>s.gates.some(g=>g.x===a.x&&g.y===a.y))){
 c.save();c.translate(a.x,a.y);c.fillStyle='#fff9e6';c.beginPath();c.roundRect(.71,.055,.26,.23,.04);c.fill();
 c.fillStyle='#294e5e';c.textAlign='center';c.textBaseline='middle';c.font='bold .19px sans-serif';c.fillText(String(a.level),.84,.17);c.restore();
 }
 for(let i=rescues.length-1;i>=0;i--){
  const e=rescues[i],t=(time-e.start)/360;if(t>=1){rescues.splice(i,1);continue}
  c.save();c.globalAlpha=1-t;c.strokeStyle='#dfb851';c.lineWidth=.035;
  c.beginPath();c.arc(e.x+.5,e.y+.36,.12+t*.32,0,Math.PI*2);c.stroke();c.restore();
 }
 }
 return draw;
}


