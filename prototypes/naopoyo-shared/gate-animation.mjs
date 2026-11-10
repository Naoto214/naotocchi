import {matchesCondition} from '../naopoyo-rescue/conditions.mjs';
export const GATE_TRANSITION_MS=280;
const clamp=n=>Math.max(0,Math.min(1,n));
const ease=n=>n*n*(3-2*n);
// Visual eligibility only. Movement always uses the canonical engine separately.
export function gateTarget(state,gate,selected,visible=state.actors){
 const occupies=a=>a.x===gate.x&&a.y===gate.y&&matchesCondition(a,gate)&&(a.opacity??1)>.05;
 if(state.actors.some(occupies)||visible.some(occupies))return true;
 return [...state.actors,...visible].some(a=>a.id===selected&&matchesCondition(a,gate)&&(a.opacity??1)>.05&&Math.abs(a.x-gate.x)<=1&&Math.abs(a.y-gate.y)<=1&&a.x!==gate.x);
}
export class GateTransitions{
 constructor(){this.clear()}
 clear(){this.entries=new Map()}
 get active(){return [...this.entries.values()].some(e=>e.moving)}
 retain(keys){for(const key of this.entries.keys())if(!keys.has(key))this.entries.delete(key)}
 sample(key,target,now,reduced=false){
  target=Boolean(target);let e=this.entries.get(key);
  if(!e){e={target,from:Number(target),start:now,moving:false};this.entries.set(key,e)}
  const value=()=>{const p=clamp((now-e.start)/GATE_TRANSITION_MS);return {p,opening:e.from+(Number(e.target)-e.from)*ease(p)}};
  let v=value();if(e.target!==target){e={target,from:v.opening,start:now,moving:true};this.entries.set(key,e);v=value()}
  if(reduced||now<e.start){e.from=Number(target);e.start=now;e.moving=false;return {opening:Number(target),glow:0,openTarget:target}}
  e.moving=e.from!==Number(target)&&v.p<1;
  return {opening:v.opening,glow:e.moving&&target?Math.sin(Math.PI*v.p):0,openTarget:target};
 }
}
