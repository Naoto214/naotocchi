/** Shared execution primitives for explicit source-bound effect programs. */
import {CATALOG} from './full-catalog.mjs';
import {RULES,other,card,board,owner,main,played,countBoard} from './rules.mjs';
const list=(s,a)=>{const b=board(s,a);return [b.main,b.partner,b.world,...b.companions,...b.prepared.map(e=>e.id)].filter(Boolean);};
export function targets(s,a,kind,source){const p=owner(s,a),b=board(s,a),o=owner(s,other(a));switch(kind){
 case undefined:return [null];case 'selfSource':return [source].filter(Boolean);case 'selfMain':return [b.main].filter(Boolean);case 'ownMainEquipment':return b.prepared.filter(e=>!e.faceDown&&e.target===b.main).map(e=>e.id);case 'ownPrepared':return b.prepared.map(e=>e.id);case 'ownEquipment':return b.prepared.filter(e=>!e.faceDown).map(e=>e.id);case 'ownCompanion':return b.companions;case 'ownDiscardMain':return p.discard.filter(id=>card(s,id).type==='main');case 'ownDiscard':return [...p.discard];case 'ownMain':return [b.main].filter(Boolean);case 'opponentMain':return [o.board.main].filter(Boolean);
 case 'ownWorld':return [b.world].filter(Boolean);case 'ownPartner':return [b.partner].filter(Boolean);case 'opponentPartner':return [o.board.partner].filter(Boolean);case 'eitherWorld':return [b.world,o.board.world].filter(Boolean);
 case 'opponentPrepared':return o.board.prepared.map(e=>e.id);case 'opponentTrap':return o.board.prepared.filter(e=>e.faceDown).map(e=>e.id);
 case 'opponentMainEquipment':return o.board.prepared.filter(e=>!e.faceDown&&e.target===o.board.main).map(e=>e.id);
 case 'ownDiscardWorld':return p.discard.filter(id=>card(s,id).type==='world');
 case 'ownDiscardLowMain':return p.discard.filter(id=>card(s,id).type==='main'&&card(s,id).stage<=3);
 case 'ownDiscardNonMain':return p.discard.filter(id=>card(s,id).type!=='main');
 default:throw Error('対象契約が未実装：'+kind);
}}
export function present(s,l){return !!l.target&&s.cards[l.target]?.generation===l.targetGeneration&&list(s,s.cards[l.target].owner).includes(l.target);}
export function condition(s,a,c,l={}){const p=owner(s,a),b=p.board,o=owner(s,other(a)),m=main(s,a),om=main(s,other(a));if(!c)return true;
 if(typeof c==='object'){if(c.all)return c.all.every(x=>condition(s,a,x,l));if(c.any)return c.any.some(x=>condition(s,a,x,l));if(c.not)return !condition(s,a,c.not,l);if(c.value){const v=value(s,a,c.value,l),n=typeof c.n==='object'?value(s,a,c.n.value,l):c.n;return ({eq:()=>v===n,gte:()=>v>=n,gt:()=>v>n,lt:()=>v<n,lte:()=>v<=n})[c.op]();}if(c.world)return card(s,b.world)?.id===c.world;throw Error('未対応の条件');}
 const actions=played(s,a).filter(e=>['play','item','event'].includes(e.type));
 switch(c){case 'prepared2':return b.prepared.length>=2;case 'prepared3':return b.prepared.length===3;case 'opponentPrepared3':return o.board.prepared.length===3;
 case 'fourKinds':return !!b.main&&!!b.partner&&b.companions.length>0&&b.prepared.some(e=>!e.faceDown&&card(s,e.id).type==='item');
 case 'targetPartnerDating':return present(s,l)&&b.partner===l.target&&p.relationship===0;case 'targetPartnerMarried':return present(s,l)&&b.partner===l.target&&p.relationship===4;case 'marriedSinceStart':return condition(s,a,'samePartnerSinceStart')&&p.startRelationship===4;case 'eventFaceUpPlay':return l.event?.faceUp===true&&card(s,l.event.source)?.type==='play';case 'eventAction':return ['play','item','event'].includes(card(s,l.event?.source)?.type);case 'priorFaceUpPlay':return played(s,a,'play').slice(0,-1).length>0;case 'eventFaceUpActionWithEarlierDifferentType':return l.event?.faceUp===true&&condition(s,a,'eventAction',l)&&played(s,a).slice(0,-1).some(e=>e.faceUp&&['play','item','event'].includes(e.type)&&e.type!==card(s,l.event.source).type);case 'eventActorFirstAction':case 'eventActorSecondAction':return !!l.event?.actor&&played(s,l.event.actor).filter(e=>['play','item','event'].includes(e.type)).length===(c==='eventActorFirstAction'?1:2);case 'eventActorRepeatedMethod':return !!l.event?.actor&&played(s,l.event.actor).slice(0,-1).some(e=>['play','item','event'].includes(e.type)&&e.method===l.event.method);case 'handMoved':return !!l.handMoved;case 'secondSeat':return a==='B';case 'eventQuick':return l.event?.method==='すぐつかう';case 'trapSetThisTurn':return l.event?.setSerial===s.serial;case 'playedPlayAndItem':return played(s,a,'play').length>0&&played(s,a,'item').length>0;case 'samePartnerSinceStart':return !!b.partner&&p.startPartner===b.partner&&p.startPartnerGeneration===s.cards[b.partner].generation;case 'noRelationshipProgress':return !s.history.some(e=>e.serial===s.serial&&e.actor===a&&['progress','marriage'].includes(e.kind));case 'growthDecreased':return s.history.some(e=>e.serial===s.serial&&e.actor===a&&e.kind==='growth'&&e.delta<0);case 'growthIncreased':return s.history.some(e=>e.serial===s.serial&&e.actor===a&&e.kind==='growth'&&e.delta>0);case 'changedDifferentWorld':return s.history.some(e=>e.serial===s.serial&&e.actor===a&&e.kind==='worldChange'&&e.changedName);
 case 'time2':return p.time===2;case 'time0':return p.time===0;case 'sameStage':return !!m&&!!om&&m.stage===om.stage;
 case 'printedPowerEqual':return !!m&&!!om&&m.power===om.power;case 'exactlyOnePlay':return played(s,a,'play').length===1;
 case 'ownTurn':return s.turn===a;case 'ownChallenge':return s.challenge&&s.turn===a;case 'hasMain':return !!m;
 case 'setEarlier':return owner(s,a).board.prepared.find(e=>e.id===l.source)?.setSerial<s.serial;
 case 'round5':return s.round===5;case 'hand2':return p.hand.length===2;case 'handAtMost2':return p.hand.length<=2;
 case 'personVacancy':return b.companions.length<3||!b.partner;case 'targetPresent':return present(s,l);
 case 'forestCompanions':return card(s,b.world)?.id==='W-forest'&&b.companions.length>=2;
 case 'changedWorld':return s.history.some(e=>e.serial===s.serial&&e.actor===a&&e.kind==='worldChange');
 case 'placedPersonWithBoth':return !!b.partner&&b.companions.length>0&&s.history.some(e=>e.serial===s.serial&&e.actor===a&&e.kind==='place'&&['partner','companions'].includes(e.slot));
 case 'twoTimeSkips':return s.history.filter(e=>e.serial===s.serial&&e.actor===a&&e.kind==='time_skip').length>=2;
 case 'twoPlayNames':return new Set(played(s,a,'play').map(e=>e.cardId)).size>=2;
 case 'threeDiscardStages':return new Set(p.discard.filter(id=>card(s,id).type==='main').map(id=>card(s,id).stage)).size>=3;
 case 'startWindow':return s.window==='start';case 'oneAction':return actions.length===1;case 'onlyThisAction':return actions.length===1&&actions[0].source===l.source;
 case 'secondCard':return played(s,a).length===2;
 case 'sameMainSinceStart':return !!b.main&&p.startMain===b.main&&p.startGeneration===s.cards[b.main].generation;
 case 'changedName':return l.event?.kind==='worldChange'&&l.event.changedName;
 case 'higherOpponent':return s.turn===a&&!!m&&!!om&&m.stage<om.stage;
 case 'uphillChallenge':return s.challenge&&s.turn===a&&card(s,b.world)?.id==='W-mountain'&&m&&om&&m.stage<om.stage;
 case 'baseball':return s.challenge?.parameter==='power'&&s.turn===a&&l.values&&l.values.A!==undefined&&l.values[other(a)]>=l.values[a];
 case 'companionEffect':return s.history.some(e=>e.serial===s.serial&&e.actor===a&&e.kind==='effect'&&e.type==='companion');
 case 'lostChallenge':return s.history.some(e=>e.serial===s.serial&&e.kind==='comparison'&&e.winner===other(a));
 case 'finalTime':return s.round===10||m?.stage===8;
 case 'moved':return l.moved===true;case 'searched':return l.searched>0;
 case 'movedSameWorld':return l.moved&&card(s,l.target)?.id===card(s,o.board.world)?.id;
 default:throw Error('条件契約が未実装：'+c);
}}
export function discount(s,a,action){return s.effects.filter(e=>e.kind==='discount'&&e.actor===a&&(e.action===action||action.startsWith('quick_')&&['quick','action'].includes(e.action)||['equip','trap'].includes(action)&&e.action==='action')&&(!e.partner||e.partner===board(s,a).partner&&e.generation===s.cards[e.partner].generation));}
export function payment(s,a,action,base){return Math.max(0,base-discount(s,a,action).reduce((n,e)=>n+e.n,0));}
export function consumeDiscount(s,a,action){const used=new Set(discount(s,a,action));s.effects=s.effects.filter(e=>!used.has(e));}
export function cleanup(s,timing,a){s.effects=s.effects.filter(e=>!(e.duration==='turn'&&timing==='end'||e.duration==='challenge'&&timing==='challengeEnd'||e.duration==='nextStart'&&timing==='start'&&e.actor===a));}
export function statDelta(s,id){return s.effects.filter(e=>e.kind==='stat'&&e.target===id&&e.generation===s.cards[id].generation).reduce((v,e)=>({power:v.power+e.power,wisdom:v.wisdom+e.wisdom}),{power:0,wisdom:0});}
export function triggerRows(s,event){const rows=[];for(const a of [s.turn,other(s.turn)])for(const source of list(s,a)){
 const c=card(s,source),r=RULES[c.id];if(c.type==='partner'&&!board(s,a).main)continue;
 for(const [index,t] of (r?.triggers??[]).entries())if((event.kind===t.when||(t.when==='arrival'&&['birth','time_skip','transform'].includes(event.kind)))&&(t.opponent?event.actor!==a:event.actor===a)&&(!(c.type==='main'&&['arrival','birth','time_skip','transform'].includes(t.when))||event.source===source)&&(!(t.when==='place')||event.source===source)&&(!t.once||!owner(s,a).used.includes(source+'#'+s.cards[source].generation+':'+index))&&condition(s,a,t.condition,{event,source})){
  if(targets(s,a,t.target,source).length)rows.push({actor:a,source,kind:'program',index,program:t,event,setSerial:owner(s,a).board.prepared.find(e=>e.id===source)?.setSerial});
 }
}return rows;}
export function triggerOptions(s,t){return targets(s,t.actor,t.program.target,t.source).flatMap(target=>(t.program.variants??[null]).map(variant=>({target,variant,...(target?{targetGeneration:s.cards[target].generation}:{})})));}
function matches(s,id,f,l){const c=card(s,id);if(f.method&&c.method!==f.method)return false;if(f.type&&c.type!==(f.type==='declared'?l.variant:f.type))return false;if(f.types&&!f.types.includes(c.type))return false;if(f.minStage&&c.stage<f.minStage)return false;if(f.maxStage&&c.stage>f.maxStage)return false;if(f.species&&c.species!==f.species)return false;if(f.excludeSpecies&&c.species===f.excludeSpecies)return false;if(f.rare!==undefined&&c.rare!==f.rare)return false;if(f.noSameCompanion&&board(s,l.actor).companions.some(x=>card(s,x).id===c.id))return false;if(f.notInDiscard&&owner(s,l.actor).discard.some(x=>card(s,x).id===c.id))return false;if(f.notInField&&list(s,l.actor).some(x=>card(s,x).id===c.id))return false;if(f.differentSpecies&&(!present(s,l)||c.type!=='main'||c.species===card(s,l.target).species))return false;
 if(f.higherSameSpecies||f.nextAttribute){if(!present(s,l))return false;const m=card(s,l.target);if(f.higherSameSpecies&&(c.species!==m.species||c.stage<=m.stage))return false;if(f.nextAttribute&&(c.attribute!==m.attribute||c.stage!==m.stage+1))return false;}return true;}
function remove(xs,id){const i=xs.indexOf(id);if(i<0)throw Error('効果の移動元が一致しません');xs.splice(i,1);}
function choose(s,kind,ids,l,data={}){l.applied=true;s.choice={actor:l.actor,kind,options:ids,resume:'program',link:l,...data};s.phase='choice';return true;}
function effectQueue(s,l,steps){s.program={link:l,steps:structuredClone(steps)};}
function searchChoice(s,q){const l=s.program.link,p=owner(s,l.actor);q.ids=q.ids.filter(id=>p.deck.includes(id));const eligible=q.ids.filter(id=>matches(s,id,q.filter,l));
 if(q.taken<q.max&&eligible.length){const options=eligible.map(id=>({id,label:`手札へ：${card(s,id).name}`}));if(q.taken>=q.min)options.push({id:'done',label:'手札へ加えず残りを並べる'});return choose(s,'search_take',options,l,{search:q,peek:q.ids});}
 if(q.ids.length)return choose(s,'search_order',q.ids.map(id=>({id,label:`次に山札下へ：${card(s,id).name}`})),l,{search:q,peek:q.ids});return false;
}
export function resume(s,value,h){const q=s.choice,l=s.program.link,p=owner(s,l.actor);s.choice=null;
 if(q.kind==='top_order'){remove(p.deck,value);p.deck.splice(q.placed,0,value);q.ids=q.ids.filter(x=>x!==value);q.placed++;if(q.ids.length)return choose(s,'top_order',q.ids.map(id=>({id,label:'次に山札上へ：'+card(s,id).name})),l,{ids:q.ids,placed:q.placed,peek:q.ids});}
 else if(q.kind==='choose_top'){remove(p.deck,value);p.deck.unshift(value);const ids=q.ids.filter(x=>x!==value);if(searchChoice(s,{ids,filter:{},max:0,min:0,taken:0}))return true;}
 else if(q.kind==='search_take'){if(value==='done')q.search.max=q.search.taken;else{remove(p.deck,value);p.hand.push(value);q.search.ids=q.search.ids.filter(x=>x!==value);q.search.taken++;l.searched++;if(q.search.reveal)h.log(s,`公開：${card(s,value).name}`);}if(searchChoice(s,q.search))return true;}
 else if(q.kind==='search_order'){remove(p.deck,value);p.deck.push(value);q.search.ids=q.search.ids.filter(x=>x!==value);if(searchChoice(s,q.search))return true;}
 else if(q.kind==='program_handBottom'||q.kind==='program_handTop'){remove(p.hand,value);l.handMoved=true;if(q.kind==='program_handTop')p.deck.unshift(value);else p.deck.push(value);h.log(s,`${l.actor}：手札を山札へ移動`);}
 else if(q.kind==='program_look'){if(value==='bottom'&&p.deck.length)p.deck.push(p.deck.shift());}
 else throw Error('必須選択の契約が未実装');
 return run(s,h);
}
export function begin(s,l,steps,h){effectQueue(s,l,steps);return run(s,h);}
export function run(s,h){const work=s.program,l=work.link,a=l.actor,p=owner(s,a);while(work.steps.length){const e=work.steps.shift(),to=e.to==='opponent'?other(a):a;
 switch(e.op){
 case 'if':if(condition(s,a,e.condition,l))work.steps.unshift(...structuredClone(e.steps));break;
 case 'draw':if(owner(s,to).deck.length&&e.n>0)l.applied=true;h.draw(s,to,e.n);break;case 'growth':{const before=owner(s,to).growth;h.grow(s,to,e.n);if(before!==owner(s,to).growth)l.applied=true;break;}
 case 'growthVariant':h.grow(s,l.variant==='opponent'?other(a):a,l.variant==='opponent'?-5:5);break;
 case 'coin':if(p.deck.length){const id=p.deck.shift();p.deck.push(id);h.log(s,`公開：${card(s,id).name}`);if(card(s,id).type==='main')h.grow(s,a,5);else h.draw(s,a);}break;
 case 'handBottom':case 'handTop':l.handMoved=false;if(p.hand.length)return choose(s,'program_'+e.op,p.hand.map(id=>({id,label:card(s,id).name})),l);break;
 case 'revealTopType':if(p.deck.length){l.applied=true;const id=p.deck[0];h.log(s,`公開：${card(s,id).name}`);if(card(s,id).type===e.type)h.draw(s,a);}break;
 case 'reorderTop':case 'chooseTop':{const ids=p.deck.slice(0,e.n);if(ids.length)return choose(s,e.op==='reorderTop'?'top_order':'choose_top',ids.map(id=>({id,label:'山札上へ：'+card(s,id).name})),l,{ids,placed:0,peek:ids});break;}
 case 'look':if(p.deck.length)return choose(s,'program_look',[{id:'top',label:'一番上に戻す'},{id:'bottom',label:'一番下に置く'}],l,{peek:[p.deck[0]]});break;
 case 'search':{l.searched=0;const n=e.n==='submarine'?3+Number(l.variant)*2:e.n,ids=p.deck.slice(0,n);if(e.revealInspected)h.log(s,`公開：${ids.map(id=>card(s,id).name).join(' / ')}`);if(searchChoice(s,{ids,filter:e.filter??{},max:e.max,min:e.min,taken:0,reveal:e.reveal}))return true;break;}
 case 'deepseaFishing':{const ids=p.deck.splice(0,3),mains=ids.filter(id=>card(s,id).type==='main');h.log(s,`公開：${ids.map(id=>card(s,id).name).join(' / ')}`);p.hand.push(...mains);p.discard.push(...ids.filter(id=>!mains.includes(id)));if(!mains.length)h.grow(s,a,-5);break;}
 case 'stat':case 'battleStat':case 'reversi':case 'chosenStat':if(present(s,l)){let power=e.power??0,wisdom=e.wisdom??0;if(e.op==='chosenStat'){if(l.variant==='power')power=e.n;else wisdom=e.n;}if(e.op==='battleStat'){if(!s.challenge)break;if(s.challenge.parameter==='power')power=e.n;else wisdom=e.n;}if(e.op==='reversi')wisdom=Math.max(0,card(s,l.target).power-h.stats(s,s.cards[l.target].owner).power);l.applied=true;s.effects.push({kind:'stat',actor:a,target:l.target,generation:l.targetGeneration,power,wisdom,duration:e.duration??'challenge'});}break;
 case 'discount':l.applied=true;s.effects.push({kind:'discount',actor:a,action:e.action,n:e.n,duration:'turn',...(e.targetPartner?{partner:board(s,a).partner,generation:s.cards[board(s,a).partner]?.generation}:{})});break;
 case 'schedule':l.applied=true;s.scheduled.push({actor:a,timing:e.timing,due:e.timing==='start'?s.serial+(s.turn===a?2:1):s.serial,link:structuredClone(l),steps:structuredClone(e.steps)});break;
 case 'move':{l.moved=false;const own=s.cards[l.target]?.owner;if(!own)break;const q=owner(s,own);if(q.discard.includes(l.target)&&s.cards[l.target].generation===l.targetGeneration){remove(q.discard,l.target);l.moved=true;}else if(present(s,l)){h.discardField(s,own,l.target);remove(q.discard,l.target);l.moved=true;}if(l.moved){l.applied=true;if(e.destination==='bottom')q.deck.push(l.target);else if(e.destination==='top')q.deck.unshift(l.target);else q[e.destination].push(l.target);}break;}
 default:throw Error('効果handlerが未実装：'+e.op);
 }}if(l.applied&&l.ability)s.history.push({serial:s.serial,kind:'effect',actor:a,source:l.source,type:card(s,l.source).type});s.program=null;return false;}

function value(s,a,key,l){const p=owner(s,a),b=p.board,m=main(s,a);const values={hand:p.hand.length,opponentHand:owner(s,other(a)).hand.length,prepared:b.prepared.length,preparedHidden:b.prepared.filter(e=>e.faceDown).length,cicadaTimeSkips:s.history.filter(e=>e.serial===s.serial&&e.actor===a&&e.kind==='time_skip'&&card(s,e.source)?.species==='M-cicada').length,companions:b.companions.length,time:p.time,actions:played(s,a).filter(e=>['play','item','event'].includes(e.type)).length,plays:played(s,a,'play').length,otherBoard:countBoard(s,a)-(b.main?1:0),fieldKinds:new Set(list(s,a).filter(id=>!b.prepared.some(e=>e.id===id&&e.faceDown)&&card(s,id).type!=='main').map(id=>card(s,id).type)).size,discardNonMain:p.discard.filter(id=>card(s,id).type!=='main').length,discardWorld:p.discard.filter(id=>card(s,id).type==='world').length,world:Number(!!b.world),partner:Number(!!b.partner),relationship:p.relationship??-1,growth:p.growth,stage:m?.stage??0,discardCount:p.discard.length,discardWorldNames:new Set(p.discard.filter(id=>card(s,id).type==='world').map(id=>card(s,id).id)).size,opponentGrowth:owner(s,other(a)).growth,equipment:b.prepared.filter(e=>!e.faceDown&&e.target===b.main).length,personWorldKinds:Number(b.companions.length>0)+Number(!!b.partner)+Number(!!b.world),fieldDuplicateKind:Number(list(s,a).filter(id=>card(s,id).type!=='main'&&!b.prepared.some(e=>e.id===id&&e.faceDown)).some((id,i,ids)=>ids.slice(0,i).some(other=>card(s,other).type===card(s,id).type))),discardPlay:p.discard.filter(id=>card(s,id).type==='play').length,discardDifferentWorld:p.discard.filter(id=>card(s,id).type==='world'&&card(s,id).id!==card(s,b.world)?.id).length,selfChallengeUsed:Number(s.history.some(e=>e.serial===s.serial&&e.actor===a&&e.kind==='challenge'&&e.source===b.main&&e.generation===s.cards[b.main]?.generation)),challengeUsed:Number(p.challengeUsed),sameMainSinceStart:Number(condition(s,a,'sameMainSinceStart')),sameWorldSinceStart:Number(!!b.world&&p.startWorld===b.world&&p.startWorldGeneration===s.cards[b.world].generation),changedWorld:Number(condition(s,a,'changedWorld')),enteredByTimeSkip:Number(s.history.some(e=>e.serial===s.serial&&e.kind==='time_skip'&&e.source===b.main&&e.generation===s.cards[b.main]?.generation))};if(!(key in values))throw Error('未対応の参照値：'+key);return values[key];}
export function passiveDelta(s,a){let power=0,wisdom=0;for(const source of list(s,a)){if(card(s,source).type==='partner'&&!board(s,a).main)continue;const data=RULES[card(s,source).id]?.passive;if(data&&typeof data==='object')for(const r of Array.isArray(data)?data:[data])if(condition(s,a,r.condition,{source})){power+=r.power??0;wisdom+=r.wisdom??0;}}return {power,wisdom};}
