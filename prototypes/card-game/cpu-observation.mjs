// Trusted adapter. The policy never receives engine state or command JSON.
import {actor,view,legalActions,VERSION} from './engine.mjs';
import {RULES} from './rules.mjs';
import {effectiveRule} from './ability-copy.mjs';
import {visibleCards} from './ui-context.mjs';
const other=a=>a==='A'?'B':'A';
const freeze=o=>{if(o&&typeof o==='object'){Object.values(o).forEach(freeze);Object.freeze(o);}return o;};
// Only static evaluation hints, never raw link/event/contract internals.
function hints(r){if(!r)return null;return {steps:(r.steps??[]).map(step=>({op:step.op,n:typeof step.n==='number'?step.n:null,power:step.power??0,wisdom:step.wisdom??0,to:step.to??'self',destination:step.destination??null,duration:step.duration??null,steps:hints(step)?.steps??[]})),handCost:Boolean(r.handCost),selfCost:Boolean(r.selfCost),select:(r.select??[]).map(g=>({cost:Boolean(g.cost),count:g.count??g.min??0,zone:g.zone}))};}
export function observeCpu(s,seat){
 if(s.version!==VERSION||!['A','B'].includes(seat)||actor(s)!==seat)throw Error('CPU observation requires current supported actor');
 const v=view(s,seat),safe=new Map(visibleCards(v).filter(c=>!c.hidden).map(c=>[c.id,c]));
 const raw=legalActions(s),q=s.choice,d=s.activationDraft,spec=d?.rule?.select?.[d.index]??q?.spec;
 const reference=id=>safe.get(id)??null;
 const owner=id=>{if(!id)return null;for(const a of ['A','B']){const p=v.players[a];if([...(p.hand??[]),...p.discard,p.board.main,p.board.partner,p.board.world,...p.board.companions,...p.board.prepared].some(c=>c?.id===id&&!c.hidden))return a;}return null;};
 const hiddenTarget=id=>{const i=s.players[other(seat)].board.prepared.findIndex(e=>e.id===id&&e.faceDown);return i<0?null:{id:`hidden:${other(seat)}:${i}`,hidden:true};};
 const actions=raw.map((a,i)=>{
  const c=reference(a.source),target=reference(a.target)??hiddenTarget(a.target),choiceCard=reference(a.value);
  const r=c?effectiveRule(s,a.source,RULES[c.cardId]):null;
  const program=a.kind==='programAbility'?r?.active:a.kind==='trigger'?s.pending.find(t=>t.source===a.source&&t.index===a.index)?.program:r;
  const value=typeof a.value==='string'&&!a.value.includes(':')&&!s.cards[a.value]?a.value:null;
  return {id:`ui:${s.revision}:${i}`,kind:a.kind,card:c,choiceCard,target,targetSeat:target?.hidden?other(seat):owner(a.kind==='choose'?a.value:a.target),costCard:reference(a.costCard),slot:a.slot??null,variant:a.variant??null,parameter:a.parameter??null,declare:a.declare??null,cost:a.cost??a.quote?.cost??(a.kind==='play'?c?.cost:0)??0,value,program:hints(program),mandatory:Boolean(program?.mandatory)};
 });
 const selection=spec?{cost:Boolean(spec.cost),zone:spec.zone??null,destination:spec.cost??q?.destination??(d?.rule?.steps??spec.steps??[]).find(x=>x.op==='selectedMove'&&x.key===spec.key)?.destination??null}:null;
 return freeze(structuredClone({seat,round:v.round,turn:v.turn,phase:v.phase,revision:v.revision,window:s.window,players:v.players,chain:v.chain,choice:v.choice?{kind:v.choice.kind,peek:v.choice.peek,selection,destination:q?.search?.destination??q?.destination??null}:null,challenge:s.challenge?{parameter:s.challenge.parameter,completed:Boolean(s.challenge.completed)}:null,actions}));
}
