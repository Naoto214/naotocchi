import {CATALOG} from './full-catalog.mjs';
const other=a=>a==='A'?'B':'A',card=(s,id)=>CATALOG[s.cards[id]?.cardId];
export function lateCondition(s,a,key,l){
 const p=s.players[a],b=p.board,o=s.players[other(a)],ev=l.event??{},actions=s.history.filter(e=>e.kind==='play'&&e.serial===s.serial&&e.actor===a&&['play','item','event'].includes(e.type)),stats=l.stats??ev.stats??{};
 const nonMainMove=ev.kind==='departure'&&ev.slot!=='main',effectMove=nonMainMove&&ev.cause==='effect'&&['hand','discard'].includes(ev.destination);
 switch(key){
 case 'departedTransition':return ev.slot==='main'&&ev.destination==='discard'&&['time_skip','transform'].includes(ev.transition);
 case 'departedTransform':return ev.slot==='main'&&ev.destination==='discard'&&ev.transition==='transform';
 case 'departedTimeSkip':return ev.slot==='main'&&ev.destination==='discard'&&ev.transition==='time_skip';
 case 'nonMainEffectMove':return effectMove;
 case 'nonMainHandMove':return nonMainMove&&ev.destination==='hand';
 case 'nonMainOpponentDiscard':return effectMove&&ev.destination==='discard'&&ev.effectActor===other(a);
 case 'ownPartnerOpponentMove':return ev.source===l.source&&ev.slot==='partner'&&ev.relationshipEnded&&ev.effectActor===other(a)&&['hand','discard'].includes(ev.destination)&&!!b.main;
 case 'attachedToSource':return ev.target===l.source&&ev.targetGeneration===s.cards[l.source]?.generation;
 case 'sourceAttachmentDiscard':return ev.slot==='prepared'&&ev.destination==='discard'&&ev.attachment?.target===l.source&&ev.attachment.targetGeneration===s.cards[l.source]?.generation;
 case 'sourceStatReduced':return ev.target===l.source&&ev.effectActor===other(a);
 case 'equippedMainStatReduced':{const eq=b.prepared.find(e=>e.id===l.source);return !!eq&&eq.target===ev.target&&eq.targetGeneration===ev.targetGeneration&&ev.effectActor===other(a);}
 case 'attachmentSinceStart':return b.prepared.some(e=>e.target===l.source&&p.startAttachments?.some(x=>x.id===e.id&&x.generation===s.cards[e.id].generation&&x.target===e.target&&x.targetGeneration===e.targetGeneration&&x.revision===(e.attachedAt??0)));
 case 'sourceSinceStart':return p.startField?.some(x=>x.id===l.source&&x.generation===s.cards[l.source]?.generation);
 case 'noRoundChallenge':return !s.history.some(e=>e.kind==='challenge'&&e.round===s.round);
 case 'opponentPriorRoundChallenge':return s.history.some(e=>e.kind==='challenge'&&e.actor===other(a)&&e.round===s.round);
 case 'eventItemFaceUp':return ev.faceUp===true&&card(s,ev.source)?.type==='item';
 case 'eventCostOne':return card(s,ev.source)?.cost===1;
 case 'priorTwoItems':return actions.length>=2&&actions.slice(-2).every(e=>e.type==='item'&&e.faceUp);
 case 'priorTwoPlays':return actions.filter(e=>e.type==='play'&&e.faceUp).length>=2;
 case 'priorTwoFaceUpActions':return actions.filter(e=>e.faceUp).length>=2;
 case 'bothPlayedInChallenge':return !!s.challenge&&['A','B'].every(who=>s.history.some(e=>e.kind==='play'&&e.type==='play'&&e.faceUp&&e.actor===who&&e.challenge===s.challenge.id));
 case 'specialTripWorld':return ['W-star_stop','W-memory_lake'].includes(card(s,b.world)?.id)&&s.history.some(e=>e.kind==='worldChange'&&e.serial===s.serial&&e.actor===a&&e.source===b.world&&e.generation===s.cards[b.world].generation&&e.normal&&e.changedName);
 case 'eventWorldNormal':return ev.slot==='world'&&ev.normal===true;
 case 'eventPersonPlaced':return ['companions','partner'].includes(ev.slot);
 case 'eventOwnMainAbility':return ev.ability===true&&ev.actor===a&&ev.sourceWasMain===true;
 case 'eventMainAbility':return ev.ability===true&&ev.source===b.main;
 case 'targetSelectedApplied':return ev.source===l.target&&ev.generation===l.targetGeneration&&ev.activationRevision>=l.createdRevision;
 case 'selectedPreparedPresent':return (l.selection?.prepared??[]).every(x=>s.cards[x.id]?.generation===x.generation&&b.prepared.some(e=>e.id===x.id));
 case 'targetPreparedPresent':return s.cards[l.target]?.generation===l.targetGeneration&&b.prepared.some(e=>e.id===l.target);
 case 'phoenixSevenBefore':return card(s,ev.previousMain)?.id==='M-phoenix-07';
 case 'eventCompleted':return ev.completed===true;
 case 'eventTargetsSource':return ev.fieldTargets?.includes(l.source);
 case 'eventOnlySource':return ev.fieldTargets?.length===1&&ev.fieldTargets[0]===l.source;
 case 'eventOnlyOtherOwn':return ev.fieldTargets?.length===1&&ev.fieldTargets[0]!==l.source&&s.cards[ev.fieldTargets[0]]?.owner===a;
 case 'eventSecondQuick':return ev.ability===false&&card(s,ev.source)?.method==='すぐつかう'&&s.history.filter(e=>e.kind==='play'&&e.serial===s.serial&&e.actor===ev.actor&&e.method==='すぐつかう').length>=2;
 case 'eventRemovesOwnPrepared':return ev.fieldTargets?.some(id=>b.prepared.some(e=>e.id===id))&&ev.destinations?.some(x=>['discard','hand'].includes(x));
 case 'eventRemovesMain':return ev.fieldTargets?.some(id=>card(s,id)?.type==='main')&&ev.destinations?.includes('discard');
 case 'challengeActive':return !!s.challenge&&!s.challenge.ended;
 case 'challengePower':return s.challenge?.parameter==='power';
 case 'challengeWisdom':return s.challenge?.parameter==='wisdom';
 case 'mainPowerLower':return stats[a]?.power<stats[other(a)]?.power;
 case 'mainWisdomLower':return stats[a]?.wisdom<stats[other(a)]?.wisdom;
 case 'sourcePowerAtMostOne':return stats[a]?.power<=1;
 case 'sourceInDiscard':return p.discard.includes(l.source);
 case 'variantSupportPresent':return l.variant==='companion'?b.companions.length>0:['partner','world'].includes(l.variant)&&!!b[l.variant];
 default:return 'unhandled';
 }
}
