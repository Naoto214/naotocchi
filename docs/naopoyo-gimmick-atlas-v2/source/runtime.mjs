// Chapter-only mechanisms around the unchanged, formally adopted D engine.
import {createState,move,settle,clone,mass} from '../naopoyo-time-hand-chapter1/engine.mjs';
const cell=(a,p)=>a.x===p.x&&a.y===p.y;
export const doorOpen=(s,d)=>d.any?d.any.some(k=>s.flags[k]):d.needs.every(k=>s.flags[k]);
export function syncTerrain(s){
 const m=s.mechanisms;s.walls=clone(s.baseWalls);
 for(const d of m.doors||[])if(!doorOpen(s,d)&&!s.actors.some(a=>cell(a,d)))s.walls.push([d.x,d.y]);
 for(const b of m.boulders||[])if(!s.flags.bearHelp)s.walls.push([b.x,b.y]);
 for(const f of m.floors||[])if(!s.collapsed.includes(f.id))s.walls.push([f.x,f.y]);
 for(const p of m.platforms||[])s.walls.push([p.x,p.y-(s.flags[p.needs]?p.rise:0)]);
}
export function createCastleState(board){const s=createState(board);Object.assign(s,{baseWalls:clone(board.walls),mechanisms:clone(board.mechanisms||{}),flags:{},sequenceIndex:0,pressed:[],collapsed:[],visited:[],mechanismEvents:[]});syncTerrain(s);return s;}
function press(s,actors,transient=false){
 const m=s.mechanisms;
 for(const p of m.plates||[]){
  const a=actors.find(a=>cell(a,p)&&a.level>=(p.weight||1)&&(!p.exact||a.level===p.exact));
  if(p.hold&&!transient)s.flags[p.id+'Held']=!!a;
  if(!a||(p.needs||[]).some(k=>!s.flags[k]))continue;
  if(p.requiresRider&&!(m.platforms||[]).some(l=>l.needs===p.id&&actors.some(v=>v.x===l.x&&v.y===l.y-1)))continue;
  s.flags[p.id]=true;
  if(m.sequence&&!s.pressed.includes(p.id)&&!s.flags.sequence){
   const expected=m.sequence[s.sequenceIndex];s.sequenceIndex=p.id===expected?s.sequenceIndex+1:p.id===m.sequence[0]?1:0;
   if(s.sequenceIndex===m.sequence.length)s.flags.sequence=true;
  }
 }
 s.pressed=(m.plates||[]).filter(p=>actors.some(a=>cell(a,p))).map(p=>p.id);
}
export function castleMove(s,id,dx,dy,observer={}){
 if(!s.actors.some(a=>a.id===id))return {ok:false,reason:'step'};
 const q=clone(s),before=clone(s),birthContacts=[];
 const policy={canEnter:(state,a,x,y)=>!(state.mechanisms.doors||[]).some(d=>d.x===x&&d.y===y&&!doorOpen(state,d)),observeSplit:e=>{birthContacts.push(clone(e.state.actors));observer.observeSplit?.(e);}};
 const result=move(q,id,dx,dy,policy);if(!result.ok)return result;
 q.mechanismEvents=[];
 for(const actors of birthContacts)press(q,actors,true);press(q,q.actors);
 for(const a of q.actors){const k=`${a.x},${a.y}`;if(!q.visited.includes(k))q.visited.push(k);}
 const m=q.mechanisms;
 // Companions never belong to actors and can never receive a player command.
 if(m.owl&&q.flags[m.owl.needs]){q.flags.owlHelp=true;}
 if(m.bear&&q.flags[m.bear.needs]){q.flags.bearRescued=true;q.flags.bearHelp=true;}
 for(const f of m.floors||[])if(!q.collapsed.includes(f.id)&&before.actors.some(a=>a.x===f.x&&a.y===f.y-1)&&!q.actors.some(a=>a.x===f.x&&a.y===f.y-1)){q.collapsed.push(f.id);q.flags[f.id]=true;}
 // Lift travel is discrete, deterministic and happens only after a successful move.
 // It carries supported occupants; same-species contact is still resolved by settle.
 for(const p of m.platforms||[])if(q.flags[p.needs]&&!before.flags[p.needs]){
  const riders=q.actors.filter(a=>a.x===p.x&&a.y===p.y-1);
  if(riders.some(a=>Array.from({length:p.rise},(_,i)=>[a.x,a.y-i-1]).some(([x,y])=>q.walls.some(w=>w[0]===x&&w[1]===y)||q.actors.some(b=>b!==a&&b.x===x&&b.y===y))))return {ok:false,reason:'terrain'};
  for(const a of riders){a.y-=p.rise;q.mechanismEvents.push({type:'lift',id:a.id,rise:p.rise});}q.flags.platformUsed=riders.length>0||q.flags.platformUsed;
 }
 syncTerrain(q);settle(q);press(q,q.actors);syncTerrain(q);
 for(const [key,value] of Object.entries(q.flags))if(value&&!before.flags[key])q.mechanismEvents.push({type:'mechanism',key});
 if(mass(q)!==mass(s))throw Error('mechanism mass mismatch');
 Object.assign(s,q);return {...result,events:[...(result.events||[]),...q.mechanismEvents]};
}
