import {drawSplitPreview} from './preview-art.mjs';
import {actorSpriteBox} from './actor-art.mjs';
import {drawStone} from './stone.mjs';
import {drawGate} from './gate-art.mjs';
import {GateEffects} from './gate-effects.mjs';
const gateEffects=new WeakMap();
import {drawSprite} from '../naopoyo-rescue/sprites.mjs';
import {drawExit,drawCondition} from '../naopoyo-rescue/fixtures.mjs';
import {render as chapterRender} from '../naopoyo-chapter1/render.mjs';
import {visualActors} from './session.mjs';
export {loadGuests,eventCaption} from '../naopoyo-world/render.mjs';
let forest=null;
export const loadForest=()=>new Promise(resolve=>{const img=new Image();img.onload=()=>{forest=img;resolve(true)};img.onerror=()=>resolve(false);img.src=new URL('../../assets/world/forest-v1.webp',import.meta.url).href;});
export function arrowPosition(s,actors=s.actors){
 const occupied=[...s.walls.map(([x,y])=>({x,y})),...s.gates,...s.exits,...s.spikes,...actors];
 for(const p of [{x:5,y:2},{x:1,y:1},{x:5,y:4},{x:3,y:1}])if(!occupied.some(a=>Math.abs(a.x-p.x)<1.4&&Math.abs(a.y-p.y)<1.4))return p;
 return null;
}
export function render(canvas,q,{dpr=1,reducedMotion=globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches||false}={}){
 if(!q.stage.id.startsWith('komorebi-'))return chapterRender(canvas,q,{dpr});
 const width=canvas.getBoundingClientRect().width,cell=width/8,c=canvas.getContext('2d'),s=q.state;
 canvas.width=Math.round(width*dpr);canvas.height=Math.round(width*dpr);c.setTransform(dpr,0,0,dpr,0,0);
 c.fillStyle='#dce9c9';c.fillRect(0,0,width,width);
 if(forest){c.globalAlpha=.35;c.drawImage(forest,0,0,width,width);c.globalAlpha=1;}
 const bg=c.createLinearGradient(0,0,0,width);bg.addColorStop(0,'#edf4cf35');bg.addColorStop(1,'#e6efd9f2');c.fillStyle=bg;c.fillRect(0,0,width,width);
 c.save();c.scale(cell,cell);
 c.strokeStyle='#547c6030';c.lineWidth=.015;
 for(let n=1;n<8;n++){c.beginPath();c.moveTo(n,0);c.lineTo(n,8);c.moveTo(0,n);c.lineTo(8,n);c.stroke();}
 const actors=visualActors(q),arrow=arrowPosition(s,[...s.actors,...actors]);
 if(arrow){c.fillStyle='#315c4c30';c.font='700 2.3px sans-serif';c.textAlign='center';c.textBaseline='middle';c.fillText('↓',arrow.x+.5,arrow.y+.5);}
 // Root/stone upper edges exist only where a wall is actually solid.
 for(const [x,y]of s.walls)drawStone(c,x,y);
 c.fillStyle='#617d50';c.fillRect(0,7.96,8,.04);
 for(const e of s.exits){drawExit(c,e);drawCondition(c,e);}
 if(!gateEffects.has(q))gateEffects.set(q,new GateEffects());
 const gates=gateEffects.get(q).sample(q,actors,q.time,reducedMotion);
 for(const g of gates)drawGate(c,g);
 for(const p of s.spikes){c.fillStyle='#ac7089';c.fillRect(p.x+.1,p.y+.75,.8,.13);for(let n=0;n<p.power;n++){const x=p.x+.5+(n-(p.power-1)/2)*.23;c.beginPath();c.moveTo(x-.11,p.y+.75);c.lineTo(x,p.y+.32);c.lineTo(x+.11,p.y+.75);c.fill();}}
 c.restore();
 for(const a of actors){
  const held=a.id===q.active?.id;
  c.save();c.globalAlpha=a.opacity*(q.preview?.affectedIds.includes(a.id)?.25:1);
  c.fillStyle='#29452c30';c.beginPath();c.ellipse((a.x+.5)*cell,(a.y+.96)*cell,cell*.30,cell*.08,0,0,Math.PI*2);c.fill();
  if(held){c.strokeStyle='#cba44d';c.lineWidth=2;c.strokeRect(a.x*cell+2,a.y*cell+2,cell-4,cell-4);}
  drawSprite(c,a.species,a.level,actorSpriteBox(a,cell,held));
  c.font=`900 ${cell*(held?.36:.31)}px system-ui`;c.textAlign='center';c.textBaseline='middle';c.lineWidth=3.5;c.strokeStyle='#355144';c.strokeText(a.level,(a.x+.5)*cell,(a.y+.18)*cell);c.fillStyle=held?'#fff2ae':'#fff';c.fillText(a.level,(a.x+.5)*cell,(a.y+.18)*cell);
  c.restore();
 }
 drawSplitPreview(c,q.preview,cell);
 const f=q.motion[0];if(f){const t=f.elapsed/f.duration;for(const e of f.events.filter(e=>['merge','split','rescue'].includes(e.type))){c.globalAlpha=Math.max(0,1-t);c.strokeStyle='#bc8c3a';c.lineWidth=2;c.beginPath();c.arc((e.x+.5)*cell,(e.y+.5)*cell,(.15+t*.38)*cell,0,Math.PI*2);c.stroke();}c.globalAlpha=1;}
}
