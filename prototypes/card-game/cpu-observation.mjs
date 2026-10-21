// Trusted adapter. The policy never receives engine state or command JSON.
import {actor,view,legalActions,VERSION} from './engine.mjs';
import {RULES} from './rules.mjs';
import {effectiveRule} from './ability-copy.mjs';
import {visibleCards} from './ui-context.mjs';
import {CARDS} from './engine.mjs';
const other=a=>a==='A'?'B':'A';
const freeze=o=>{if(o&&typeof o==='object'){Object.values(o).forEach(freeze);Object.freeze(o);}return o;};
// Only static evaluation hints, never raw link/event/contract internals.
function hints(r){if(!r||!Object.keys(r).length)return null; // effectiveRule(...,undefined) yields {}: no rule program, not an empty one.
return {steps:(r.steps??[]).map(step=>({op:step.op,n:typeof step.n==='number'?step.n:null,power:step.power??0,wisdom:step.wisdom??0,to:step.to??'self',destination:step.destination??null,duration:step.duration??null,steps:hints(step)?.steps??[],...(step.op==='search'?{filter:step.filter??{},max:step.max??1}:{}),...(step.op==='if'&&typeof step.condition==='string'?{condition:step.condition}:{})})),handCost:Boolean(r.handCost),selfCost:Boolean(r.selfCost),select:(r.select??[]).map(g=>({cost:Boolean(g.cost),count:g.count??g.min??0,zone:g.zone}))};}
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
// Own remaining deck as an unordered multiset: own 40-card list minus own cards known elsewhere. No order, nothing of the opponent.
const summary=c=>({cardId:c.id,type:c.type,rare:Boolean(c.rare),stage:c.stage??null,species:c.species??null,attribute:c.attribute??null,cost:c.cost??0,power:c.power??null,wisdom:c.wisdom??null,method:c.method??null});
function ownDeck(s,seat){const n={};for(const id of s.players[seat].deck){const k=s.cards[id].cardId;n[k]=(n[k]??0)+1;}return Object.keys(n).sort().map(k=>({...summary(CARDS[k]),count:n[k]}));}
// Mirrors effects.mjs matches() for the filter keys used by RULES search steps; unknown keys -> null (no estimate).
const KNOWN=new Set(['type','types','excludeType','maxCost','method','minStage','maxStage','species','excludeSpecies','rare','noSameCompanion','notInDiscard','notInField','higherSameSpecies','nextAttribute','differentSpecies','notTargetName','requireTargetPresent','distinctType']);
function searchHit(f,deck,ctx){
 if(Object.keys(f).some(k=>!KNOWN.has(k))||f.type==='declared')return null;const m=ctx.target;
 if((f.higherSameSpecies||f.nextAttribute||f.differentSpecies)&&m?.type!=='main')return {N:ctx.N,matches:[]};
 const ok=c=>!(f.excludeType&&c.type===f.excludeType||f.maxCost!==undefined&&c.cost>f.maxCost||f.method&&c.method!==f.method||f.type&&c.type!==f.type||f.types&&!f.types.includes(c.type)||f.minStage&&!(c.stage>=f.minStage)||f.maxStage&&c.stage>f.maxStage||f.species&&c.species!==f.species||f.excludeSpecies&&c.species===f.excludeSpecies||f.rare!==undefined&&c.rare!==f.rare||f.noSameCompanion&&ctx.companions.includes(c.cardId)||f.notInDiscard&&ctx.discard.includes(c.cardId)||f.notInField&&ctx.field.includes(c.cardId)||f.notTargetName&&c.cardId===m?.cardId||f.higherSameSpecies&&(c.species!==m.species||c.stage<=m.stage)||f.nextAttribute&&(c.attribute!==m.attribute||c.stage!==m.stage+1)||f.differentSpecies&&(c.type!=='main'||c.species===m.species));
 return {N:ctx.N,matches:deck.filter(ok)};
}
function annotate(steps,deck,ctx){for(const st of steps??[]){if(st.op==='search'&&typeof st.n==='number')st.hit=searchHit(st.filter,deck,ctx);annotate(st.steps,deck,ctx);}}
// Own challenge modifiers known to the seat (own hand, own face-down traps, own field triggers). Conditions that cannot be
// known before the challenge window are excluded instead of guessed. Opponent: public counts only.
const STAT_OPS=new Set(['stat','chosenStat','battleStat']);
function statGain(steps,target){const out=[];for(const st of steps??[]){if(STAT_OPS.has(st.op)){const sign=target==='opponentMain'?-1:1;
  if(st.op==='stat'){for(const k of ['power','wisdom'])if(sign*(st[k]??0)>0)out.push({param:k,n:sign*st[k]});}else if(sign*(st.n??0)>0)out.push({param:'any',n:sign*st.n});}}return out;}
function challengeKit(s,seat){
 const p=s.players[seat],o=s.players[other(seat)],b=p.board,kit=[],cid=id=>s.cards[id].cardId,main=b.main?CARDS[cid(b.main)]:null,omain=o.board.main?CARDS[cid(o.board.main)]:null;
 const knowable={undefined:true,baseball:true,uphillChallenge:b.world&&cid(b.world)==='W-mountain'&&main&&omain&&main.stage<omain.stage,prepared3:b.prepared.length===3};
 for(const id of p.hand){const r=RULES[cid(id)];if(r?.mode!=='quick'||r.reaction||!(typeof r.condition==='string'?knowable[r.condition]:r.condition===undefined))continue;
  for(const g of statGain(r.steps,r.target))kit.push({...g,cost:CARDS[cid(id)].cost??0,card:true,only:r.condition==='baseball'?'power':null});}
 for(const e of b.prepared){if(!e.faceDown)continue;const r=RULES[cid(e.id)];for(const t of r?.triggers??[]){if(t.when!=='challenge'||t.opponent||t.condition&&!(t.condition==='setEarlier'&&e.setSerial<s.serial))continue;
  for(const g of statGain(t.steps,t.target))kit.push({...g,cost:0,card:true});}}
 for(const id of [b.main,b.partner,b.world,...b.companions].filter(Boolean)){const r=RULES[cid(id)];for(const t of r?.triggers??[]){if(t.when!=='challenge'||t.opponent||t.condition)continue;
  for(const g of statGain(t.steps,t.target))kit.push({...g,cost:t.cost??0,card:false});}}
 return {own:kit,opponent:{faceDown:o.board.prepared.filter(e=>e.faceDown).length,hand:o.hand.length,time:o.time}};
}
const op=(name,n)=>({op:name,n,power:0,wisdom:0,to:'self',destination:null,duration:null,steps:[]});
export function observeCpu(s,seat){
 if(s.version!==VERSION||!['A','B'].includes(seat)||actor(s)!==seat)throw Error('CPU observation requires current supported actor');
 const v=view(s,seat),safe=new Map(visibleCards(v).filter(c=>!c.hidden).map(c=>[c.id,c]));
 const raw=legalActions(s),q=s.choice,d=s.activationDraft,spec=d?.rule?.select?.[d.index]??q?.spec;
 const reference=id=>safe.get(id)??null,deck=ownDeck(s,seat),me=v.players[seat],mb=me.board;
 const fieldIds=[mb.main,mb.partner,mb.world,...mb.companions,...mb.prepared].filter(x=>x&&!x.hidden).map(x=>x.cardId);
 const ctx0={N:me.deckCount,companions:mb.companions.map(x=>x.cardId),discard:me.discard.map(x=>x.cardId),field:fieldIds};
 const owner=id=>{if(!id)return null;for(const a of ['A','B']){const p=v.players[a];if([...(p.hand??[]),...p.discard,p.board.main,p.board.partner,p.board.world,...p.board.companions,...p.board.prepared].some(c=>c?.id===id&&!c.hidden))return a;}return null;};
 const hiddenTarget=id=>{const i=s.players[other(seat)].board.prepared.findIndex(e=>e.id===id&&e.faceDown);return i<0?null:{id:`hidden:${other(seat)}:${i}`,hidden:true};};
 const actions=raw.map((a,i)=>{
  const c=reference(a.source),target=reference(a.target)??hiddenTarget(a.target),choiceCard=reference(a.value);
  const r=c?effectiveRule(s,a.source,RULES[c.cardId]):null;
  const program=a.kind==='programAbility'?r?.active:a.kind==='trigger'?s.pending.find(t=>t.source===a.source&&t.index===a.index)?.program:r;
  const value=typeof a.value==='string'&&!a.value.includes(':')&&!s.cards[a.value]?a.value:null;
  const hinted=hints(program)??(a.kind==='play'&&c?legacyHint(v,seat,a,c):null);
  if(hinted)annotate(hinted.steps,deck,{...ctx0,target:target&&!target.hidden?target:mb.main});
  const targetZone=a.target&&me.discard.some(x=>x.id===a.target)?'ownDiscard':null;
  return {id:`ui:${s.revision}:${i}`,targetZone,kind:a.kind,card:c,choiceCard,target,targetSeat:target?.hidden?other(seat):owner(a.kind==='choose'?a.value:a.target),costCard:reference(a.costCard),slot:a.slot??null,variant:a.variant??null,parameter:a.parameter??null,declare:a.declare??null,cost:a.cost??a.quote?.cost??(a.kind==='play'?c?.cost:0)??0,value,program:hinted,mandatory:Boolean(program?.mandatory)};
 });
 const selection=spec?{cost:Boolean(spec.cost),zone:spec.zone??null,destination:spec.cost??q?.destination??(d?.rule?.steps??spec.steps??[]).find(x=>x.op==='selectedMove'&&x.key===spec.key)?.destination??null}:null;
 const reactive=(me.hand??[]).filter(x=>RULES[x.cardId]?.reaction||RULES[x.cardId]?.condition==='challengeActive').map(x=>({id:x.id,cost:x.cost??0}));
 return freeze(structuredClone({seat,round:v.round,deck,reactive,challengeKit:challengeKit(s,seat),turn:v.turn,phase:v.phase,revision:v.revision,window:s.window,players:v.players,chain:v.chain,choice:v.choice?{kind:v.choice.kind,peek:v.choice.peek,selection,destination:q?.search?.destination??q?.destination??null}:null,challenge:s.challenge?{parameter:s.challenge.parameter,completed:Boolean(s.challenge.completed)}:null,actions}));
}
