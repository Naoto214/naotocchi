import {CATALOG} from './full-catalog.mjs';
import {lifetime} from './event-effects.mjs';
const other=a=>a==='A'?'B':'A',card=(s,id)=>CATALOG[s.cards[id]?.cardId];
function choice(s,l,kind,options,data={}){s.choice={actor:l.actor,kind:'advanced_'+kind,options,resume:'program',link:l,...data};s.phase='choice';return {waiting:true};}
export function handle(s,l,e,h,api){const a=l.actor,p=s.players[a],b=p.board;
 switch(e.op){
 case 'lock':s.effects.push({kind:'actionLock',actor:a,action:e.action,...lifetime(s,a,e.duration),...(e.source?{source:l.source,generation:l.sourceGeneration}:{})});l.applied=true;break;
 case 'reverseComparison':if(s.challenge&&!s.challenge.ended&&!s.challenge.aborted){s.challenge.reverse=true;l.applied=true;}break;
 case 'protect':{if(e.linkOnly&&!s.chain.some(x=>x.uid===l.event?.linkId&&!x.negated))break;if(!e.scope&&!api.present(s,l))break;s.effects.push({kind:'protection',actor:a,source:l.source,target:l.target,generation:l.targetGeneration,scope:e.scope,to:e.to,replace:e.replace,remaining:e.count??null,linkOnly:e.linkOnly?l.event.linkId:null,...lifetime(s,a,e.duration),id:`protect:${s.revision}:${s.effects.length}`});l.applied=true;break;}
 case 'prevent':s.effects.push({kind:'prevention',actor:a,source:l.source,n:e.n,drawFully:e.drawFully,...lifetime(s,a,e.duration),id:`prevent:${s.revision}:${s.effects.length}`});l.applied=true;break;
 case 'eventTypeDiscount':s.program.steps.unshift({op:'discount',action:'quick_'+card(s,l.event.source).type,n:1});break;
 case 'eventMethodDiscount':s.program.steps.unshift({op:'discount',action:'action',n:e.n??1,to:e.to,...(e.different?{excludedMethod:card(s,l.event.source).method}:{method:card(s,l.event.source).method})});break;
 case 'declareType':return choice(s,l,'type',['main','companion','partner','world','play','item','event'].map(id=>({id,label:({main:'メイン',companion:'なかま',partner:'こいびと',world:'セカイ',play:'あそび',item:'あいてむ',event:'できごと'})[id]})),{steps:e.steps});
 case 'declaredTop':if(p.deck.length){const id=p.deck[0];h.log(s,'公開：'+card(s,id).name);l.applied=true;if(card(s,id).type===l.declaredType)h.draw(s,a);else p.deck.push(p.deck.shift());}break;
 case 'lowerStat':if(api.present(s,l)){const stats=h.stats(s,s.cards[l.target].owner);if(!stats)break;const lower=stats.power===stats.wisdom?null:stats.power<stats.wisdom?'power':'wisdom';s.program.steps.unshift({op:'chosenStat',n:e.n,duration:'challenge',...(lower?{chosenParameter:lower}:{forceChoice:true})});}break;
 case 'setFromHand':if(api.present(s,l)&&b.main===l.target){const target=card(s,l.target),ids=p.hand.filter(id=>{const c=card(s,id);return c.type==='main'&&(!e.excludeSpecies||c.species!==e.excludeSpecies)&&(e.stageDelta===undefined||c.species===target.species&&c.stage===target.stage+e.stageDelta);});if(ids.length)return choice(s,l,'set_stat',ids.map(id=>({id,label:'公開：'+card(s,id).name})));}break;
 case 'statSet':if(api.present(s,l)&&card(s,l.target)?.type==='main'){s.effects.push({kind:'statSet',actor:a,target:l.target,generation:l.targetGeneration,power:e.power,wisdom:e.wisdom,...lifetime(s,a,'turn')});l.applied=true;}break;
 case 'memoryPair':{const refs=l.selection?.[e.key]??[];if(refs.length===2&&refs.every(r=>p.discard.includes(r.id)&&s.cards[r.id]?.generation===r.generation))return choice(s,l,'memory',refs.map(r=>({id:r.id,label:'山札下へ：'+card(s,r.id).name})),{refs});break;}
 default:return null;
 }return {waiting:false};
}
export function resume(s,value,h){const q=s.choice,l=q.link;s.choice=null;
 if(q.kind==='advanced_type'){l.declaredType=value;l.applied=true;s.program.steps.unshift(...structuredClone(q.steps));}
 else if(q.kind==='advanced_set_stat'){const c=card(s,value);h.log(s,'公開：'+c.name);l.applied=true;s.program.steps.unshift({op:'statSet',power:c.power,wisdom:c.wisdom});}
 else if(q.kind==='advanced_memory'){const chosen=q.refs.find(r=>r.id===value),otherRef=q.refs.find(r=>r.id!==value);s.program.steps.unshift({op:'bindTarget',ref:chosen},{op:'move',destination:'bottom'},{op:'if',condition:'moved',steps:[{op:'bindTarget',ref:otherRef},{op:'move',destination:'hand'}]});}
 else throw Error('未対応の追加選択');return false;
}
