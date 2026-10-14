/** Activated-text snapshots, never a copy of another instance's used state. */
const clone=value=>structuredClone(value);
const onField=(s,source)=>Object.values(s.players??{}).some(p=>{const b=p.board;return b&&[b.main,b.partner,b.world,...(b.companions??[]),...(b.prepared??[]).map(e=>e.id)].includes(source);});
export const COPY_RULES={'C-monkey':{mode:'companion',triggers:[{when:'activation',condition:'eventOwnMainAbility',once:true,target:'activationLink',steps:[{op:'copyAbility'}]}]}};
// These descriptors encode self-reference; ownMain remains an owned-main target.
function bind(value){
 if(Array.isArray(value))return value.map(bind);
 if(!value||typeof value!=='object')return value;
 const out={};for(const [key,v]of Object.entries(value))out[key]=key==='target'&&v==='selfMain'?'selfSource':key==='attachedTo'&&v==='main'?'source':bind(v);
 return out;
}
export function handle(s,l,e,h){
 if(e.op!=='copyAbility')return null;
 const event=l.event;
 // Historical activation contract remains authoritative even after negation.
 if(!event?.contract||!Array.isArray(event.contract.steps)||event.ability!==true||event.actor!==l.actor||!event.sourceCardId?.startsWith('M-'))throw Error('コピー対象の発動時契約がありません');
 if(!s.cards[l.source]||!onField(s,l.source)||s.cards[l.source].generation!==l.sourceGeneration)return {waiting:false};
 const copyId=`copy:${l.source}#${l.sourceGeneration}:${s.serial}:${(s.copySequence=(s.copySequence??0)+1)}`;
 // docs/card-game/67: この名前 refers to the copier; explicit literal names remain unchanged.
 const contract=bind(clone(event.contract));
 Object.assign(contract,{copyId,limitKey:copyId,sourceBound:true,copiedFromCardId:event.sourceCardId,copiedFromSource:event.source,copyEventLinkId:event.linkId,copiedAtSerial:s.serial,copiedAtHistoryIndex:(s.history??[]).length,onceNameCardId:s.cards[l.source].cardId});
 s.effects??=[];s.effects.push({kind:'copiedAbility',actor:l.actor,source:l.source,generation:l.sourceGeneration,contract,copyId,duration:'turn',serial:s.serial,originalContract:clone(event.contract)});
 l.applied=true;h?.log?.(s,'発動時の能力本文をコピー');return {waiting:false};
}
export function effectiveRule(s,source,base={}){
 if(!onField(s,source))return base;
 const copy=(s.effects??[]).filter(e=>e.kind==='copiedAbility'&&e.source===source&&e.generation===s.cards[source]?.generation&&e.serial===s.serial).at(-1);
 if(!copy)return base;
 const contract=clone(copy.contract),result={...base};
 if(contract.when)result.triggers=[...(base.triggers??[]),contract];
 else result.active=contract;
 return result;
}
/** Hook at trigger enumeration; copied triggers never consume the acquisition event. */
export function acceptsCopyEvent(contract,event,historyIndex){
 return !contract.copyId||(event.linkId!==contract.copyEventLinkId&&historyIndex>=contract.copiedAtHistoryIndex);
}
