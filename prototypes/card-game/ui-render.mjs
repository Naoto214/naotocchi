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
 present(node,v,reduced=false){
  const key=`${v.resultEpoch}:${v.round}:${v.turn}`;
  if(this.key&&this.epoch===v.resultEpoch&&this.key!==key&&!reduced&&!v.result)
   node?.animate?.([{filter:'brightness(1.4)'},{filter:'brightness(1)'}],{duration:700,easing:'ease-out'});
  this.key=key;this.epoch=v.resultEpoch;
 }
}
