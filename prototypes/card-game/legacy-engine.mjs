/** Human-only, closed 15-card runtime. No population runner or policy selection.
 * Sources: docs/card-game/{01,02,06,64,65}, cards.mjs and Python parity fixtures.
 * Commands are atomic; save files replay commands instead of trusting state.
 */
import {CARDS} from './cards.mjs';
export {CARDS};
export const VERSION='hotseat-1';
const clone=x=>structuredClone(x),other=a=>a==='A'?'B':'A';
const types=['main','companion','partner','world','play','item','event'];
export const TYPE_NAMES={main:'メイン',companion:'なかま',partner:'こいびと',world:'セカイ',play:'あそび',item:'あいてむ',event:'できごと'};
const card=(s,id)=>CARDS[s.cards[id].cardId];
const title=(s,id)=>id?card(s,id).name:'たまご';
function random(seed){let n=seed>>>0;return ()=>{n+=0x6D2B79F5;let t=n;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return ((t^t>>>14)>>>0)/4294967296;};}
export function createGame(seed=1){
 if(!Number.isSafeInteger(seed)||seed<0||seed>0xffffffff)throw Error('開始seedが不正です');
 const s={version:VERSION,seed,revision:0,commands:[],cards:{},players:{},round:1,turn:'A',serial:1,phase:'normal',priority:'A',chain:[],pending:[],choice:null,window:'normal',passes:0,result:null,log:[],challenge:null};
 const rng=random(seed);
 for(const a of ['A','B']){
  const deck=[];for(const c of Object.values(CARDS)){const count=c.rare?1:c.id==='G-area-claim'?2:3;for(let i=1;i<=count;i++){const id=`${a}:${c.id}:${i}`;s.cards[id]={cardId:c.id,owner:a,generation:0};deck.push(id);}}
  if(deck.length!==40)throw Error('40枚デッキではありません');
  for(let i=deck.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[deck[i],deck[j]]=[deck[j],deck[i]];}
  s.players[a]={hand:deck.splice(0,5),deck,discard:[],board:{main:null,partner:null,world:null,companions:[],prepared:[]},time:0,growth:20,relationship:null,personUsed:false,relationshipUsed:false,challengeUsed:false,used:[],reached:null};
 }
 beginTurn(s);validate(s);return s;
}
export function actor(s){return s.phase==='finished'?null:s.choice?.actor??(s.phase==='trigger'?s.pending[0].actor:s.phase==='normal'?s.turn:s.priority);}
function log(s,message){s.log.push(message);}
function draw(s,a,n=1){const p=s.players[a];for(let i=0;i<n&&p.deck.length;i++)p.hand.push(p.deck.shift());}
function grow(s,a,n){const p=s.players[a];const old=p.growth;p.growth=Math.max(0,Math.min(100,old+n));if(p.growth<100)p.reached=null;else if(old<100)p.reached=s.serial+(a===s.turn?1:2);}
function remove(xs,id){const i=xs.indexOf(id);if(i<0)throw Error('カードの所在が一致しません');xs.splice(i,1);}
function enter(s,id){s.cards[id].generation++;}
function token(s,id){return `${id}#${s.cards[id].generation}`;}
function discardField(s,a,id){const p=s.players[a],b=p.board;
 for(const key of ['main','partner','world'])if(b[key]===id)b[key]=null;
 b.companions=b.companions.filter(x=>x!==id);b.prepared=b.prepared.filter(x=>x.id!==id);
 p.discard.push(id);
 for(const e of [...b.prepared])if(e.target===id)discardField(s,a,e.id);
}
function window(s,kind='normal',priority=s.turn){s.phase='response';s.window=kind;s.priority=priority;s.passes=0;}
function requestChoice(s,a,kind,options,resume){if(!options.length)return false;s.choice={actor:a,kind,options,resume};s.phase='choice';return true;}
function triggers(s,rows,kind){window(s,kind);s.pending=rows;if(rows.length)s.phase='trigger';}
function beginTurn(s){
 const p=s.players[s.turn];s.players.A.used=[];s.players.B.used=[];p.time=s.round;p.personUsed=false;p.relationshipUsed=false;p.challengeUsed=false;
 draw(s,s.turn);log(s,`R${s.round} ${s.turn}のターン開始`);
 if(!p.board.main){draw(s,s.turn);if(requestChoice(s,s.turn,'egg_bottom',p.hand.map(id=>({id,label:title(s,id)})),'start'))return;}
 startWindow(s);
}
function startWindow(s){const a=s.turn,p=s.players[a];triggers(s,p.hand.length<=2?p.board.prepared.filter(e=>card(s,e.id).id==='I-bowtie').map(e=>({actor:a,source:e.id,kind:'bowtie'})):[],'normal');}
function endWindow(s){const a=s.turn,p=s.players[a];triggers(s,!p.challengeUsed&&p.time>=2?p.board.prepared.filter(e=>card(s,e.id).id==='I-sleepboost1').map(e=>({actor:a,source:e.id,kind:'sleep'})):[],'end');}
function endTurn(s){
 if(s.round<10){const winner=['A','B'].find(a=>s.players[a].growth===100&&s.players[a].reached!==null&&s.players[a].reached<=s.serial&&s.turn!==a);if(winner){finish(s,winner,'100維持');return;}}
 if(s.round===10&&s.turn==='B'){const a=s.players.A.growth,b=s.players.B.growth;finish(s,a===b?null:a>b?'A':'B','R10最終比較');return;}
 if(s.turn==='B')s.round++;s.turn=other(s.turn);s.serial++;beginTurn(s);
}
function finish(s,winner,reason){s.phase='finished';s.result={winner,reason,growth:{A:s.players.A.growth,B:s.players.B.growth}};log(s,winner?`${winner}の勝利`:'引き分け');}
export function stats(s,a){const p=s.players[a],b=p.board;if(!b.main)return null;const c=card(s,b.main);let power=c.power,wisdom=c.wisdom;
 if(b.world&&card(s,b.world).id==='W-deepsea'&&p.hand.length<=2){power++;wisdom++;}
 const o=s.players[other(a)].board;if(b.world&&o.world){for(const id of b.companions)if(card(s,id).id==='C-chameleon'){if(card(s,b.world).id===card(s,o.world).id)wisdom++;else power++;}}
 return {power,wisdom};
}
export function mainCost(from,to){const c=CARDS[to],old=from?CARDS[from]:null;if(!c||c.type!=='main')return null;if(!old)return c.stage;if(old.species===c.species)return c.stage>old.stage?c.stage-old.stage:null;return c.stage;}
function listActions(s){
 const a=actor(s);if(!a)return [];const p=s.players[a],b=p.board,o=s.players[other(a)],out=[];
 const add=(kind,label,data={})=>out.push({kind,label,...data});
 if(s.choice){for(const option of s.choice.options)add('choose',option.label,{value:option.id});return out;}
 if(s.phase==='trigger'){
  for(const t of s.pending.filter(t=>t.actor===a)){add('trigger',`${title(s,t.source)}の能力を発動`,{source:t.source,trigger:t.kind});add('skip',`${title(s,t.source)}を見送る`,{source:t.source});}return out;
 }
 const normal=s.phase==='normal';
 if(normal){
  for(const id of p.hand){const c=card(s,id);
   if(c.type==='main'){const cost=mainCost(b.main?card(s,b.main).id:null,c.id);if(cost!==null&&p.time>=cost)add('place',`${c.name}を${b.main?'へんしん':'たんじょう'}（時${cost}）`,{source:id,slot:'main',cost});}
   if(c.type==='companion'&&!p.personUsed){if(b.companions.length<3)add('place',`${c.name}をなかまへ`,{source:id,slot:'companions',cost:0});else for(const target of b.companions)add('place',`${c.name}を出す／${title(s,target)}と交代`,{source:id,target,slot:'companions',cost:0});}
   if(c.type==='partner'&&!p.personUsed&&!b.partner)add('place',`${c.name}と交際開始`,{source:id,slot:'partner',cost:0});
   if(c.type==='world'&&p.time>=2)add('place',`${c.name}を配置（時2）`,{source:id,slot:'world',cost:2});
   if(['I-sleepboost1','I-bowtie'].includes(c.id)&&p.time>=c.cost&&b.prepared.length<3){const targets=c.id==='I-sleepboost1'?[b.main]:[b.main,b.partner,...b.companions];for(const target of targets.filter(Boolean))add('place',`${c.name} → ${title(s,target)}（時${c.cost}）`,{source:id,slot:'prepared',target,cost:c.cost});}
  }
  if(b.main&&b.partner&&p.relationship<4&&!p.relationshipUsed&&p.time>=1)add('relationship',`交際を進める ${p.relationship}→${p.relationship===3?'結婚':p.relationship+1}（時1）`);
  if(b.main&&o.board.main&&!p.challengeUsed)for(const parameter of ['power','wisdom'])add('challenge',`${parameter==='power'?'ちから':'ちえ'}でちょうせん`,{parameter});
 }
 if(s.turn===a)for(const source of b.companions)if(card(s,source).id==='C-cat_friend'&&!p.used.includes(token(s,source)))for(const target of p.discard)if(card(s,target).type==='companion'&&card(s,target).id!=='C-cat_friend')add('ability',`${title(s,source)} → ${title(s,target)}を回収`,{source,target});
 for(const source of p.hand){const c=card(s,source);if(p.time<c.cost)continue;
  const play=(data={},suffix='')=>add('play',`${c.name}${suffix}（時${c.cost}）`,{source,...data});
  if(['I-c_coin2','G-area-claim'].includes(c.id))play();
  if(c.id==='G-hit-blow')for(const declare of types)play({declare},`／${TYPE_NAMES[declare]}を宣言`);
  if(c.id==='E-first-date'&&b.partner)play({target:b.partner},` → ${title(s,b.partner)}`);
  if(c.id==='G-animal-shogi')for(const target of p.discard)if(card(s,target).type==='companion')play({target},` → ${title(s,target)}`);
  if(c.id==='G-archery-3d'&&b.world)for(const e of o.board.prepared)if(card(s,e.id).cost<=2)play({target:e.id},` → 相手の${title(s,e.id)}`);
 }
 add('pass',normal?'ターン終了を申し出る':'パス');return out;
}
export function legalActions(s){return listActions(s).map(a=>({...a,id:JSON.stringify(Object.fromEntries(Object.entries(a).filter(([k])=>k!=='label')))}));}
export function act(state,who,revision,id){
 if(who!==actor(state)||revision!==state.revision)throw Error('手番または操作の版が変わりました');
 const action=legalActions(state).find(a=>a.id===id);if(!action)throw Error('今は選べない行動です');
 const s=clone(state);execute(s,action);s.revision++;s.commands.push(id);validate(s);return s;
}
function activate(s,link){s.chain.push(link);s.phase='response';s.priority=link.actor;s.passes=0;if(s.window==='end_request')s.window='normal';log(s,`${link.actor}：${title(s,link.source)}を発動`);}
function execute(s,a){const who=actor(s),p=s.players[who],b=p.board;
 if(a.kind==='choose'){const q=s.choice;s.choice=null;
  if(['egg_bottom','birth_bottom','sleep_bottom'].includes(q.kind)){remove(p.hand,a.value);p.deck.push(a.value);if(q.kind==='birth_bottom')draw(s,who);}
  if(q.kind==='look'){if(a.value==='bottom'&&p.deck.length)p.deck.push(p.deck.shift());}
  log(s,`${who}：${q.kind==='look'?'山札の位置を選択':'手札1枚を山札下へ'}`);
  if(q.resume==='start')startWindow(s);else resolveChain(s);return;
 }
 if(a.kind==='trigger'||a.kind==='skip'){
  const i=s.pending.findIndex(t=>t.source===a.source),t=s.pending.splice(i,1)[0];
  if(a.kind==='trigger'){s.chain.push({actor:who,source:t.source,kind:t.kind,ability:true});log(s,`${who}：${title(s,t.source)}の能力を発動`);s.priority=who;}
  if(!s.pending.length){s.phase='response';s.passes=0;}return;
 }
 if(a.kind==='place'){
  p.time-=a.cost;remove(p.hand,a.source);const birth=a.slot==='main'&&!b.main;
  if(a.target&&a.slot==='companions')discardField(s,who,a.target);
  if(['main','world'].includes(a.slot)&&b[a.slot])discardField(s,who,b[a.slot]);
  enter(s,a.source);
  if(a.slot==='prepared')b.prepared.push({id:a.source,target:a.target,targetGeneration:s.cards[a.target].generation});
  else if(a.slot==='companions')b.companions.push(a.source);else b[a.slot]=a.source;
  if(['partner','companions'].includes(a.slot))p.personUsed=true;
  if(a.slot==='partner')p.relationship=0;
  log(s,`${who}：${title(s,a.source)}を配置（時${a.cost}）`);
  triggers(s,birth&&card(s,a.source).id==='M-beetle-01'?[{actor:who,source:a.source,kind:'birth'}]:[],'normal');return;
 }
 if(a.kind==='relationship'){p.time--;p.relationship++;p.relationshipUsed=true;if(p.relationship===4)grow(s,who,10);log(s,`${who}：交際${p.relationship===4?'結婚':p.relationship}`);window(s);return;}
 if(a.kind==='challenge'){p.challengeUsed=true;s.challenge={parameter:a.parameter,participants:{A:s.players.A.board.main,B:s.players.B.board.main}};log(s,`${who}：ちょうせんを宣言`);window(s,'compare');return;}
 if(a.kind==='ability'){
  p.used.push(token(s,a.source));remove(b.companions,a.source);p.deck.push(a.source);for(const e of [...b.prepared])if(e.target===a.source)discardField(s,who,e.id);
  if(s.phase==='normal')s.window='normal';activate(s,{actor:who,source:a.source,target:a.target,kind:'cat',ability:true});return;
 }
 if(a.kind==='play'){
  if(s.phase==='normal')s.window='normal';p.time-=card(s,a.source).cost;remove(p.hand,a.source);
  activate(s,{actor:who,source:a.source,target:a.target??null,targetGeneration:a.target?s.cards[a.target].generation:null,declare:a.declare??null,kind:card(s,a.source).id,ability:false});return;
 }
 if(a.kind==='pass'){
  if(s.phase==='normal'){window(s,'end_request',other(who));s.passes=1;return;}
  s.passes++;if(s.passes<2){s.priority=other(who);return;}
  if(s.chain.length){resolveChain(s);return;}
  if(s.window==='end_request'){endWindow(s);return;}
  if(s.window==='end'){endTurn(s);return;}
  if(s.window==='compare'){
   const values={A:stats(s,'A')[s.challenge.parameter],B:stats(s,'B')[s.challenge.parameter]};const winner=values.A===values.B?null:values.A>values.B?'A':'B';if(winner)grow(s,winner,5);log(s,`ちょうせん ${values.A}対${values.B}：${winner?winner+' +5':'引き分け'}`);window(s,'challenge_end');return;
  }
  if(s.window==='challenge_end')s.challenge=null;
  s.phase='normal';s.priority=s.turn;s.passes=0;
 }
}
function resolveChain(s){
 s.phase='resolving';
 while(s.chain.length){const l=s.chain.pop(),p=s.players[l.actor],b=p.board;
  const sameTarget=()=>l.target&&s.cards[l.target].generation===l.targetGeneration;
  log(s,`${l.actor}：${title(s,l.source)}を解決`);
  let choice=null;
  if(l.kind==='I-c_coin2'&&p.deck.length){const top=p.deck.shift();log(s,`公開：${title(s,top)}`);p.deck.push(top);if(card(s,top).type==='main')grow(s,l.actor,5);else draw(s,l.actor);}
  if(l.kind==='G-hit-blow'&&p.deck.length){const top=p.deck.shift();log(s,`公開：${title(s,top)}`);if(card(s,top).type===l.declare){p.hand.push(top);grow(s,l.actor,5);}else {p.deck.push(top);draw(s,l.actor);}}
  if(l.kind==='E-first-date'&&sameTarget()&&b.partner===l.target&&p.relationship===0){draw(s,l.actor);grow(s,l.actor,5);}
  if(l.kind==='G-area-claim'){const count=[b.main,b.partner,b.world].filter(Boolean).length+b.companions.length+b.prepared.length;if(count>=7)grow(s,l.actor,count===9?15:10);}
  if(l.kind==='G-archery-3d'&&sameTarget()){const o=other(l.actor);if(s.players[o].board.prepared.some(e=>e.id===l.target)&&card(s,l.target).cost<=2)discardField(s,o,l.target);}
  if(['G-animal-shogi','cat'].includes(l.kind)&&p.discard.includes(l.target)){
   remove(p.discard,l.target);p.hand.push(l.target);
   if(l.kind==='G-animal-shogi'&&p.deck.length)choice={kind:'look',options:[{id:'top',label:'一番上に戻す'},{id:'bottom',label:'一番下に置く'}]};
  }
  if(l.kind==='birth')choice={kind:'birth_bottom',options:p.hand.map(id=>({id,label:title(s,id)}))};
  if(l.kind==='sleep'){draw(s,l.actor,2);choice={kind:'sleep_bottom',options:p.hand.map(id=>({id,label:title(s,id)}))};}
  if(l.kind==='bowtie')draw(s,l.actor);
  if(!l.ability)p.discard.push(l.source);
  if(choice){if(requestChoice(s,l.actor,choice.kind,choice.options,'chain'))return;if(l.kind==='birth')draw(s,l.actor);}
 }
 window(s,s.window,s.turn);
}
export function validate(s){
 if(s.version!==VERSION||!Number.isSafeInteger(s.revision)||s.revision!==s.commands.length||!['A','B'].includes(s.turn)||!Number.isInteger(s.round)||s.round<1||s.round>10)throw Error('状態形式が不正です');
 const located=[];
 for(const a of ['A','B']){const p=s.players[a],b=p.board;if(!Number.isInteger(p.time)||p.time<0||p.time>10||p.growth<0||p.growth>100||p.growth%5||b.companions.length>3||b.prepared.length>3)throw Error('資源または枠が不正です');
  const ids=[...p.deck,...p.hand,...p.discard,...[b.main,b.partner,b.world].filter(Boolean),...b.companions,...b.prepared.map(e=>e.id)];
  if(ids.some(id=>!s.cards[id]||s.cards[id].owner!==a||!CARDS[s.cards[id].cardId]))throw Error('カード所有者が不正です');located.push(...ids);
  for(const e of b.prepared)if(![b.main,b.partner,...b.companions].includes(e.target)||s.cards[e.target].generation!==e.targetGeneration)throw Error('装備対象が不正です');
 }
 located.push(...s.chain.filter(l=>!l.ability).map(l=>l.source));if(located.length!==80||new Set(located).size!==80||located.some(id=>!s.cards[id]))throw Error('カード保存則が破れました');
 return true;
}
export function view(s,viewer){
 if(!['A','B',null].includes(viewer))throw Error('閲覧者が不正です');
 const describe=id=>({...card(s,id),cardId:card(s,id).id,id,name:title(s,id)});
 const players={};for(const a of ['A','B']){const p=s.players[a],b=p.board;players[a]={time:p.time,growth:p.growth,relationship:p.relationship,handCount:p.hand.length,deckCount:p.deck.length,discard:p.discard.map(describe),stats:stats(s,a),board:{main:b.main?describe(b.main):null,partner:b.partner?describe(b.partner):null,world:b.world?describe(b.world):null,companions:b.companions.map(describe),prepared:b.prepared.map(e=>({...describe(e.id),target:title(s,e.target)}))}};if(a===viewer)players[a].hand=p.hand.map(describe);}
 const choice=s.choice&&s.choice.actor===viewer?{kind:s.choice.kind,peek:s.choice.kind==='look'?describe(s.players[viewer].deck[0]):null}:null;
 return {round:s.round,turn:s.turn,actor:actor(s),phase:s.phase,revision:s.revision,result:s.result,players,choice,chain:s.chain.map(l=>({actor:l.actor,name:title(s,l.source),target:l.target?title(s,l.target):null,declare:l.declare?TYPE_NAMES[l.declare]:null})),log:s.log.slice(-60),actions:viewer===actor(s)?legalActions(s):[]};
}
export function save(s){validate(s);return JSON.stringify({version:VERSION,seed:s.seed,commands:s.commands});}
export function restore(text){const data=JSON.parse(text);if(data.version!==VERSION||!Array.isArray(data.commands)||data.commands.length>10000||Object.keys(data).sort().join()!=='commands,seed,version')throw Error('保存形式が異なります');let s=createGame(data.seed);for(const id of data.commands)s=act(s,actor(s),s.revision,id);return s;}
