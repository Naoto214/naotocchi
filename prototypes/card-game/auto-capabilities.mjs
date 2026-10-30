// Automation preflight, NOT a candidate/legality implementation. selection.mjs
// deliberately fails closed for unsupported schemas; that false must not certify
// "no response". Keep this capability envelope aligned with the reviewed runtime.
import {RULES} from './rules.mjs';
const keys=new Set(['key','cost','reveal','zone','count','min','max','filter','same','distinct','ordered','consecutive']);
const filters=new Set(['type','types','excludeType','method','rare','minStage','maxStage','species','excludeSpecies','minCost','maxCost','faceDown','attachedTo','minPower','maxPower','minWisdom','maxWisdom','sameTypeAs','notNameOf','sameEventType','sameWorldName','sameCostAs','differentTypeFrom','powerAboveWisdom','fitsEquipment','excludeEquipmentTarget','unequipped','fitOwnMain','methodsPair','excludeSource']);
const zones=new Set(['ownHand','ownDiscard','opponentDiscard','ownPrepared','opponentPrepared','ownEquipment','opponentEquipment','ownMain','opponentMain','ownCompanion','ownPartner','ownWorld','ownField','opponentField']);
const properties=new Set(['type','name','stage','species']);
const types=new Set(['main','companion','partner','world','play','item','event']);
const methods=new Set(['すぐつかう','しかける','みにつける']);
const object=x=>x&&typeof x==='object'&&!Array.isArray(x);
function check(ok){if(!ok)throw Error('Uncertified selection capability');}
function selection(spec){
 check(object(spec)&&Object.keys(spec).every(k=>keys.has(k))&&zones.has(spec.zone));
 const min=spec.count??spec.min??1,max=spec.count??spec.max??min;
 check(Number.isInteger(min)&&Number.isInteger(max)&&min>=0&&max>=min&&max<=5);
 for(const k of ['same','distinct'])check(spec[k]===undefined||properties.has(spec[k]));
 check(spec.ordered===undefined||typeof spec.ordered==='boolean');check(spec.consecutive===undefined||spec.consecutive==='stage');
 check(spec.cost===undefined||['bottom','top','hand','discard','reveal'].includes(spec.cost));
 check(spec.reveal===undefined||typeof spec.reveal==='boolean');check(typeof spec.key==='string');
 const f=spec.filter??{};check(object(f)&&Object.keys(f).every(k=>filters.has(k)));
 check(f.attachedTo===undefined||['main','person','source'].includes(f.attachedTo));
 for(const k of ['type','excludeType'])check(f[k]===undefined||types.has(f[k])||(k==='type'&&f[k]==='declared'));
 check(f.types===undefined||(Array.isArray(f.types)&&f.types.every(x=>types.has(x))));
 check(f.method===undefined||methods.has(f.method));check(f.methodsPair===undefined||(Array.isArray(f.methodsPair)&&f.methodsPair.every(x=>methods.has(x))));
 for(const k of ['rare','faceDown','sameEventType','sameWorldName','powerAboveWisdom','unequipped','fitOwnMain','excludeSource'])check(f[k]===undefined||typeof f[k]==='boolean');
 for(const k of ['species','excludeSpecies','sameTypeAs','notNameOf','sameCostAs','fitsEquipment','excludeEquipmentTarget'])check(f[k]===undefined||typeof f[k]==='string');
 check(f.differentTypeFrom===undefined||(Array.isArray(f.differentTypeFrom)&&f.differentTypeFrom.every(x=>typeof x==='string')));
 for(const stat of ['Stage','Cost','Power','Wisdom'])for(const bound of ['min','max'])check(f[bound+stat]===undefined||Number.isFinite(f[bound+stat]));
}
export function certifySelectionCapabilities(state){
 const seen=new Set();function visit(node){if(!node||typeof node!=='object'||seen.has(node))return;seen.add(node);
  if(Object.hasOwn(node,'select')){check(Array.isArray(node.select));node.select.forEach(selection);}
  Object.values(node).forEach(visit);
 }
 visit(RULES);visit(state);
}
