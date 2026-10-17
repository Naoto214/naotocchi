// Presentation queue only. No game timers, commands or private-state access.
export class ResultFeedback {
 constructor({paint,clear,schedule=setTimeout,cancel=clearTimeout}){Object.assign(this,{paint,clear,schedule,cancel});this.seen=new Map();this.ticket=0;this.reset();}
 reset(){this.hide();this.seen=new Map();this.epoch=null;this.batch=null;}
 hide(){
  if(this.viewer)this.seen.set(this.viewer,Math.max(this.seen.get(this.viewer)??-1,...(this.queue??[]).map(g=>g.revision)));
  if(this.timer!==undefined)this.cancel(this.timer);this.ticket++;this.timer=undefined;this.queue=[];this.current=null;this.viewer=null;this.clear();
 }
 present(groups,viewer,epoch,batch=0){
  if(epoch!==this.epoch){this.reset();this.epoch=epoch;}
  if(!viewer){this.hide();return;}
  // New human action supersedes transient notices. All prior results remain in history.
  if(this.viewer!==viewer||this.batch!==batch){this.hide();this.viewer=viewer;this.batch=batch;}
  const last=Math.max(this.seen.get(viewer)??-1,...this.queue.map(g=>g.revision));
  this.queue.push(...groups.filter(g=>g.revision>last&&g.revision>=batch));
  if(this.queue.length>8)this.queue.splice(0,this.queue.length-8);
  if(!this.current)this.next();
 }
 next(){
  this.current=this.queue.shift();if(!this.current){this.timer=undefined;this.clear();return;}
  this.seen.set(this.viewer,this.current.revision);this.paint(this.current);const ticket=this.ticket;
  this.timer=this.schedule(()=>{if(ticket!==this.ticket)return;this.current=null;this.next();},Math.min(3600,1600+this.current.rows.length*300));
 }
}
