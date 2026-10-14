/** Already resolved reservations are automatic work, never a new activation. */
const other=a=>a==='A'?'B':'A';
export function lifetime(s,a,duration='turn'){
 return {duration,...(duration==='nextStart'||duration==='nextEnd'?{until:s.serial+(s.turn===a?2:1)}:{})};
}
export function reserve(s,l,e){
 if(e.challenge&&(!s.challenge||s.challenge.ended))return false;
 s.effects.push({kind:'reservation',actor:l.actor,...lifetime(s,l.actor,e.duration),rule:structuredClone(e),link:{...structuredClone(l),createdRevision:s.revision},remaining:e.count??e.sequence?.length??1,index:0,...(e.challenge?{challenge:s.challenge.id}:{})});return true;
}
export function collect(s,event,condition){
 const jobs=[];for(const r of s.effects.filter(e=>e.kind==='reservation')){
  const e=r.rule,l={...r.link,event};if(e.when!==event.kind||(e.eventActor!=='any'&&(e.eventActor==='opponent'?event.actor===r.actor:event.actor!==r.actor))||r.challenge!==undefined&&r.challenge!==event.challenge)continue;
  if(e.sameTarget&&(event.source!==l.target||event.generation!==l.targetGeneration))continue;
  if(!condition(s,r.actor,e.condition,l))continue;
  if(e.bind){const a=e.bind==='opponentMain'?other(r.actor):r.actor;l.target=s.players[a].board.main;l.targetGeneration=s.cards[l.target]?.generation;l.targetZone='field';}
  jobs.push({actor:r.actor,link:{...l,scheduled:true,applied:false},steps:structuredClone(e.sequence?e.sequence[r.index]:e.steps)});r.index++;r.remaining--;
 }
 s.effects=s.effects.filter(r=>r.kind!=='reservation'||r.remaining>0);
 return jobs.sort((a,b)=>Number(a.actor!==s.turn)-Number(b.actor!==s.turn));
}
