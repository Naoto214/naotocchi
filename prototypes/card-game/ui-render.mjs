// DOM presentation only; game commands and state never enter this module.
export function updateGameDOM(game,next,feedbackHost){
 const battle=game.querySelector('.battle-area'),incoming=next.querySelector('.battle-area');
 if(!battle||feedbackHost.parentNode!==battle){
  game.replaceChildren(next);
  game.querySelector('.battle-area').append(feedbackHost);
  return;
 }
 // Keep both the overlay AND its positioning ancestor connected. Removing and
 // reinserting even the same element can restart CSS animations in Safari.
 for(const n of [...battle.childNodes])if(n!==feedbackHost)n.remove();
 for(const n of [...incoming.childNodes])battle.insertBefore(n,feedbackHost);
 for(const n of [...game.childNodes])if(n!==battle)n.remove();
 let after=false;
 for(const n of [...next.childNodes]){
  if(n===incoming){after=true;continue;}
  if(after)game.append(n);else game.insertBefore(n,battle);
 }
}

// UI-local, non-persistent turn identity. Responding does not change the turn.
export class TurnFeedback {
 hide(){this.key=null;}
 present(node,v,reduced=false,field=null){
  const key=`${v.resultEpoch}:${v.round}:${v.turn}`;
  if(this.key&&this.epoch===v.resultEpoch&&this.key!==key&&!reduced&&!v.result){
   field?.animate?.([{opacity:.35},{opacity:1}],{duration:400,easing:'ease-out',pseudoElement:'::after'});
   node?.animate?.([{filter:'brightness(1.4)'},{filter:'brightness(1)'}],{duration:700,easing:'ease-out'});
  }
  this.key=key;this.epoch=v.resultEpoch;
 }
}

// UI-only tickets. No timer, persistent state, or engine command remapping.
export class ActionInputGuard {
 constructor(context){this.context=context;this.generation=0;this.nodes=new WeakMap();this.gesture=null;}
 invalidate(){this.generation++;}
 stamp(nodes){const context=this.context();for(const node of nodes)this.nodes.set(node,{...context,generation:this.generation});}
 current(node,ticket=this.nodes.get(node)){
  const now=this.context();
  return Boolean(node?.isConnected&&!node.disabled&&ticket&&ticket.generation===this.generation&&ticket.session===now.session&&ticket.revision===now.revision&&ticket.viewer===now.viewer);
 }
 begin(node){this.gesture={node,ticket:this.nodes.get(node)};}
 cancel(){this.gesture=null;}
 accept(node,{detail=0}={}){
  const gesture=this.gesture;this.gesture=null;
  if(!this.current(node))return false;
  // A click from assistive technology has no pointerdown. A pointer click must.
  if((detail>0||gesture)&&(!gesture||gesture.node!==node||!this.current(node,gesture.ticket)))return false;
  if(node.dataset.passIntent==='end-turn'&&detail>1)return false;
  return true;
 }
}

export function installActionInputGuard(doc,context){
 const guard=new ActionInputGuard(context),selector='[data-action],[data-confirm],select[data-declaration]';
 const control=event=>event.target.closest?.(selector);
 doc.addEventListener('pointerdown',event=>guard.begin(control(event)),true);
 doc.addEventListener('pointercancel',()=>guard.cancel(),true);
 doc.addEventListener('keydown',event=>{if(['Enter',' '].includes(event.key)&&!event.repeat)guard.begin(control(event));},true);
 doc.addEventListener('click',event=>{
  const node=control(event);if(!node||node.matches?.('select'))return;
  if(!guard.accept(node,event)){event.preventDefault();event.stopImmediatePropagation();}
 },true);
 doc.addEventListener('change',event=>{
  const node=control(event);if(node&&!guard.current(node)){event.preventDefault();event.stopImmediatePropagation();}
 },true);
 return {invalidate:()=>guard.invalidate(),stamp:()=>guard.stamp(doc.querySelectorAll(selector))};
}
