/** Sequential physical-card selection. Existence uses grouped capacities, never combinations. */
import {CATALOG} from './full-catalog.mjs';
const specKeys=new Set(['zone','count','min','max','filter','same','distinct','ordered']);
const filterKeys=new Set(['type','types','excludeType','method','rare','minStage','maxStage','species','excludeSpecies','minCost','maxCost','faceDown','attachedTo','minPower','maxPower','minWisdom','maxWisdom','sameTypeAs','notNameOf']);
const properties=new Set(['type','name','stage','species']);
const definition=(s,id)=>CATALOG[s.cards?.[id]?.cardId];
const value=(c,key)=>key==='name'?c.id:c[key];
function prepare(s,actor,spec,ctx={},selected=[]){
 if(!spec||Object.keys(spec).some(k=>!specKeys.has(k))||!Array.isArray(selected)||new Set(selected).size!==selected.length)return null;
 if((spec.same!==undefined&&!properties.has(spec.same))||(spec.distinct!==undefined&&!properties.has(spec.distinct))||(spec.ordered!==undefined&&typeof spec.ordered!=='boolean'))return null;
 const min=spec.count??spec.min??1,max=spec.count??spec.max??min;
 if(!Number.isInteger(min)||!Number.isInteger(max)||min<0||max<min||max>5||selected.length>max)return null;
 const f=spec.filter??{};if(typeof f!=='object'||Array.isArray(f)||Object.keys(f).some(k=>!filterKeys.has(k))||f.attachedTo!==undefined&&f.attachedTo!=='main'||f.types!==undefined&&!Array.isArray(f.types))return null;
 const p=s.players?.[actor],o=s.players?.[actor==='A'?'B':'A'];if(!p||!o)return null;
 const b=p.board,ob=o.board,field=b=>[b.main,b.partner,b.world,...b.companions,...b.prepared.map(e=>e.id)].filter(Boolean);
 const zones={ownHand:p.hand,ownDiscard:p.discard,opponentDiscard:o.discard,ownPrepared:b.prepared.map(e=>e.id),opponentPrepared:ob.prepared.map(e=>e.id),ownEquipment:b.prepared.filter(e=>!e.faceDown).map(e=>e.id),opponentEquipment:ob.prepared.filter(e=>!e.faceDown).map(e=>e.id),ownMain:[b.main].filter(Boolean),opponentMain:[ob.main].filter(Boolean),ownCompanion:b.companions,ownPartner:[b.partner].filter(Boolean),ownWorld:[b.world].filter(Boolean),ownField:field(b),opponentField:field(ob)};
 if(!Object.hasOwn(zones,spec.zone))return null;
 let sameType;if(f.sameTypeAs!==undefined){const ref=ctx.selection?.[f.sameTypeAs];const id=Array.isArray(ref)?ref[0]:ref;sameType=definition(s,id)?.type;if(!sameType)return null;}
 const notName=f.notNameOf!==undefined?definition(s,f.notNameOf)?.id:null;if(f.notNameOf!==undefined&&!notName)return null;
 const pool=[...new Set(zones[spec.zone])].filter(id=>{
  const c=definition(s,id);if(!c||spec.zone==='ownHand'&&id===ctx.source)return false;
  if(spec.same&&value(c,spec.same)===undefined||spec.distinct&&value(c,spec.distinct)===undefined)return false;
  const type=f.type==='declared'?ctx.variant:f.type;if(f.type==='declared'&&!type)return false;
  if(type!==undefined&&c.type!==type||f.types&&!f.types.includes(c.type)||f.excludeType!==undefined&&c.type===f.excludeType||sameType&&c.type!==sameType||notName&&c.id===notName)return false;
  for(const k of ['method','rare','species'])if(f[k]!==undefined&&c[k]!==f[k])return false;
  if(f.excludeSpecies!==undefined&&c.species===f.excludeSpecies)return false;
  for(const stat of ['Stage','Cost','Power','Wisdom'])for(const bound of ['min','max'])if(f[bound+stat]!==undefined){const n=c[stat.toLowerCase()];if(!Number.isFinite(f[bound+stat])||!Number.isFinite(n)||(bound==='min'?n<f[bound+stat]:n>f[bound+stat]))return false;}
  const e=[...b.prepared,...ob.prepared].find(e=>e.id===id);
  if(f.faceDown!==undefined&&Boolean(e?.faceDown)!==f.faceDown)return false;
  if(f.attachedTo==='main'&&(!e||e.faceDown||![b.main,ob.main].filter(Boolean).includes(e.target)))return false;
  return true;
 });
 if(selected.some(id=>!pool.includes(id)))return null;
 if(spec.same&&new Set(selected.map(id=>value(definition(s,id),spec.same))).size>1)return null;
 if(spec.distinct&&new Set(selected.map(id=>value(definition(s,id),spec.distinct))).size!==selected.length)return null;
 return {pool,min,max,spec,selected};
}
function exists(s,p){
 if(!p)return false;if(p.selected.length>=p.min)return true;
 const {spec,selected}=p,used=new Set(selected),distinct=new Set(selected.map(id=>value(definition(s,id),spec.distinct)));
 const groups=new Map();for(const id of p.pool){if(used.has(id))continue;const c=definition(s,id);if(spec.distinct&&distinct.has(value(c,spec.distinct)))continue;const key=spec.same?value(c,spec.same):null;if(spec.same&&selected.length&&key!==value(definition(s,selected[0]),spec.same))continue;if(!groups.has(key))groups.set(key,[]);groups.get(key).push(c);}
 return [...groups.values()].some(cards=>(spec.distinct?new Set(cards.map(c=>value(c,spec.distinct))).size:cards.length)>=p.min-selected.length);
}
export function feasible(s,actor,spec,ctx,selected=[]){return exists(s,prepare(s,actor,spec,ctx,selected));}
export function complete(s,actor,spec,ctx,selected=[]){const p=prepare(s,actor,spec,ctx,selected);return !!p&&selected.length>=p.min;}
export function candidates(s,actor,spec,ctx,selected=[]){const p=prepare(s,actor,spec,ctx,selected);if(!p||selected.length>=p.max)return [];return p.pool.filter(id=>!selected.includes(id)&&feasible(s,actor,spec,ctx,[...selected,id]));}
