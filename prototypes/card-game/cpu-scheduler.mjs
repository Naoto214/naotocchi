// Single-flight timer. Session identity + revision + epoch prevent stale/double actions.
export class CpuScheduler {
 #timer=null;#epoch=0;
 constructor({getSession,onStep=()=>{},canRun=()=>true,clock=globalThis,delay=650}){this.getSession=getSession;this.onStep=onStep;this.canRun=canRun;this.clock=clock;this.delay=delay;}
 cancel(){this.#epoch++;if(this.#timer!==null)this.clock.clearTimeout(this.#timer);this.#timer=null;}
 schedule(){
  this.cancel();const s=this.getSession();if(!s?.cpuPending||!this.canRun())return;
  const epoch=this.#epoch,revision=s.projection.revision;
  this.#timer=this.clock.setTimeout(()=>{if(epoch!==this.#epoch)return;this.#timer=null;if(s!==this.getSession()||!this.canRun()||!s.cpuPending||s.projection.revision!==revision)return;s.stepCpu(revision);this.onStep();},this.delay);
 }
}
