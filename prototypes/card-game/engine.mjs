import {effectiveRule} from './ability-copy.mjs';
import * as costs from './costs.mjs';
import * as eventEffects from './event-effects.mjs';
/** Human-only, explicitly registered card runtime. No population runner or policy selection.
 * Sources: docs/card-game/{01,02,06,64,65}, cards.mjs and Python parity fixtures.
 * Commands are atomic; save files replay commands instead of trusting state.
 */
import {CARDS as BASE_CARDS} from './cards.mjs';
import {CATALOG as CARDS} from './full-catalog.mjs';
import * as legacy from './legacy-engine.mjs';
import {RULES, supported} from './rules.mjs';
import * as fx from './effects.mjs';
import * as selections from './selection.mjs';
export {CARDS};
export const VERSION='hotseat-4';
/** hotseat-2 = ぴょんぴょんジャンプ改善前（次のときおくりで1枚、その次のときおくりで+5）。旧保存はその版のまま再生する。
 * hotseat-3 は PR #449（こいびと修正）が使う版名のため、この変更では使わない。 */
export const RULE_VERSIONS=Object.freeze(['hotseat-2',VERSION]);
export const DEFAULT_DECK=Object.values(BASE_CARDS).flatMap(c=>Array(c.rare?1:c.id==='G-area-claim'?2:3).fill(c.id));
export function validateDeck(deck){if(!Array.isArray(deck)||deck.length!==40)throw Error('デッキは40枚必要です');const counts={};for(const id of deck){if(!CARDS[id]||!supported(id))throw Error('未対応カードです：'+id);counts[id]=(counts[id]??0)+1;if(counts[id]>(CARDS[id].rare?1:3))throw Error('同名上限を超えています：'+id);}return true;}
export {supported};
const helpers={draw,grow,log,stats,discardField,emit:enqueueTriggers};
const clone=x=>structuredClone(x),other=a=>a==='A'?'B':'A';
const types=['main','companion','partner','world','play','item','event'];
export const TYPE_NAMES={main:'メイン',companion:'なかま',partner:'こいびと',world:'セカイ',play:'あそび',item:'あいてむ',event:'できごと'};
const card=(s,id)=>CARDS[s.cards[id].cardId];
const title=(s,id)=>id?card(s,id).name:'たまご';
function random(seed){let n=seed>>>0;return ()=>{n+=0x6D2B79F5;let t=n;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return ((t^t>>>14)>>>0)/4294967296;};}
export function createGame(seed=1,decks={A:DEFAULT_DECK,B:DEFAULT_DECK},version=VERSION){
 if(!RULE_VERSIONS.includes(version))throw Error('対戦の版が不正です');
 for(const a of ['A','B'])validateDeck(decks[a]);
 if(!Number.isSafeInteger(seed)||seed<0||seed>0xffffffff)throw Error('開始seedが不正です');
 const s={version,seed,revision:0,commands:[],decks:clone(decks),effects:[],scheduled:[],history:[],cards:{},players:{},round:1,turn:'A',serial:1,phase:'normal',priority:'A',chain:[],pending:[],choice:null,window:'normal',passes:0,result:null,log:[],challenge:null};
 const rng=random(seed);
 for(const a of ['A','B']){
  const deck=[],counts={};for(const cardId of decks[a]){const i=counts[cardId]=(counts[cardId]??0)+1,id=`${a}:${cardId}:${i}`;s.cards[id]={cardId,owner:a,generation:0};deck.push(id);}
  if(deck.length!==40)throw Error('40枚デッキではありません');
  for(let i=deck.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[deck[i],deck[j]]=[deck[j],deck[i]];}
  s.players[a]={hand:deck.splice(0,5),deck,discard:[],board:{main:null,partner:null,world:null,companions:[],prepared:[]},time:0,growth:20,relationship:null,personUsed:false,relationshipUsed:false,challengeUsed:false,used:[],reached:null};
 }
 beginTurn(s);validate(s);return s;
}
export function actor(s){if(s.version===legacy.VERSION)return legacy.actor(s);return s.phase==='finished'?null:s.choice?.actor??(s.phase==='trigger'?s.pending[0].actor:s.phase==='normal'?s.turn:s.priority);}
function log(s,message){s.log.push(message);}
function draw(s,a,n=1){const p=s.players[a];for(let i=0;i<n&&p.deck.length;i++)p.hand.push(p.deck.shift());}
function grow(s,a,n){const p=s.players[a];const old=p.growth;p.growth=Math.max(0,Math.min(100,old+n));if(old!==p.growth)s.history.push({serial:s.serial,actor:a,kind:'growth',delta:p.growth-old});if(p.growth<100)p.reached=null;else if(old<100)p.reached=s.serial+(a===s.turn?1:2);}
function remove(xs,id){const i=xs.indexOf(id);if(i<0)throw Error('カードの所在が一致しません');xs.splice(i,1);}
function enter(s,id){s.cards[id].generation++;}
function token(s,id){return `${id}#${s.cards[id].generation}`;}
function discardField(s,a,id,context={}){const p=s.players[a],b=p.board;const slot=['main','partner','world'].find(k=>b[k]===id)??(b.companions.includes(id)?'companions':'prepared'),attachment=b.prepared.find(e=>e.id===id),generation=s.cards[id].generation;const related=slot==='partner'&&p.relationship!==null;if(s.challenge&&!s.challenge.completed&&s.challenge.participants?.[a]===id&&s.challenge.generations?.[a]===generation)s.challenge.aborted=true;
 for(const key of ['main','partner','world'])if(b[key]===id){b[key]=null;if(key==='partner'){p.relationship=null;grow(s,a,-10);}}
 b.companions=b.companions.filter(x=>x!==id);b.prepared=b.prepared.filter(x=>x.id!==id);
 p.discard.push(id);
 for(const e of [...b.prepared])if(e.target===id)discardField(s,a,e.id,{cause:'cleanup'});
 const event={kind:'departure',actor:a,source:id,generation,slot,attachment,relationshipEnded:related,destination:context.destination??'discard',cause:context.cause??'cost',effectActor:context.effectActor,transition:context.transition};if(!context.defer)enqueueTriggers(s,event);return event;
}
function window(s,kind='normal',priority=s.turn){s.phase='response';s.window=kind;s.priority=priority;s.passes=0;}
function requestChoice(s,a,kind,options,resume){if(!options.length)return false;s.choice={actor:a,kind,options,resume};s.phase='choice';return true;}
function triggers(s,rows,kind){window(s,kind);s.pending=rows;if(rows.length)s.phase='trigger';}
function beginTurn(s){
 const p=s.players[s.turn];s.players.A.used=[];s.players.B.used=[];p.time=s.round;p.personUsed=false;p.relationshipUsed=false;p.challengeUsed=false;
 fx.cleanup(s,'start',s.turn);p.startField=[p.board.main,p.board.partner,p.board.world,...p.board.companions,...p.board.prepared.map(e=>e.id)].filter(Boolean).map(id=>({id,generation:s.cards[id].generation}));p.startAttachments=p.board.prepared.filter(e=>!e.faceDown).map(e=>({...e,generation:s.cards[e.id].generation,revision:e.attachedAt??0}));p.startRelationship=p.relationship;p.startPartner=p.board.partner;p.startPartnerGeneration=p.board.partner?s.cards[p.board.partner].generation:null;p.startWorld=p.board.world;p.startWorldGeneration=p.board.world?s.cards[p.board.world].generation:null;p.startMain=p.board.main;p.startGeneration=p.board.main?s.cards[p.board.main].generation:null;
 draw(s,s.turn);log(s,`R${s.round} ${s.turn}のターン開始`);
 if(!p.board.main){draw(s,s.turn);if(requestChoice(s,s.turn,'egg_bottom',p.hand.map(id=>({id,label:title(s,id)})),'start'))return;}
 startWindow(s);
}
function startWindow(s){if(startBoundary(s,'start'))return;finishStart(s);}
function finishStart(s){const a=s.turn,p=s.players[a];triggers(s,p.hand.length<=2?p.board.prepared.filter(e=>card(s,e.id).id==='I-bowtie').map(e=>({actor:a,source:e.id,kind:'bowtie'})):[],'start');enqueueTriggers(s,{kind:'start',actor:a});}
function endWindow(s){if(startBoundary(s,'end'))return;finishEnd(s);}
function finishEnd(s){const a=s.turn,p=s.players[a];triggers(s,!p.challengeUsed&&p.time>=2?p.board.prepared.filter(e=>card(s,e.id).id==='I-sleepboost1').map(e=>({actor:a,source:e.id,kind:'sleep'})):[],'end');enqueueTriggers(s,{kind:'end',actor:a});}
function endTurn(s){
 if(s.round<10){const winner=['A','B'].find(a=>s.players[a].growth===100&&s.players[a].reached!==null&&s.players[a].reached<=s.serial&&s.turn!==a);if(winner){finish(s,winner,'100維持');return;}}
 if(s.round===10&&s.turn==='B'){const a=s.players.A.growth,b=s.players.B.growth;finish(s,a===b?null:a>b?'A':'B','R10最終比較');return;}
 fx.cleanup(s,'end',s.turn);if(s.turn==='B')s.round++;s.turn=other(s.turn);s.serial++;beginTurn(s);
}
function finish(s,winner,reason){s.phase='finished';s.result={winner,reason,growth:{A:s.players.A.growth,B:s.players.B.growth}};log(s,winner?`${winner}の勝利`:'引き分け');}
export function stats(s,a){const p=s.players[a],b=p.board;if(!b.main)return null;const c=card(s,b.main);let power=c.power,wisdom=c.wisdom;
 if(b.world&&card(s,b.world).id==='W-deepsea'&&p.hand.length<=2){power++;wisdom++;}
 const o=s.players[other(a)].board;if(b.world&&o.world){for(const id of b.companions)if(card(s,id).id==='C-chameleon'){if(card(s,b.world).id===card(s,o.world).id)wisdom++;else power++;}}
 if(b.world&&card(s,b.world).id==='W-forest'&&b.companions.length>=2)wisdom++;
 const passive=fx.passiveDelta(s,a);power+=passive.power;wisdom+=passive.wisdom;return fx.applyStats(s,b.main,{power,wisdom});
}
export function mainCost(from,to){const c=CARDS[to],old=from?CARDS[from]:null;if(!c||c.type!=='main')return null;if(!old)return c.stage;if(old.species===c.species)return c.stage>old.stage?c.stage-old.stage:null;return c.stage;}
function listActions(s){
 const a=actor(s);if(!a)return [];const p=s.players[a],b=p.board,o=s.players[other(a)],out=[];
 const add=(kind,label,data={})=>{if(['place','relationship','programPlay','play'].includes(kind)){const c=data.source?card(s,data.source):null,action=kind==='relationship'?'relationship':kind==='place'?(data.slot==='main'?data.variant:data.slot==='prepared'?(data.trap?'trap':'equip'):data.slot):'quick_'+c.type;if(['companions','partner'].includes(action)){out.push({kind,label,...data});return;}const base=kind==='relationship'?1:kind==='place'&&data.slot==='main'?mainCost(b.main?card(s,b.main).id:null,c.id):c.cost+(kind==='programPlay'&&RULES[c.id]?.extraTime==='variant'?Number(data.variant):0)-(data.discount?1:0);for(const quote of costs.quotes(s,a,action,base,{source:data.source,target:data.target,variant:data.variant})){if(p.time<quote.cost)continue;const intrinsic=quote.modifiers.some(m=>m.kind==='intrinsic');out.push({kind,label:label.replace(/時[0-9]+/, '時'+quote.cost)+(intrinsic?' ／軽減を適用':''),...data,...('cost' in data?{cost:quote.cost}:{}),...(intrinsic?{quote}:{})});}return;}out.push({kind,label,...data});};
 if(s.choice){for(const option of s.choice.options)add('choose',option.label,{value:option.id});return out;}
 if(s.phase==='trigger'){
  for(const t of s.pending.filter(t=>t.actor===a)){if(t.kind==='program'){for(const o of fx.triggerOptions(s,t))if(selectionAvailable(s,a,t.program,{source:t.source,variant:o.variant,event:t.event}))add('trigger',`${title(s,t.source)}の能力を発動${t.program.cost?`（時${t.program.cost}）`:""}${o.target?' → '+title(s,o.target):''}${o.costCard?' / 支払い：'+title(s,o.costCard):''}`,{source:t.source,trigger:t.kind,index:t.index,...o});if(!t.program.mandatory)add('skip',`${title(s,t.source)}を見送る`,{source:t.source,index:t.index});continue;}add('trigger',`${title(s,t.source)}の能力を発動`,{source:t.source,trigger:t.kind});add('skip',`${title(s,t.source)}を見送る`,{source:t.source});}return out;
 }
 const normal=s.phase==='normal';
 if(normal){
  for(const id of p.hand){const c=card(s,id);
   if(RULES[c.id]?.mode==='trap'&&b.prepared.length<3){const trapBase=fx.payment(s,a,'trap',c.cost),costs=[trapBase];if(b.main&&card(s,b.main).id==='M-antlion-01'&&!p.used.includes(token(s,b.main)+':trapDiscount'))costs.push(Math.max(0,trapBase-1));for(const cost of [...new Set(costs)])if(cost!==Infinity)add('place',`${c.name}をしかける（時${cost}）`,{source:id,slot:'prepared',cost,trap:true,discount:cost<trapBase});}
   if(c.type==='main'){const base=mainCost(b.main?card(s,b.main).id:null,c.id),variant=!b.main?'birth':card(s,b.main).species===c.species?'time_skip':'transform',cost=base===null?null:fx.payment(s,a,variant,base);if(cost!==null)add('place',`${c.name}を${variant==='time_skip'?'ときおくり':b.main?'へんしん':'たんじょう'}（時${cost}）`,{source:id,slot:'main',cost,variant});}
   if(c.type==='companion'&&!p.personUsed){if(b.companions.length<3)add('place',`${c.name}をなかまへ`,{source:id,slot:'companions',cost:0});else for(const target of b.companions)add('place',`${c.name}を出す／${title(s,target)}と交代`,{source:id,target,slot:'companions',cost:0});}
   if(c.type==='partner'&&!p.personUsed&&!b.partner)add('place',`${c.name}と交際開始`,{source:id,slot:'partner',cost:0});
   if(c.type==='world'){const cost=fx.payment(s,a,'world',c.cost);if(cost!==Infinity)add('place',`${c.name}を配置（時${cost}）`,{source:id,slot:'world',cost});}
   if((['I-sleepboost1','I-bowtie'].includes(c.id)||RULES[c.id]?.mode==='equipment')&&b.prepared.length<3){const targets=c.id==='I-sleepboost1'?[b.main]:RULES[c.id]?.mode==='equipment'?[b.main,b.partner,...b.companions].filter(id=>id&&RULES[c.id].attach.includes(card(s,id).type)):[b.main,b.partner,...b.companions];for(const target of targets.filter(Boolean))add('place',`${c.name} → ${title(s,target)}（時${fx.payment(s,a,'equip',c.cost)}）`,{source:id,slot:'prepared',target,cost:fx.payment(s,a,'equip',c.cost)});}
  }
  if(b.main&&b.partner&&p.relationship<4&&!p.relationshipUsed)add('relationship',`交際を進める ${p.relationship}→${p.relationship===3?'結婚':p.relationship+1}（時${fx.payment(s,a,'relationship',1)}）`,{cost:fx.payment(s,a,'relationship',1)});
  if(b.main&&o.board.main&&!p.challengeUsed)for(const parameter of ['power','wisdom'])add('challenge',`${parameter==='power'?'ちから':'ちえ'}でちょうせん`,{parameter});
 }
 for(const source of [b.main,b.partner,b.world,...b.companions,...b.prepared.filter(e=>!e.faceDown).map(e=>e.id),...p.discard.filter(id=>RULES[card(s,id).id]?.active?.from==='discard')].filter(Boolean)){const root=effectiveRule(s,source,RULES[card(s,source).id])?.active;const r=root;if(!r||(card(s,source).type==='partner'&&!b.main)||(r.onceName&&s.history.some(e=>e.kind==='ability'&&e.serial===s.serial&&e.actor===a&&e.cardId===(r.onceNameCardId??card(s,source).id)&&(e.nameScope??null)===(r.nameScope??null)))||p.used.includes(token(s,source)+':'+(r.limitKey??'active'))||p.time<(r.cost??0)||!fx.condition(s,a,r.condition,{source,contract:r,stats:{A:stats(s,'A'),B:stats(s,'B')}}))continue;for(const target of fx.targets(s,a,r.target,source))for(const variant of r.variants??[null])for(const payment of fx.costOptions(s,a,variantRule(r,variant),source))if(fx.condition(s,a,r.variantCondition,{source,variant,contract:r})&&selectionAvailable(s,a,variantRule(r,variant),{source,variant}))add('programAbility',`${title(s,source)}の能力${target?' → '+title(s,target):''}${variant?' / '+variant:''}（時${r.cost??0}）${payment.costCard?' / 支払い：'+title(s,payment.costCard):''}`,{source,target,variant,cost:r.cost??0,...payment});}
 if(s.turn===a)for(const source of b.companions)if(card(s,source).id==='C-cat_friend'&&!p.used.includes(token(s,source)))for(const target of p.discard)if(card(s,target).type==='companion'&&card(s,target).id!=='C-cat_friend')add('ability',`${title(s,source)} → ${title(s,target)}を回収`,{source,target});
 for(const source of p.hand){const c=card(s,source);if(p.time<fx.payment(s,a,'quick_'+c.type,c.cost)&&RULES[c.id]?.mode!=='trap')continue;
  const rule=RULES[c.id];if(rule?.reaction==='quickPlay'){if(fx.condition(s,a,rule.condition,{source})){for(const link of s.chain.filter(x=>x.actor!==a&&!x.ability&&card(s,x.source).type==='play'&&card(s,x.source).method==='すぐつかう'))for(const target of fx.targets(s,a,rule.target,source))add('programPlay',`${c.name}：${title(s,link.source)}に反応`,{source,target,cost:fx.payment(s,a,'quick_'+c.type,c.cost),event:{linkId:link.uid}});}continue;}if(rule?.reaction==='retarget'){for(const link of s.chain.filter(x=>x.actor!==a))for(const target of fx.alternateTargets(s,link))add('programPlay',`${c.name}：${title(s,link.source)}の対象を${title(s,target)}へ変更`,{source,target,cost:fx.payment(s,a,'quick_'+c.type,c.cost),event:{linkId:link.uid}});continue;}if(rule?.mode==='quick'){const values=s.challenge?{A:stats(s,'A')?.[s.challenge.parameter],B:stats(s,'B')?.[s.challenge.parameter]}:null;if(fx.condition(s,a,rule.condition,{source,values})&&(!rule.onceName||!s.history.some(e=>e.serial===s.serial&&e.actor===a&&e.kind==='play'&&e.cardId===c.id))){for(const target of fx.targets(s,a,rule.target))for(const variant of rule.variants??[null]){const cost=fx.payment(s,a,'quick_'+c.type,c.cost)+(rule.extraTime==='variant'?Number(variant):0);if(p.time>=cost&&selectionAvailable(s,a,variantRule(rule,variant),{source,variant}))add('programPlay',`${c.name}${target?' → '+title(s,target):''}${variant!==null?' / '+(TYPE_NAMES[variant]??variant):''}（時${cost}）`,{source,target,variant,cost});}}continue;}
  const play=(data={},suffix='')=>add('play',`${c.name}${suffix}（時${c.cost}）`,{source,...data});
  if(['I-c_coin2','G-area-claim'].includes(c.id))play();
  if(c.id==='G-hit-blow')for(const declare of types)play({declare},`／${TYPE_NAMES[declare]}を宣言`);
  if(c.id==='E-first-date'&&b.partner)play({target:b.partner},` → ${title(s,b.partner)}`);
  if(c.id==='G-animal-shogi')for(const target of p.discard)if(card(s,target).type==='companion')play({target},` → ${title(s,target)}`);
  if(c.id==='G-archery-3d'&&b.world)for(const e of o.board.prepared)if(card(s,e.id).cost<=2)play({target:e.id},` → 相手の${title(s,e.id)}`);
 }
 add('pass',normal?'ターン終了を申し出る':'パス');return out;
}
export function legalActions(s){if(s.version===legacy.VERSION)return legacy.legalActions(s);return listActions(s).map(a=>({...a,id:JSON.stringify(Object.fromEntries(Object.entries(a).filter(([k])=>k!=='label')))}));}
export function act(state,who,revision,id){
 if(state.version===legacy.VERSION)return legacy.act(state,who,revision,id);
 if(who!==actor(state)||revision!==state.revision)throw Error('手番または操作の版が変わりました');
 const inventory=legalActions(state);if(typeof id==='string'&&id.startsWith('ui:')){const [,r,i]=id.split(':');if(Number(r)!==revision||!/^\d+$/.test(i))throw Error('操作の版が異なります');id=inventory[Number(i)]?.id;}const action=inventory.find(a=>a.id===id);if(!action)throw Error('今は選べない行動です');
 const s=clone(state);execute(s,action);if(!s.program&&!s.automaticResume)drainAutomatic(s,'action');s.revision++;s.commands.push(id);validate(s);return s;
}
function activate(s,link){s.chain.push(link);s.phase='response';s.priority=link.actor;s.passes=0;if(s.window==='end_request')s.window='normal';log(s,`${link.actor}：${title(s,link.source)}を発動`);recordActivation(s,link);}
function execute(s,a){const who=actor(s),p=s.players[who],b=p.board;const eq=b.prepared.find(e=>e.id===a.source),attachment=eq&&!eq.faceDown?{target:eq.target,generation:eq.targetGeneration}:null;
 if(['programPlay','programAbility','trigger'].includes(a.kind)&&!a.selectionReady){const r=activationRule(s,a);if(r?.select?.length){s.activationDraft={actor:who,action:{...a,event:a.event??(a.kind==='trigger'?s.pending.find(t=>t.source===a.source&&t.index===a.index)?.event:undefined)},rule:r,index:0,selection:{},phase:s.phase,priority:s.priority};selectionPrompt(s);return;}}
 if(a.kind==='choose'){if(s.choice.kind==='automatic_order'){const job=s.automatics.splice(Number(a.value),1)[0];s.choice=null;job.chosen=true;s.automatics.unshift(job);if(!runAutomatic(s))resumeWork(s);return;}if(s.choice.resume==='activationSelection'){chooseActivation(s,a.value);return;}if(s.choice.resume==='program'){if(!fx.resume(s,a.value,helpers))resumeWork(s);return;}if(s.choice.kind==='scheduled_order'){const i=Number(a.value);s.choice=null;runScheduled(s,i);return;}const q=s.choice;s.choice=null;
  if(['egg_bottom','birth_bottom','sleep_bottom'].includes(q.kind)){remove(p.hand,a.value);p.deck.push(a.value);if(q.kind==='birth_bottom')draw(s,who);}
  if(q.kind==='look'){if(a.value==='bottom'&&p.deck.length)p.deck.push(p.deck.shift());}
  log(s,`${who}：${q.kind==='look'?'山札の位置を選択':'手札1枚を山札下へ'}`);
  if(q.resume==='start')startWindow(s);else resolveChain(s);return;
 }
 if(a.kind==='trigger'||a.kind==='skip'){
  const i=s.pending.findIndex(t=>t.source===a.source&&(a.index===undefined||t.index===a.index)),t=s.pending.splice(i,1)[0];
  if(a.kind==='trigger'){if(t.kind==='program'){payAbilityCost(s,who,t.program,a,t.source);paySelections(s,who,t.program,a);const trap=RULES[card(s,t.source).id]?.mode==='trap';if(trap)b.prepared=b.prepared.filter(e=>e.id!==t.source);const key=t.source+'#'+s.cards[t.source].generation+':'+(t.program.limitKey??t.program.limitGroup??t.index);p.used.push(key);s.history.push({kind:'ability',actor:who,serial:s.serial,round:s.round,generation:s.cards[t.source].generation,index:t.program.limitKey??t.program.limitGroup??t.index,source:t.source,nameScope:t.program.nameScope,cardId:t.program.onceNameCardId??card(s,t.source).id});s.chain.push({actor:who,source:t.source,target:a.target??null,targetGeneration:a.target?s.cards[a.target].generation:null,targetZone:a.target?cardZone(s,a.target):null,kind:'program',steps:t.program.steps,contract:t.program,attachment,...selectionLink(a,t.program),event:t.event,variant:a.variant,ability:!trap});}else s.chain.push({actor:who,source:t.source,kind:t.kind,ability:true});log(s,`${who}：${title(s,t.source)}の能力を発動`);s.priority=who;}
  if(a.kind==='trigger'&&t.kind==='program'&&(t.program.once||t.program.limit||t.program.onceName))s.pending=s.pending.filter(x=>!(x.actor===who&&(t.program.onceName?(x.program?.onceNameCardId??card(s,x.source).id)===(t.program.onceNameCardId??card(s,t.source).id)&&(x.program?.nameScope??null)===(t.program.nameScope??null):x.source===t.source&&(x.program?.limitKey??x.program?.limitGroup??x.index)===(t.program.limitKey??t.program.limitGroup??t.index))));if(!s.pending.length){s.phase='response';s.passes=0;}if(a.kind==='trigger')recordActivation(s,s.chain.at(-1));if(a.kind==='trigger'&&t.kind==='program'&&RULES[card(s,t.source).id]?.mode==='trap')enqueueTriggers(s,{kind:'trapActivation',actor:who,source:t.source,setSerial:t.setSerial});return;
 }
 if(a.kind==='place'){
  const oldWorld=b.world?card(s,b.world).id:null,oldMain=b.main;const priorPending=s.pending.length;consumeActionCost(s,who,a);p.time-=a.cost;remove(p.hand,a.source);const birth=a.slot==='main'&&!b.main;
  if(a.target&&a.slot==='companions')discardField(s,who,a.target);
  if(['main','world'].includes(a.slot)&&b[a.slot])discardField(s,who,b[a.slot],{cause:'normal',transition:a.slot==='main'?a.variant:undefined});
  enter(s,a.source);
  if(a.slot==='prepared'){if(a.trap){b.prepared.push({id:a.source,faceDown:true,setSerial:s.serial});if(a.discount)p.used.push(token(s,b.main)+':trapDiscount');}else b.prepared.push({id:a.source,target:a.target,targetGeneration:s.cards[a.target].generation,attachedAt:s.revision});}
  else if(a.slot==='companions')b.companions.push(a.source);else b[a.slot]=a.source;
  if(['partner','companions'].includes(a.slot))p.personUsed=true;
  if(a.slot==='partner')p.relationship=0;
  log(s,`${who}：${a.trap?'伏せ札':title(s,a.source)}を配置（時${a.cost}）`);
  const departures=s.pending.slice(priorPending);triggers(s,[...(birth&&card(s,a.source).id==='M-beetle-01'?[{actor:who,source:a.source,kind:'birth'}]:[]),...departures],'normal');recordPlay(s,who,a.source,a.slot);if(a.slot==='prepared'&&!a.trap)enqueueTriggers(s,{kind:'attached',actor:who,source:a.source,target:a.target,targetGeneration:s.cards[a.target].generation});if(a.slot==='main')enqueueTriggers(s,{kind:a.variant,actor:who,source:a.source,previousMain:oldMain});if(a.slot==='world'&&oldWorld)enqueueTriggers(s,{kind:'worldChange',actor:who,source:a.source,normal:true,changedName:oldWorld!==card(s,a.source).id});return;
 }
 if(a.kind==='relationship'){p.time-=a.cost;consumeActionCost(s,who,a);p.relationship++;p.relationshipUsed=true;if(p.relationship===4)grow(s,who,10);log(s,`${who}：交際${p.relationship===4?'結婚':p.relationship}`);window(s);enqueueTriggers(s,{kind:p.relationship===4?'marriage':'progress',actor:who});return;}
 if(a.kind==='challenge'){p.challengeUsed=true;s.challenge={parameter:a.parameter,id:s.revision,actor:who,generations:{A:s.cards[s.players.A.board.main].generation,B:s.cards[s.players.B.board.main].generation},participants:{A:s.players.A.board.main,B:s.players.B.board.main}};log(s,`${who}：ちょうせんを宣言`);window(s,'compare');enqueueTriggers(s,{kind:'challenge',actor:who,source:b.main});return;}
 if(a.kind==='ability'){
  p.used.push(token(s,a.source));remove(b.companions,a.source);p.deck.push(a.source);for(const e of [...b.prepared])if(e.target===a.source)discardField(s,who,e.id);
  if(s.phase==='normal')s.window='normal';activate(s,{actor:who,source:a.source,target:a.target,targetGeneration:s.cards[a.target].generation,targetZone:'discard',kind:'cat',ability:true});return;
 }
 if(a.kind==='programAbility'){const r=variantRule(effectiveRule(s,a.source,RULES[card(s,a.source).id]).active,a.variant);payAbilityCost(s,who,r,a,a.source);paySelections(s,who,r,a);p.used.push(token(s,a.source)+':'+(r.limitKey??'active'));s.history.push({kind:'ability',actor:who,serial:s.serial,round:s.round,generation:s.cards[a.source].generation,index:r.limitKey??'active',source:a.source,nameScope:r.nameScope,cardId:r.onceNameCardId??card(s,a.source).id});if(s.phase==='normal')s.window='normal';activate(s,{actor:who,source:a.source,target:a.target,targetGeneration:a.target?s.cards[a.target].generation:null,targetZone:a.target?cardZone(s,a.target):null,variant:a.variant,kind:'program',steps:r.steps,contract:r,attachment,...selectionLink(a,r),ability:true});return;}
 if(a.kind==='programPlay'){paySelections(s,who,variantRule(RULES[card(s,a.source).id],a.variant),a);if(s.phase==='normal')s.window='normal';p.time-=a.cost;consumeActionCost(s,who,a);remove(p.hand,a.source);activate(s,{actor:who,source:a.source,target:a.target,targetGeneration:a.target?s.cards[a.target].generation:null,targetZone:a.target?cardZone(s,a.target):null,variant:a.variant,kind:'program',steps:RULES[card(s,a.source).id].steps,contract:variantRule(RULES[card(s,a.source).id],a.variant),event:a.event,...selectionLink(a,variantRule(RULES[card(s,a.source).id],a.variant)),ability:false});recordPlay(s,who,a.source);return;}
 if(a.kind==='play'){
  if(s.phase==='normal')s.window='normal';p.time-=fx.payment(s,who,'quick_'+card(s,a.source).type,card(s,a.source).cost);consumeActionCost(s,who,a);remove(p.hand,a.source);
  activate(s,{actor:who,source:a.source,target:a.target??null,targetGeneration:a.target?s.cards[a.target].generation:null,targetZone:a.target?cardZone(s,a.target):null,declare:a.declare??null,kind:card(s,a.source).id,ability:false});recordPlay(s,who,a.source);return;
 }
 if(a.kind==='pass'){
  if(s.phase==='normal'){window(s,'end_request',other(who));s.passes=1;return;}
  s.passes++;if(s.passes<2){s.priority=other(who);return;}
  if(s.chain.length){resolveChain(s);return;}
  if(s.window==='end_request'){endWindow(s);return;}
  if(s.window==='end'){endTurn(s);return;}
  if(s.window==='compare'){
   if(s.challenge.aborted||['A','B'].some(a=>s.players[a].board.main!==s.challenge.participants[a]||(s.challenge.generations&&s.cards[s.challenge.participants[a]].generation!==s.challenge.generations[a]))){log(s,'参加メインが離れたため、ちょうせんを途中終了');s.challenge.completed=false;window(s,'challenge_end');return;}
   const values={A:stats(s,'A')[s.challenge.parameter],B:stats(s,'B')[s.challenge.parameter]};const winner=values.A===values.B?null:(s.challenge.reverse?values.A<values.B:values.A>values.B)?'A':'B';if(winner)grow(s,winner,5);s.challenge.completed=true;s.history.push({serial:s.serial,kind:'comparison',winner,values,round:s.round,actor:s.challenge.actor,parameter:s.challenge.parameter,participants:clone(s.challenge.participants)});log(s,`ちょうせん ${values.A}対${values.B}：${winner?winner+' +5':'引き分け'}`);window(s,'challenge_end');for(const a of ['A','B'])enqueueTriggers(s,{kind:'challengeResult',actor:a,source:s.challenge.participants[a],result:winner===null?'draw':winner===a?'win':'loss',parameter:s.challenge.parameter,ownChallenge:s.challenge.actor===a,values});return;
  }
  if(s.window==='challenge_end'){if(!s.challenge.ended){s.challenge.ended=true;fx.cleanup(s,'challengeEnd',s.turn);enqueueTriggers(s,{kind:'challengeEnd',actor:s.challenge.actor,completed:s.challenge.completed===true});if(drainAutomatic(s,'challenge_end'))return;}s.challenge=null;}
  s.phase=s.pending.length?'trigger':'normal';s.priority=s.turn;s.passes=0;
 }
}
function resolveChain(s){
 s.phase='resolving';if(drainAutomatic(s,'chain'))return;
 while(s.chain.length){if(drainAutomatic(s,'chain'))return;const l=s.chain.pop(),p=s.players[l.actor],b=p.board;
  const sameTarget=()=>l.target&&s.cards[l.target].generation===l.targetGeneration;
  log(s,`${l.actor}：${title(s,l.source)}を解決`);
  if(l.negated){if(!l.ability)p.discard.push(l.source);s.history.push({kind:'negated',serial:s.serial,source:l.source,linkId:l.uid});continue;}if(l.kind==='program'&&card(s,l.source).type==='partner'&&!b.main)continue;
  if(l.kind==='program'){if(!l.ability)p.discard.push(l.source);if(fx.begin(s,l,l.steps,helpers))return;if(drainAutomatic(s,'chain'))return;continue;}
  if(['G-archery-3d','G-animal-shogi','cat'].includes(l.kind)){if(!l.ability)p.discard.push(l.source);const steps=l.kind==='G-archery-3d'?[{op:'move',destination:'discard'}]:[{op:'move',destination:'hand'},...(l.kind==='G-animal-shogi'?[{op:'if',condition:'moved',steps:[{op:'look'}]}]:[])];if(fx.begin(s,l,steps,helpers))return;continue;}
  let choice=null;const beforeEffect=JSON.stringify(['A','B'].map(a=>{const p=s.players[a];return [p.hand,p.deck,p.discard,p.growth];}));
  if(l.kind==='I-c_coin2'&&p.deck.length){l.applied=true;const top=p.deck.shift();log(s,`公開：${title(s,top)}`);p.deck.push(top);if(card(s,top).type==='main')grow(s,l.actor,5);else draw(s,l.actor);}
  if(l.kind==='G-hit-blow'&&p.deck.length){l.applied=true;const top=p.deck.shift();log(s,`公開：${title(s,top)}`);if(card(s,top).type===l.declare){p.hand.push(top);grow(s,l.actor,5);}else {p.deck.push(top);draw(s,l.actor);}}
  if(l.kind==='E-first-date'&&sameTarget()&&b.partner===l.target&&p.relationship===0){draw(s,l.actor);grow(s,l.actor,5);}
  if(l.kind==='G-area-claim'){const count=[b.main,b.partner,b.world].filter(Boolean).length+b.companions.length+b.prepared.length;if(count>=7)grow(s,l.actor,count===9?15:10);}
  if(l.kind==='G-archery-3d'&&sameTarget()){const o=other(l.actor);if(s.players[o].board.prepared.some(e=>e.id===l.target)&&card(s,l.target).cost<=2)discardField(s,o,l.target);}
  if(['G-animal-shogi','cat'].includes(l.kind)&&p.discard.includes(l.target)){
   remove(p.discard,l.target);p.hand.push(l.target);if(l.kind==='cat')s.history.push({serial:s.serial,kind:'effect',actor:l.actor,source:l.source,type:'companion'});
   if(l.kind==='G-animal-shogi'&&p.deck.length)choice={kind:'look',options:[{id:'top',label:'一番上に戻す'},{id:'bottom',label:'一番下に置く'}]};
  }
  if(l.kind==='birth')choice={kind:'birth_bottom',options:p.hand.map(id=>({id,label:title(s,id)}))};
  if(l.kind==='sleep'){draw(s,l.actor,2);choice={kind:'sleep_bottom',options:p.hand.map(id=>({id,label:title(s,id)}))};}
  if(l.kind==='bowtie')draw(s,l.actor);
  if(JSON.stringify(['A','B'].map(a=>{const p=s.players[a];return [p.hand,p.deck,p.discard,p.growth];}))!==beforeEffect||choice||l.applied)enqueueTriggers(s,{kind:'effectApplied',actor:l.actor,source:l.source,ability:!!l.ability,attachment:l.attachment,method:card(s,l.source).method,faceUp:true,linkId:l.uid});
  if(!l.ability)p.discard.push(l.source);
  if(choice){if(requestChoice(s,l.actor,choice.kind,choice.options,'chain'))return;if(l.kind==='birth')draw(s,l.actor);}
 }
 if(drainAutomatic(s,'chain'))return;window(s,s.window,s.turn);if(s.pending.length)s.phase='trigger';
}
export function validate(s){
 if(s.version===legacy.VERSION)return legacy.validate(s);
 if(!RULE_VERSIONS.includes(s.version)||!Number.isSafeInteger(s.revision)||s.revision!==s.commands.length||!['A','B'].includes(s.turn)||!Number.isInteger(s.round)||s.round<1||s.round>10)throw Error('状態形式が不正です');
 const located=[];
 for(const a of ['A','B']){const p=s.players[a],b=p.board;if(!Number.isInteger(p.time)||p.time<0||p.time>10||p.growth<0||p.growth>100||p.growth%5||b.companions.length>3||b.prepared.length>3)throw Error('資源または枠が不正です');
  const ids=[...p.deck,...p.hand,...p.discard,...[b.main,b.partner,b.world].filter(Boolean),...b.companions,...b.prepared.map(e=>e.id)];
  if(ids.some(id=>!s.cards[id]||s.cards[id].owner!==a||!CARDS[s.cards[id].cardId]))throw Error('カード所有者が不正です');located.push(...ids);
  for(const e of b.prepared)if(!e.faceDown&&(![b.main,b.partner,...b.companions].includes(e.target)||s.cards[e.target].generation!==e.targetGeneration))throw Error('装備対象が不正です');
 }
 located.push(...s.chain.filter(l=>!l.ability).map(l=>l.source));if(located.length!==80||new Set(located).size!==80||located.some(id=>!s.cards[id]))throw Error('カード保存則が破れました');
 return true;
}
export function view(s,viewer){
 if(s.version===legacy.VERSION)return legacy.view(s,viewer);
 if(!['A','B',null].includes(viewer))throw Error('閲覧者が不正です');
 const describe=id=>({...card(s,id),cardId:card(s,id).id,id,name:title(s,id)});
 const players={};for(const a of ['A','B']){const p=s.players[a],b=p.board;players[a]={time:p.time,growth:p.growth,relationship:p.relationship,handCount:p.hand.length,deckCount:p.deck.length,discard:p.discard.map(describe),stats:stats(s,a),board:{main:b.main?describe(b.main):null,partner:b.partner?describe(b.partner):null,world:b.world?describe(b.world):null,companions:b.companions.map(describe),prepared:b.prepared.map((e,i)=>e.faceDown&&a!==viewer?{id:'hidden:'+a+':'+i,name:'しかけたカード',text:'相手の伏せ札は確認できません',hidden:true}:{...describe(e.id),target:e.faceDown?'しかける':title(s,e.target)})}};if(a===viewer)players[a].hand=p.hand.map(describe);}
 const targetLabel=(l,id)=>(l.hiddenTargets??[]).includes(id)&&s.cards[id].owner!==viewer?'しかけたカード':privateLabel(s,viewer,title(s,id));const choice=s.choice&&s.choice.actor===viewer?{kind:s.choice.kind,peek:s.choice.peek?s.choice.peek.map(describe):s.choice.kind==='look'?describe(s.players[viewer].deck[0]):null}:null;
 return {round:s.round,turn:s.turn,actor:actor(s),phase:s.phase,revision:s.revision,result:s.result,players,choice,chain:s.chain.map(l=>({actor:l.actor,name:title(s,l.source),target:l.publicTargets?.length?l.publicTargets.map(id=>targetLabel(l,id)).join(' / '):l.target?targetLabel(l,l.target):null,declare:l.declare?TYPE_NAMES[l.declare]:null})),log:s.log.slice(-60),actions:viewer===actor(s)?legalActions(s).map((a,i)=>({kind:a.kind,source:a.source,label:privateLabel(s,viewer,a.label),id:`ui:${s.revision}:${i}`})):[]};
}
export function save(s){if(s.version===legacy.VERSION)return legacy.save(s);validate(s);return JSON.stringify({version:s.version,seed:s.seed,decks:s.decks,commands:s.commands});}
export function restore(text){const data=JSON.parse(text);if(data.version===legacy.VERSION)return legacy.restore(text);if(!RULE_VERSIONS.includes(data.version)||!Array.isArray(data.commands)||data.commands.length>10000||Object.keys(data).sort().join()!=='commands,decks,seed,version')throw Error('保存形式が異なります');let s=createGame(data.seed,data.decks,data.version);for(const id of data.commands)s=act(s,actor(s),s.revision,id);return s;}

function recordPlay(s,a,source,slot){const c=card(s,source);s.history.push({serial:s.serial,actor:a,kind:'play',challenge:s.challenge?.id,source,cardId:c.id,type:c.type,method:c.method??null,generation:s.cards[source].generation,faceUp:!s.players[a].board.prepared.some(e=>e.id===source&&e.faceDown)});if(slot)s.history.push({serial:s.serial,actor:a,kind:'place',slot,source});if(slot)enqueueTriggers(s,{kind:'place',actor:a,source,slot,normal:true,faceUp:!s.players[a].board.prepared.some(e=>e.id===source&&e.faceDown)});enqueueTriggers(s,{kind:'cardPlayed',actor:a,source,method:c.method??null,faceUp:!s.players[a].board.prepared.some(e=>e.id===source&&e.faceDown)});}
function enqueueTriggers(s,event){event={...event,challenge:s.challenge?.id,stats:{A:stats(s,'A'),B:stats(s,'B')},...(event.source?{generation:event.generation??s.cards[event.source].generation}:{})};s.history.push({...event,serial:s.serial,round:s.round});const jobs=eventEffects.collect(s,event,fx.condition);if(jobs.length){s.automatics??=[];s.automatics.push(...jobs,{event});}else s.pending.push(...fx.triggerRows(s,event));if(s.pending.length&&!['resolving','choice'].includes(s.phase))s.phase='trigger';}
function startBoundary(s,kind){const due=s.scheduled.filter(e=>e.timing===kind&&e.actor===s.turn&&e.due<=s.serial);if(!due.length)return false;s.scheduled=s.scheduled.filter(e=>!due.includes(e));s.boundary={kind,due};runScheduled(s);return true;}
function runScheduled(s,index){if(drainAutomatic(s,'boundary'))return;const b=s.boundary;b.due.sort((x,y)=>Number(x.link.actor!==s.turn)-Number(y.link.actor!==s.turn));if(!b.due.length){const kind=b.kind;s.boundary=null;if(kind==='start')finishStart(s);else finishEnd(s);return;}
 if(index===undefined&&b.due.filter(e=>e.link.actor===b.due[0].link.actor).length>1){requestChoice(s,b.due[0].link.actor,'scheduled_order',b.due.map((e,i)=>({id:String(i),label:title(s,e.link.source)+'の予約を先に処理',actor:e.link.actor})).filter(e=>e.actor===b.due[0].link.actor),'boundary');return;}
 const e=b.due.splice(index??0,1)[0];if(!fx.begin(s,{...e.link,scheduled:true,applied:false},e.steps,helpers))runScheduled(s);
}
function drainAutomatic(s,resume){if(!s.automatics?.length)return false;s.automaticResume=resume;s.automaticPhase=s.phase;const waiting=runAutomatic(s);if(!waiting){s.automaticResume=null;if(s.pending.length&&resume==='action')s.phase='trigger';}return waiting;}
function runAutomatic(s){s.phase='resolving';while(s.automatics?.length){if(s.automatics[0].event){const event=s.automatics.shift().event;event.stats={A:stats(s,'A'),B:stats(s,'B')};s.pending.push(...fx.triggerRows(s,event));continue;}const first=s.automatics[0],indices=[];for(let i=0;i<s.automatics.length&&!s.automatics[i].event;i++)if(s.automatics[i].actor===first.actor)indices.push(i);if(indices.length>1&&!first.chosen){requestChoice(s,first.actor,'automatic_order',indices.map(i=>({id:String(i),label:title(s,s.automatics[i].link.source)+'の予約を先に処理'})),'automatic');return true;}const job=s.automatics.shift();if(fx.begin(s,job.link,job.steps,helpers))return true;}s.phase=s.automaticPhase??'response';s.automaticPhase=null;return false;}
function resumeWork(s){if(s.automaticResume){if(runAutomatic(s))return;const resume=s.automaticResume;s.automaticResume=null;if(resume==='action'){if(s.pending.length)s.phase='trigger';return;}if(resume==='challenge_end'){s.challenge=null;s.phase=s.pending.length?'trigger':'normal';s.priority=s.turn;return;}}if(s.boundary)runScheduled(s);else resolveChain(s);}


function privateLabel(s,viewer,label){for(const e of ['A','B'].filter(a=>a!==viewer).flatMap(a=>s.players[a].board.prepared))if(e.faceDown)label=label.replaceAll(title(s,e.id),'しかけたカード');return label;}

function payAbilityCost(s,a,r,action,source){const p=s.players[a];p.time-=r.cost??0;if(r.selfCost){if(p.discard.includes(source))remove(p.discard,source);else{discardField(s,a,source,{cause:'cost',destination:r.selfCost});remove(p.discard,source);}if(r.selfCost==='bottom')p.deck.push(source);else p.discard.push(source);}if(r.handCost){s.history.push({kind:'cost',serial:s.serial,actor:a,source,card:action.costCard,from:'hand',destination:r.handCost.destination});remove(p.hand,action.costCard);if(r.handCost.destination==='bottom')p.deck.push(action.costCard);else p.discard.push(action.costCard);log(s,`${a}：発動コストとして手札を移動${r.handCost.reveal?'（'+title(s,action.costCard)+'）':''}`);}}

function activationRule(s,a){if(a.kind==='programPlay')return variantRule(RULES[card(s,a.source).id],a.variant);if(a.kind==='programAbility')return variantRule(effectiveRule(s,a.source,RULES[card(s,a.source).id]).active,a.variant);return s.pending.find(t=>t.source===a.source&&t.index===a.index)?.program;}
function selectionAvailable(s,a,r,ctx){const groups=r.select??[];function check(i,selection){if(i>=groups.length)return true;const spec=groups[i],selected=selection[spec.key]??[];if(!selections.feasible(s,a,selectionSpec(spec),{...ctx,selection},selected))return false;const needed=groups.slice(i+1).some(g=>[g.filter?.sameTypeAs,g.filter?.sameCostAs,g.filter?.fitsEquipment,...(g.filter?.differentTypeFrom??[])].includes(spec.key));if(needed&&!selected.length){const seen=new Set();return selections.candidates(s,a,selectionSpec(spec),{...ctx,selection}).some(id=>{const signature=[card(s,id).type,card(s,id).cost,groups.some(g=>g.filter?.fitsEquipment===spec.key)?id:null].join(':');if(seen.has(signature))return false;seen.add(signature);return check(i+1,{...selection,[spec.key]:[id]});});}return check(i+1,selection);}return check(0,ctx.selection??{});}
function selectionPrompt(s){const d=s.activationDraft,spec=d.rule.select[d.index],ids=d.selection[spec.key]??=[],ctx={...d.action,selection:d.selection};const options=selections.candidates(s,d.actor,selectionSpec(spec),ctx,ids).filter(id=>selectionAvailable(s,d.actor,d.rule,{...ctx,selection:{...d.selection,[spec.key]:[...ids,id]}})).map(id=>({id,label:(spec.cost?'支払い':'対象')+' '+(ids.length+1)+'：'+privateLabel(s,d.actor,title(s,id))}));if(selections.complete(s,d.actor,selectionSpec(spec),ctx,ids))options.push({id:'done',label:'この選択を確定'});options.push({id:'cancel',label:'発動を取りやめる'});s.choice={actor:d.actor,kind:'activation_selection',options,resume:'activationSelection'};s.phase='choice';}
function chooseActivation(s,value){const d=s.activationDraft,spec=d.rule.select[d.index];if(value==='cancel'){s.phase=d.phase;s.priority=d.priority;s.activationDraft=null;s.choice=null;return;}
 if(value==='done')d.index++;else{(d.selection[spec.key]??=[]).push(value);if(d.selection[spec.key].length===(spec.count??spec.max??1))d.index++;}
 if(d.index<d.rule.select.length){selectionPrompt(s);return;}
 const selection=Object.fromEntries(Object.entries(d.selection).map(([k,ids])=>[k,ids.map(id=>({id,generation:s.cards[id].generation,zone:cardZone(s,id),...attachmentRef(s,id)}))]));s.phase=d.phase;s.priority=d.priority;s.activationDraft=null;s.choice=null;execute(s,{...d.action,selection,selectionReady:true});
}
function paySelections(s,a,r,action){for(const spec of r.select??[]){if(!spec.cost)continue;for(const {id,generation} of action.selection[spec.key]??[]){if(s.cards[id]?.generation!==generation)throw Error('支払い対象が変わりました');const p=s.players[a];if(spec.reveal)log(s,'公開：'+title(s,id));if(spec.cost==='reveal')continue;const from=cardZone(s,id);
 if(p.hand.includes(id))remove(p.hand,id);else if(p.discard.includes(id))remove(p.discard,id);else{discardField(s,a,id);remove(p.discard,id);}
 if(spec.cost==='bottom')p.deck.push(id);else if(spec.cost==='top')p.deck.unshift(id);else if(spec.cost==='hand')p.hand.push(id);else if(spec.cost==='discard')p.discard.push(id);else throw Error('未対応の支払い先');s.history.push({kind:'cost',serial:s.serial,actor:a,source:action.source,card:id,from,destination:spec.cost});}}
}

function selectionSpec({key,cost,reveal,...spec}){return spec;}

function cardZone(s,id){const p=s.players[s.cards[id].owner];return ['hand','deck','discard'].find(zone=>p[zone].includes(id))??'field';}

function selectionLink(a,r){return a.selection?{selection:a.selection,publicTargets:(r.select??[]).filter(x=>!x.cost).flatMap(x=>(a.selection[x.key]??[]).map(ref=>ref.id))}:{};}

function recordActivation(s,l){const reattach=l.contract?.steps?.find(e=>e.op==='reattach'&&e.target);if(reattach){const id=reattach.target==='sourceMain'?l.source:s.players[l.actor].board.main;l.equipmentTarget={id,generation:s.cards[id]?.generation};}l.activationRevision=s.revision;l.sourceGeneration=s.cards[l.source].generation;l.uid=s.revision+':'+s.chain.length;const targets=l.publicTargets??(l.target?[l.target]:[]);l.hiddenTargets=targets.filter(id=>s.players[s.cards[id].owner].board.prepared.some(e=>e.id===id&&e.faceDown));enqueueTriggers(s,{kind:'activation',actor:l.actor,source:l.source,linkId:l.uid,ability:!!l.ability,targets:[...targets],fieldTargets:targets.filter(id=>cardZone(s,id)==='field'),text:card(s,l.source).text,destinations:effectDestinations(l.contract??(l.kind==='G-archery-3d'?{steps:[{op:'move',destination:'discard'}]}:{})),contract:l.contract?clone(l.contract):legacyAbilityContract(l),sourceCardId:card(s,l.source).id,sourceWasMain:s.players[l.actor].board.main===l.source});}

function variantRule(r,variant){return r?.variantRules?.[variant]?{...r,...r.variantRules[variant]}:r;}
function attachmentRef(s,id){const e=s.players[s.cards[id].owner].board.prepared.find(e=>e.id===id&&!e.faceDown);return e?{attachment:{target:e.target,targetGeneration:e.targetGeneration,attachedAt:e.attachedAt}}:{};}
function consumeActionCost(s,a,x){const c=x.source?card(s,x.source):null,b=s.players[a].board,action=x.kind==='relationship'?'relationship':x.kind==='place'?(x.slot==='main'?x.variant:x.slot==='prepared'?(x.trap?'trap':'equip'):x.slot):'quick_'+c.type;if(['companions','partner'].includes(action))return;const base=x.kind==='relationship'?1:x.kind==='place'&&x.slot==='main'?mainCost(b.main?card(s,b.main).id:null,c.id):c.cost+(x.kind==='programPlay'&&RULES[c.id]?.extraTime==='variant'?Number(x.variant):0)-(x.discount?1:0);const ctx={source:x.source,target:x.target,variant:x.variant},q=x.quote??costs.quotes(s,a,action,base,ctx).find(q=>q.cost===(x.cost??q.cost));if(!q)throw Error('支払い契約が変わりました');if(q.modifiers.length)costs.consume(s,a,action,q,ctx);}

function effectDestinations(value){if(!value||typeof value!=='object')return [];return [...new Set([...(value.op==='move'||value.op==='selectedMove'?[value.destination]:[]),...Object.values(value).flatMap(effectDestinations)])];}
function legacyAbilityContract(l){if(l.kind==='birth')return {when:'birth',mandatory:true,steps:[{op:'handBottom'},{op:'draw',n:1}]};return undefined;}
