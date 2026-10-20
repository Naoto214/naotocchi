// Trusted adapter. The policy never receives engine state or command JSON.
import {actor,view,legalActions,VERSION} from './engine.mjs';
import {RULES} from './rules.mjs';
import {effectiveRule} from './ability-copy.mjs';
import {visibleCards} from './ui-context.mjs';
const other=a=>a==='A'?'B':'A';
const freeze=o=>{if(o&&typeof o==='object'){Object.values(o).forEach(freeze);Object.freeze(o);}return o;};
// Only static evaluation hints, never raw link/event/contract internals.
function hints(r){if(!r||!Object.keys(r).length)return null; // effectiveRule(...,undefined) yields {}: no rule program, not an empty one.
return {steps:(r.steps??[]).map(step=>({op:step.op,n:typeof step.n==='number'?step.n:null,power:step.power??0,wisdom:step.wisdom??0,to:step.to??'self',destination:step.destination??null,duration:step.duration??null,steps:hints(step)?.steps??[]})),handCost:Boolean(r.handCost),selfCost:Boolean(r.selfCost),select:(r.select??[]).map(g=>({cost:Boolean(g.cost),count:g.count??g.min??0,zone:g.zone}))};}
// Legacy hard-coded play cards (engine.mjs listActions/resolve: I-c_coin2, G-hit-blow, G-area-claim, E-first-date,
// G-animal-shogi, G-archery-3d) have no RULES program. Describe their resolution with existing hint ops, from the
// actor's own public view only. Steps are empty when the resolution would do nothing (empty deck, unmet condition).
function legacyHint(v,seat,a,c){
 const p=v.players[seat],b=p.board,steps=(...x)=>({steps:x,handCost:false,selfCost:false,select:[],legacy:c.cardId});
 switch(c.cardId){
 case 'I-c_coin2':return p.deckCount?steps({op:'coin',n:null,power:0,wisdom:0,to:'self',destination:null,duration:null,steps:[]}):steps(); // same resolution as G-sugoroku-race
 case 'G-hit-blow':{if(!p.deckCount)return steps();
  // Revealed card always reaches hand (match) or is replaced by a draw (miss). Match chance estimated from own known cards.
  const known=[...p.hand.filter(x=>x.id!==a.source),...[b.main,b.partner,b.world,...b.companions,...b.prepared].filter(x=>x&&!x.hidden),...p.discard].filter(x=>x.type),share=known.length?known.filter(x=>x.type===a.declare).length/known.length:0;
  return steps(op('draw',1),{...op('chance',null),p:share,steps:[op('growth',5)]});}
 case 'G-area-claim':{const n=[b.main,b.partner,b.world].filter(Boolean).length+b.companions.length+b.prepared.length;return n>=7?steps(op('growth',n===9?15:10)):steps();}
 case 'E-first-date':return a.target===b.partner?.id&&p.relationship===0?steps(op('draw',1),op('growth',5)):steps();
 case 'G-animal-shogi':return steps({...op('move',null),destination:'hand'},...(p.deckCount?[op('look',null)]:[]));
 case 'G-archery-3d':return steps({...op('move',null),destination:'discard'});
 }
 return null;
}
const op=(name,n)=>({op:name,n,power:0,wisdom:0,to:'self',destination:null,duration:null,steps:[]});
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
  return {id:`ui:${s.revision}:${i}`,kind:a.kind,card:c,choiceCard,target,targetSeat:target?.hidden?other(seat):owner(a.kind==='choose'?a.value:a.target),costCard:reference(a.costCard),slot:a.slot??null,variant:a.variant??null,parameter:a.parameter??null,declare:a.declare??null,cost:a.cost??a.quote?.cost??(a.kind==='play'?c?.cost:0)??0,value,program:hints(program)??(a.kind==='play'&&c?legacyHint(v,seat,a,c):null),mandatory:Boolean(program?.mandatory)};
 });
 const selection=spec?{cost:Boolean(spec.cost),zone:spec.zone??null,destination:spec.cost??q?.destination??(d?.rule?.steps??spec.steps??[]).find(x=>x.op==='selectedMove'&&x.key===spec.key)?.destination??null}:null;
 return freeze(structuredClone({seat,round:v.round,turn:v.turn,phase:v.phase,revision:v.revision,window:s.window,players:v.players,chain:v.chain,choice:v.choice?{kind:v.choice.kind,peek:v.choice.peek,selection,destination:q?.search?.destination??q?.destination??null}:null,challenge:s.challenge?{parameter:s.challenge.parameter,completed:Boolean(s.challenge.completed)}:null,actions}));
}
