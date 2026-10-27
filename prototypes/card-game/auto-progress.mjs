// Shared orchestration only. Every transition is an official engine command.
import {RULE_VERSIONS,actor,act,legalActions,validate,supported,createGame} from './engine.mjs';
import {certifySelectionCapabilities} from './auto-capabilities.mjs';
import * as legacy from './legacy-engine.mjs';
import {CARDS as BASE} from './cards.mjs';
const windows=new Set(['start','normal','end_request','end','compare','challenge_end']);
const semantic=s=>{const {revision,commands,log,...rest}=s;return JSON.stringify(rest);};
function certify(s){
 if(![...RULE_VERSIONS,legacy.VERSION].includes(s.version))throw Error('Unsupported runtime');
 validate(s);certifySelectionCapabilities(s);
 for(const c of Object.values(s.cards))if(s.version!==legacy.VERSION?!supported(c.cardId):!BASE[c.cardId])throw Error('Unsupported card');
 if(!windows.has(s.window)||!['A','B'].includes(actor(s)))throw Error('Unknown response boundary');
}
function inventory(s,enumerate){
 const before=JSON.stringify(s),actions=enumerate(s);
 if(JSON.stringify(s)!==before||!Array.isArray(actions)||!actions.length||actions.some(a=>!a||typeof a.kind!=='string'||typeof a.id!=='string')||new Set(actions.map(a=>a.id)).size!==actions.length||actions.filter(a=>a.kind==='pass').length!==1)throw Error('Incomplete response inventory');
 return actions;
}
function entry(s,next){return {revision:next.revision,actor:actor(s),turn:s.turn,window:s.window,chainBefore:s.chain.length,chainAfter:next.chain.length};}
export function advanceResponses(state,{limit=64,enumerate=legalActions,transition=act,onTransition=()=>{}}={}){
 let current=state;const steps=[],seen=new Set([semantic(state)]);
 const stop=(reason,halted=false)=>({state:current,steps,reason,halted});
 if(!Number.isInteger(limit)||limit<1||limit>256)return stop('limit',true);
 while(true){
  if(current.choice||current.phase==='choice')return stop('choice');
  if(current.phase==='trigger'||current.pending?.length)return stop('trigger');
  if(current.phase==='normal'||current.phase==='finished')return stop(current.phase);
  if(current.phase!=='response')return stop('unknown-phase',true);
  try{
   // Clone before inspecting as well as before acting: failures retain the last valid state.
   const work=structuredClone(current);certify(work);const actions=inventory(work,enumerate);
   if(actions.length!==1)return stop('response');
   if(steps.length>=limit)return stop('limit',true);
   const next=transition(work,actor(work),work.revision,actions[0].id);
   validate(next);
   if(next.revision!==current.revision+1||next.commands.length!==current.commands.length+1||next.commands.at(-1)!==actions[0].id)throw Error('Invalid transition');
   const key=semantic(next);if(seen.has(key))return stop('cycle',true);
   seen.add(key);steps.push(entry(current,next));const previous=current;current=next;
   // Presentation observers cannot roll back or fail an accepted rule transition.
   try{onTransition(previous,current);}catch{}
  }catch{return stop('error',true);}
 }
}
// Reconstruct public no-response pass records from formal replay commands. Older
// manually passed saves are accurately described as "応答なしのパス", not fabricated automation.
export function responsePassLog(state){
 let s=state.version===legacy.VERSION?legacy.createGame(state.seed):createGame(state.seed,state.decks,state.version);const rows=[];
 for(const id of state.commands){
  let forced=false;
  if(s.phase==='response'&&!s.choice&&!s.pending?.length){certify(s);const actions=inventory(s,legalActions);forced=actions.length===1&&actions[0].id===id;}
  const next=act(s,actor(s),s.revision,id);if(forced)rows.push(entry(s,next));s=next;
 }
 return rows;
}
