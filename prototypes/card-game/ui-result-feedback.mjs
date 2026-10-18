// Presentation queue only. No game timers, commands or private-state access.
export class ResultFeedback {
 constructor({paint,clear,dock=()=>{},schedule=setTimeout,cancel=clearTimeout}){Object.assign(this,{paint,clear,dock,schedule,cancel});this.seen=new Map();this.ticket=0;this.reset();}
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
  // New human action supersedes transient notices. All prior results remain in history.
  if(this.viewer!==viewer||this.batch!==batch){this.hide();this.viewer=viewer;this.batch=batch;}
  const last=Math.max(this.seen.get(viewer)??-1,...this.queue.map(g=>g.revision));
  const fresh=groups.filter(g=>g.revision>last&&g.revision>=batch);
  this.queue.push(...fresh);this.retained.push(...fresh);
  if(this.queue.length>8)this.queue.splice(0,this.queue.length-8);
  if(this.retained.length>8)this.retained.splice(0,this.retained.length-8);
  if(!this.current)this.next();
 }
 next(){
  this.current=this.queue.shift();if(!this.current){this.timer=undefined;this.clear();this.dock(Boolean(this.viewer&&this.retained.length));return;}
  this.dock(false);this.seen.set(this.viewer,Math.max(this.seen.get(this.viewer)??-1,this.current.revision));this.paint(this.current);const ticket=this.ticket;
  this.timer=this.schedule(()=>{if(ticket!==this.ticket)return;this.current=null;this.next();},2000);
 }
}
