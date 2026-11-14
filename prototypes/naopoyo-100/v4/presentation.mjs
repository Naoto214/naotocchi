import{gateTarget}from '../../naopoyo-shared/gate-animation.mjs';
import{sampleEffects}from '../../naopoyo-chapter1/render.mjs';
import {Presentation} from '../presentation.mjs';
import {contactVisualActors,contactEffects} from './warp-motion.mjs';
export class ComparisonPresentation extends Presentation {
 constructor(){super();this.warpStyle='new'}
 queue(before,after,result,id,dx,dy,reduced=false){
  super.queue(before,after,result,id,dx,dy,reduced);
  if(!reduced&&this.warpStyle==='new'&&result.events.some(e=>e.type==='warp')){
   const f=this.motion.at(-1);f.warpComparison=true;f.duration=260*result.events.filter(e=>e.type==='warp').length;
  }
 }
 frame(now=performance.now(),reduced=false){
  const f=this.motion[0];
  if(!f?.warpComparison)return super.frame(now,reduced);
  const t=reduced?1:Math.min(1,f.elapsed/f.duration);
  const actors=contactVisualActors(f,t);this.time=now;
  const gates=this.gateEffects.sample(this,actors,now,reduced).map(g=>({...g,pulse:0,...this.gateTransitions.sample(`${g.x},${g.y}`,gateTarget(this.state,g,this.focus,actors),now,reduced)}));
  this.gateTransitions.retain(new Set(gates.map(g=>`${g.x},${g.y}`)));
  return {state:{...this.state,actors},gates,effects:contactEffects(f,t),stateEffects:sampleEffects(this.effectSession,now).items,now,reduced};
 }
 hit(p){
  if(!this.motion[0]?.warpComparison)return super.hit(p);
  const alive=new Set(this.state.actors.map(a=>a.id));
  return this.frame().state.actors.filter(a=>a.opacity>0&&alive.has(a.id)&&Math.abs(a.x+.5-p.x)<=.5&&Math.abs(a.y+.5-p.y)<=.5).sort((a,b)=>Math.hypot(a.x+.5-p.x,a.y+.5-p.y)-Math.hypot(b.x+.5-p.x,b.y+.5-p.y))[0];
 }
}
