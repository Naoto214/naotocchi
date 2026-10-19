// Presentation queue only. No game timers, commands or private-state access.
import {importantResult} from './ui-presentation.mjs';
export class ResultFeedback {
 constructor({paint,clear,dock=()=>{},schedule=(fn,ms)=>globalThis.setTimeout(fn,ms),cancel=id=>globalThis.clearTimeout(id)}){Object.assign(this,{paint,clear,dock,schedule,cancel});this.seen=new Map();this.ticket=0;this.reset();}
 reset(){this.hide();this.seen=new Map();this.epoch=null;this.batch=null;}
 stopTimer(){if(this.timer!==undefined)this.cancel(this.timer);this.ticket++;this.timer=undefined;}
 consumeQueue(){if(this.viewer)this.seen.set(this.viewer,Math.max(this.seen.get(this.viewer)??-1,...(this.queue??[]).map(g=>g.revision)));}
 hide(){
  this.consumeQueue();this.stopTimer();this.queue=[];this.retained=[];this.current=null;this.viewer=null;this.clear();this.dock(false);
 }
 collapse(){
  this.consumeQueue();this.stopTimer();this.queue=[];this.current=null;this.clear();this.dock(Boolean(this.viewer&&this.retained.length));
 }
 reopen(){
  if(!this.viewer||!this.retained.length)return;
  this.stopTimer();this.queue=[...this.retained];this.current=null;this.next();
 }
 present(groups,viewer,epoch,batch=0){
  if(epoch!==this.epoch){this.reset();this.epoch=epoch;}
  if(!viewer){this.hide();return;}
  if(this.viewer!==viewer){this.hide();this.viewer=viewer;this.batch=batch;}
  else if(this.batch!==batch){
   // Human input can supersede ordinary notices, but must not skip important
   // transitions already queued for this same viewer. Handoff still clears all.
   this.queue=this.queue.filter(g=>importantResult(g));
   this.retained=this.retained.filter(g=>importantResult(g));
   if(!importantResult(this.current)){this.stopTimer();this.current=null;this.clear();}
   this.batch=batch;
  }
  const last=Math.max(this.seen.get(viewer)??-1,...this.queue.map(g=>g.revision));
  const fresh=groups.filter(g=>!g.historyOnly&&g.revision>last&&g.revision>=batch);
  this.queue.push(...fresh);this.retained.push(...fresh);
  // Keep important transitions in order even during a burst. Ordinary older
  // notices may still be condensed; the complete journal remains available.
  for(const list of [this.queue,this.retained])while(list.length>8){const i=list.findIndex(g=>!importantResult(g));if(i<0)break;list.splice(i,1);}
  if(!this.current)this.next();
 }
 next(){
  this.current=this.queue.shift();if(!this.current){this.timer=undefined;this.clear();this.dock(Boolean(this.viewer&&this.retained.length));return;}
  this.dock(false);this.seen.set(this.viewer,Math.max(this.seen.get(this.viewer)??-1,this.current.revision));this.paint(this.current);const ticket=this.ticket;
  this.timer=this.schedule(()=>{if(ticket!==this.ticket)return;this.current=null;this.next();},4000);
 }
}
