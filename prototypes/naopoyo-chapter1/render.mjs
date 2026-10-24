import {drawTerrain} from '../naopoyo-rescue/themes.mjs';
import {drawGate,drawExit,drawCondition} from '../naopoyo-rescue/fixtures.mjs';
import {drawSprite} from '../naopoyo-rescue/sprites.mjs';
import {actorLayout} from '../naopoyo-world/render.mjs';
export {loadGuests,eventCaption} from '../naopoyo-world/render.mjs';
const effects=new WeakMap();
export function render(canvas,q,{dpr=1}={}){
 const width=canvas.getBoundingClientRect().width,cell=width/8,s=q.state,c=canvas.getContext('2d');
 canvas.width=Math.round(width*dpr);canvas.height=Math.round(width*dpr);c.setTransform(dpr,0,0,dpr,0,0);
 const now=performance.now(),reduced=globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
 let fx=effects.get(q);if(!fx){fx={previous:structuredClone(s),items:[]};effects.set(q,fx)}
 const prev=fx.previous;
 if(s.moves!==prev.moves&&s.moves>prev.moves){
  for(const a of s.actors){const old=prev.actors.find(b=>b.id===a.id);if(!old||old.level!==a.level)fx.items.push({x:a.x,y:a.y,at:now,kind:!old?'split':a.level>old.level?'merge':'split'});}
  if(s.rescued>prev.rescued)for(const e of s.exits)fx.items.push({x:e.x,y:e.y,at:now,kind:'rescue'});
 }
 fx.previous=structuredClone(s);fx.items=fx.items.filter(f=>now-f.at<420);
 c.save();c.scale(cell,cell);drawTerrain(c,s);
 for(const e of s.exits){if(!reduced){c.save();c.globalAlpha=.15+.08*Math.sin(now/650);c.fillStyle='#ffe6a2';c.beginPath();c.arc(e.x+.5,e.y+.5,.46,0,Math.PI*2);c.fill();c.restore()}drawExit(c,e);drawCondition(c,e)}
 for(const g of s.gates){drawGate(c,g,s.actors.some(a=>a.x===g.x&&a.y===g.y)?1:0);drawCondition(c,g);}
 for(const p of s.spikes){c.fillStyle='#ba879e';c.fillRect(p.x+.09,p.y+.73,.82,.11);for(let n=0;n<p.power;n++){const x=p.x+.5+(n-(p.power-1)/2)*.25;c.beginPath();c.moveTo(x-.13,p.y+.75);c.lineTo(x,p.y+.28);c.lineTo(x+.13,p.y+.75);c.fillStyle='#f2b7ce';c.fill()}}
 c.restore();
 for(const a of [...s.actors].sort((a,b)=>(a.id===q.active?.id)-(b.id===q.active?.id))){
  const held=a.id===q.active?.id,lay=actorLayout(a,held,cell,width,width),effect=fx.items.find(f=>f.x===a.x&&f.y===a.y),t=effect?(now-effect.at)/420:1;
  const lift=!reduced&&effect?Math.sin(Math.PI*t)*cell*.09:0;
  if(held){c.strokeStyle='#ffe6a5';c.lineWidth=2;c.strokeRect(a.x*cell+2,a.y*cell+2,cell-4,cell-4)}
  c.fillStyle='#14293c44';c.beginPath();c.ellipse((a.x+.5)*cell,(a.y+.81)*cell,cell*.28,cell*.09,0,0,Math.PI*2);c.fill();
  drawSprite(c,a.species,a.level,{x:lay.bx,y:lay.by-lift,w:lay.bw,h:lay.bh});
  c.font=`900 ${lay.numberSize}px system-ui`;c.textAlign='center';c.textBaseline='middle';c.lineJoin='round';c.lineWidth=3.5;c.strokeStyle='#243a50';c.strokeText(a.level,(a.x+.5)*cell,lay.numberY);c.fillStyle=held?'#ffe6a5':'#fff';c.fillText(a.level,(a.x+.5)*cell,lay.numberY);
 }
 if(!reduced)for(const f of fx.items){const t=(now-f.at)/420;c.strokeStyle=`rgba(255,231,166,${1-t})`;c.lineWidth=2;c.beginPath();c.arc((f.x+.5)*cell,(f.y+.5)*cell,cell*(.18+t*.4),0,Math.PI*2);c.stroke();}
}
