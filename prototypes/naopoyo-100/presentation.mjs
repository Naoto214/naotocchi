import {GateTransitions,gateTarget} from '../naopoyo-shared/gate-animation.mjs';
import {ForestSession,pointerActor,motionFrame,visualActors} from '../naopoyo-chapter2/session.mjs';
import {contactEffects} from '../naopoyo-chapter2/contact-motion.mjs';
import {GateEffects} from '../naopoyo-chapter2/gate-effects.mjs';
import {sampleEffects} from '../naopoyo-chapter1/render.mjs';
// Composition only: all timing, visible hit testing and contact paths are canonical.
export class Presentation {
 constructor(){this.reset()}
 reset(state){this.state=state?structuredClone(state):null;this.motion=[];this.active=null;this.time=0;this.gateEffects=new GateEffects();this.gateTransitions=new GateTransitions();this.focus=null;this.effectSession={state:this.state}}
 sync(state){if(!this.state)this.reset(state);else Object.assign(this.state,state);this.effectSession.state=this.state}
 queue(before,after,result,id,dx,dy,reduced=false){this.sync(after);if(!reduced)this.motion.push(motionFrame(before,after,result,id,dx,dy))}
 advance(ms,reduced=false){ForestSession.prototype.animate.call(this,ms,reduced)}
 hit(point){return pointerActor(this,point)}
 frame(now=performance.now(),reduced=false){this.time=now;const actors=visualActors(this),f=this.motion[0];const gates=this.gateEffects.sample(this,actors,now,reduced).map(g=>({...g,pulse:0,...this.gateTransitions.sample(`${g.x},${g.y}`,gateTarget(this.state,g,this.focus,actors),now,reduced)}));this.gateTransitions.retain(new Set(gates.map(g=>`${g.x},${g.y}`)));return {state:{...this.state,actors},effects:f?contactEffects(f,Math.min(1,f.elapsed/f.duration)):[],gates,stateEffects:sampleEffects(this.effectSession,now).items,now,reduced}}
}
