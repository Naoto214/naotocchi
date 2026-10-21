import { drawExit, drawGate, drawCondition } from './fixtures.mjs';
const colors={dog:['#c2edf2','#74b7cf'],fish:['#ffdbbd','#e69f9c']};
export function renderer(canvas){const c=canvas.getContext('2d'),positions=new Map(),gateStates=new Map();let lastState=null;let reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
 function draw(s,selected,time){if(s!==lastState){positions.clear();gateStates.clear();lastState=s}const r=canvas.getBoundingClientRect(),d=Math.min(devicePixelRatio||1,2);if(canvas.width!==Math.round(r.width*d)||canvas.height!==Math.round(r.width*d*s.h/s.w)){canvas.width=Math.round(r.width*d);canvas.height=Math.round(r.width*d*s.h/s.w)}
 const size=canvas.width/s.w;c.setTransform(size,0,0,size,0,0);c.clearRect(0,0,s.w,s.h);
 const bg=c.createLinearGradient(0,0,0,s.h);bg.addColorStop(0,'#e5efe5');bg.addColorStop(1,'#f3f3df');c.fillStyle=bg;c.fillRect(0,0,s.w,s.h);
 for(let y=0;y<s.h;y++)for(let x=0;x<s.w;x++){c.fillStyle=(x+y)%2?'#ffffff12':'#ffffff40';c.fillRect(x+.03,y+.03,.94,.94);c.fillStyle='#b5c8b644';c.beginPath();c.arc(x+.5,y+.5,.024,0,Math.PI*2);c.fill()}
 for(const[x,y]of s.walls){c.fillStyle='#8b9b88';c.beginPath();c.roundRect(x+.035,y+.14,.93,.84,.12);c.fill();c.fillStyle='#bfccb1';c.beginPath();c.roundRect(x+.035,y+.035,.93,.84,.12);c.fill();c.fillStyle='#dce4c9';c.fillRect(x+.13,y+.13,.68,.045)}
 for(const e of s.exits)drawExit(c,e);
 for(const[x,y]of s.spikes){c.fillStyle='#ceaa78';for(let k=0;k<3;k++){c.beginPath();c.moveTo(x+.15+k*.23,y+.75);c.lineTo(x+.27+k*.23,y+.39);c.lineTo(x+.39+k*.23,y+.75);c.fill()}c.fillStyle='#9a835e';c.textAlign='center';c.font='.14px sans-serif';c.fillText('ぶんれつ',x+.5,y+.96)}
 for(const g of s.gates){
 const key=`${g.x},${g.y}`,previous=gateStates.get(key);
 const openedAt=g.open&&!previous?.open?time:previous?.openedAt??time;
 gateStates.set(key,{open:!!g.open,openedAt});
 drawGate(c,g,reduced?1:Math.min(1,(time-openedAt)/240));
 }
 const ids=new Set(s.actors.map(a=>a.id));for(const id of positions.keys())if(!ids.has(id))positions.delete(id);
 for(const a of s.actors){const old=positions.get(a.id)||{x:a.x,y:a.y,level:a.level,born:time};const changed=old.level!==a.level;if(changed)old.born=time;old.level=a.level;old.x+=(a.x-old.x)*(reduced?1:.28);old.y+=(a.y-old.y)*(reduced?1:.28);positions.set(a.id,old);
 const pulse=reduced?0:Math.sin(Math.min(1,(time-old.born)/450)*Math.PI)*.12;const rr=.31+Math.min(a.level-1,7)*.014;c.save();c.translate(old.x+.5,old.y+.54);c.fillStyle='#41615d22';c.beginPath();c.ellipse(0,.31,.34,.08,0,0,Math.PI*2);c.fill();if(selected===a.id){c.strokeStyle='#ebbd68';c.lineWidth=.035;c.beginPath();c.ellipse(0,.3,.43,.12,0,0,Math.PI*2);c.stroke()}
 c.scale(1+pulse,1-pulse);const [light,dark]=colors[a.species];if(a.species==='dog'){c.fillStyle=dark;for(const sign of[-1,1]){c.beginPath();c.ellipse(sign*.24,-.21,.12,.2,sign*.4,0,Math.PI*2);c.fill()}}else{c.fillStyle=dark;c.beginPath();c.moveTo(.22,-.02);c.lineTo(.48,-.2);c.lineTo(.46,.2);c.closePath();c.fill()}
 const gradient=c.createRadialGradient(-.13,-.17,.01,0,.04,.5);gradient.addColorStop(0,light);gradient.addColorStop(1,dark);c.fillStyle=gradient;c.beginPath();c.ellipse(0,0,rr,rr*.9,0,0,Math.PI*2);c.fill();c.fillStyle='#ffffff65';c.beginPath();c.ellipse(-.12,-.17,.09,.04,-.5,0,Math.PI*2);c.fill();c.fillStyle='#294e5e';for(const x of[-.115,.115]){c.beginPath();c.ellipse(x,-.025,.026,.039,0,0,Math.PI*2);c.fill()}c.strokeStyle='#294e5e';c.lineWidth=.018;c.beginPath();c.arc(0,.05,.052,0,Math.PI);c.stroke();c.fillStyle='#fff9e6';c.beginPath();c.roundRect(-.135,.15,.27,.18,.06);c.fill();c.fillStyle='#44626a';c.textAlign='center';c.font='bold .135px sans-serif';c.fillText(String(a.level).padStart(2,'0'),0,.285);c.restore();
 }
 for(const fixture of [...s.exits,...s.gates])drawCondition(c,fixture);
 // Keep the occupant's own level readable above the door's condition strip.
 for(const a of s.actors.filter(a=>s.gates.some(g=>g.x===a.x&&g.y===a.y))){
 c.save();c.translate(a.x,a.y);c.fillStyle='#fff9e6';c.beginPath();c.roundRect(.71,.055,.26,.23,.04);c.fill();
 c.fillStyle='#294e5e';c.textAlign='center';c.textBaseline='middle';c.font='bold .19px sans-serif';c.fillText(String(a.level).padStart(2,'0'),.84,.17);c.restore();
 }
 }
 return draw;
}
