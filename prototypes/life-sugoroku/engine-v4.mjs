// VERSION 4 engine. V2/V3 saves route through the preserved legacy engine.
// New tournaments use only the isolated official game host.
import * as legacy from './engine.mjs';
import {BOARD,TILE_SCHEMA} from './tiles-v4.mjs';
import {ITEMS,SCHEDULE} from './data.mjs';
import {PLAYER_SPECIES} from './canonical.mjs';
import * as rules from './rules-v4.mjs';
import {chooseText} from './numeric-text-v4.mjs';
import {EVENTS,eligibleEvents,offerEvent,applyEvent} from './events-v4.mjs';
import {openTournament,checkpoint,validateTournament,POOLS} from './tournament-v4.mjs';
export {BOARD};
export const rank=legacy.rank,serialize=legacy.serialize;
const copy=structuredClone;
const need=(v)=>{if(!v)throw Error('今はその操作ができません');};
const active=s=>s.players[s.active];
const clock=value=>Number.isFinite(value)?Math.max(0,value):0;
const int=(s,n)=>Math.floor(legacy.random(s)*n);
const result=(title,text,delta={sodachi:0,money:0})=>({kind:'result',title,text,delta});
function record(s,p,type,text,extra={}){p.history.push({round:s.round,type,text,stage:p.stage,sodachi:p.sodachi,money:p.money,...extra});}
function show(s,pending){s.pending=pending;s.phase=pending.kind==='choice'?'v4-choice':pending.kind==='event'?'event':'result';}

export function createGame(options){
 const players=options?.players;need(Array.isArray(players)&&players.length>=2&&players.length<=4);
 const padded=[...players];while(padded.length<4)padded.push(players[0]);
 const s=legacy.createGame({...options,players:padded});s.players=s.players.slice(0,players.length);
 s.version=4;s.rulesVersion=4;s.lastOfficial=null;s.id=`life-v4-${s.seed}-${s.rounds}-${players.length}`;
 for(const p of s.players){Object.assign(p,rules.initialRelations(),{numericRecent:{}});delete p.character.gender;delete p.character.orientationId;delete p.character.attractedTo;}
 return s;
}

function land(s){
 const p=active(s),tile=BOARD[p.pos],type=tile.type;
 if(['growth-plus','growth-minus','money-plus','money-minus'].includes(type)){
  const row=chooseText(type,tile.worldRegion,p.numericRecent,n=>int(s,n));
  const together=[...p.friends,...(p.partner?[p.partner]:[])];let text=row.text;
  if(together.length&&int(s,4)===0){const id=together[int(s,together.length)],npc=[...rules.FRIENDS,...rules.PARTNERS].find(n=>n.id===id);text+=` ${npc.label}「${type.endsWith('minus')?'こんな寄り道も、いつか思い出になるね。':'今日のこと、いっしょに覚えておこうね。'}」`;}
  show(s,{...rules.numeric(p,type,s.round,text),textId:row.id});return;
 }
 if(['friend','partner','friend-farewell','partner-farewell','time','transform'].includes(type)){show(s,rules.offer(p,type,n=>int(s,n),s.round));return;}
 if(type==='shop'){s.phase='shop';s.pending={kind:'shop',tileId:p.pos};return;}
 if(type==='item'){
  const id=Object.keys(ITEMS)[int(s,6)],full=p.items.length===3;if(!full)p.items.push(id);else p.money+=5;
  const text=full?'持ちものがいっぱい。贈りものをお金＋5にかえてもらった。':`贈りものは「${ITEMS[id].name}」。次の番から使えるよ。`;
  const r=result('届いた贈りもの',text,{sodachi:0,money:full?5:0});record(s,p,'item-gift',text,{item:id,delta:r.delta});show(s,r);return;
 }
 if(type==='quick'||type==='game'){
  s.phase='official';s.pending=openTournament(s,type,n=>int(s,n));return;
 }
 show(s,offerEvent(s,p,n=>int(s,n)));
}

// V3 authoritative edge-by-edge journey, with V4 landing semantics.
function journeyPhase(s){const m=s.pending;if(m.remaining===0){s.lastMove={player:s.active,path:[...m.path],dice:[...m.dice]};land(s);return;}s.phase=BOARD[active(s).pos].next.length>1?'branch':'moving';}
function step(s,to){const p=active(s),m=s.pending;need(m?.staged&&m.remaining>0&&BOARD[p.pos].next.includes(to));p.pos=to;p.walkPath=[...(p.walkPath||[m.path.at(-1)]),to].slice(-14);m.path.push(to);m.remaining--;journeyPhase(s);}
function drawDice(s,now=0){const p=active(s),dice=p.dieMode==='double'?[1+int(s,6),1+int(s,6)]:[1+int(s,p.dieMode==='slow'?3:6)];s.pending={dice,remaining:dice.reduce((a,b)=>a+b,0),path:[p.pos],staged:true,presentation:'rolling',deadline:clock(now)+15000};s.phase='dice';}
function endTurn(s){
 const p=active(s);record(s,p,'day','今日の発見を、ひとつ胸にしまった。');
 if(SCHEDULE[s.rounds].includes(s.round)&&p.evolvedRound!==s.round&&s.round>p.suppressUntil&&p.stage<8){const before=p.stage;p.stage++;p.evolvedRound=s.round;record(s,p,'evolve',`自然の成長：第${before}段階 → 第${p.stage}段階`,{before,after:p.stage});}
 p.turns++;p.used=false;p.bought=false;p.dieMode=null;s.pending=null;s.cpuPresentation=null;
 if(s.active<s.players.length-1){s.active++;s.phase='turn';return;}
 if(s.round===s.rounds){s.phase='done';return;}s.round++;s.active=0;s.phase='turn';
}

export function dispatch(state,c){
 need(state?.rulesVersion===4&&c?.revision===state.revision&&state.phase!=='done');

 if(c.type==='skip-cpu'){
  need(!active(state).human);let s=copy(state),count=0;
  while(!['result','official','official-result','v4-game-request','done'].includes(s.phase)){
   const action=cpuAction(s);need(action&&count++<256);s=dispatch(s,action);
  }
  // An already visible result advances once, just like its normal continue.
  if(count===0&&s.phase==='result')return dispatch(s,{type:'continue',revision:s.revision});
  s.cpuPresentation={skipped:true,text:active(s).history.filter(h=>h.round===s.round).map(h=>h.text).join(' ')};return s;
 }
 // Legacy item handling is reused unchanged (prices, clock, charm, seed, box).
 if(c.type==='item')return legacy.dispatch(state,c);
 const s=copy(state),p=active(s);
 switch(c.type){
  case 'roll':case 'dice-start':need(s.phase==='turn');drawDice(s,c.now);break;
  case 'dice-stop':need(s.phase==='dice'&&s.pending.presentation==='rolling');s.pending.presentation='settling';s.pending.deadline=clock(c.now)+1100;break;
  case 'dice-settle':need(s.phase==='dice'&&s.pending.presentation==='settling');delete s.pending.presentation;delete s.pending.deadline;if(p.rerolls>0)s.phase='reroll';else journeyPhase(s);break;
  case 'reroll':need(s.phase==='reroll');rules.spendReroll(p,s.round);drawDice(s,c.now);break;
  case 'accept-dice':need(s.phase==='reroll');journeyPhase(s);break;
  case 'step':need(s.phase==='moving'&&BOARD[p.pos].next.length===1);step(s,BOARD[p.pos].next[0]);break;
  case 'branch':need(s.phase==='branch');need(BOARD[p.pos].next.includes(c.to));p.routes.push({round:s.round,region:BOARD[p.pos].region,branch:c.to%12===2?'left':'right'});step(s,c.to);break;
  case 'choose':need(s.phase==='event'&&BOARD[p.pos].type==='event');show(s,applyEvent(s,p,s.pending,c.index));break;
  case 'select':need(s.phase==='v4-choice'&&BOARD[p.pos].type===s.pending.type);show(s,rules.select(p,s.pending,c.index,s.round));break;
  case 'buy':{
   need(s.phase==='shop'&&!p.bought&&p.items.length<3&&ITEMS[c.id]&&p.money>=ITEMS[c.id].price);
   p.money-=ITEMS[c.id].price;p.items.push(c.id);p.bought=true;p.purchases[c.id]=(p.purchases[c.id]||0)+1;
   const r=result('お買い物',`${ITEMS[c.id].name}を買った。`,{sodachi:0,money:-ITEMS[c.id].price});record(s,p,'buy',r.text,{item:c.id,delta:r.delta});show(s,r);break;
  }
  case 'leave-shop':need(s.phase==='shop');show(s,result('また今度','「また寄ってね」。店番さんに見送られて、旅を続ける。'));break;
  case 'official-open':need(s.phase==='v4-game-request');s.pending=openTournament(s,s.pending.pool,n=>int(s,n));s.phase='official';break;
  case 'official-checkpoint':need(s.phase==='official'&&c.requestId===s.pending.requestId&&c.seat===s.pending.seat);checkpoint(s,s.pending,c.snapshot);if(s.pending.results)s.phase='official-result';break;
  case 'continue':need(['result','official-result'].includes(s.phase));endTurn(s);break;
  default:throw Error('VERSION 4の未接続または不正な操作です');
 }
 s.revision++;return s;
}

export function restore(raw){
 need(typeof raw==='string'&&raw.length<3000000);const s=JSON.parse(raw);
 if(s?.rulesVersion!==4)return legacy.restore(raw);
 const integer=(v,min,max)=>Number.isInteger(v)&&v>=min&&v<=max;
 need(s.version===4&&s.stageId==='meguru-japan'&&[10,15,20].includes(s.rounds)&&integer(s.round,1,s.rounds)&&integer(s.revision,0,1000000)&&integer(s.rng,1,4294967295));
 need(Array.isArray(s.players)&&s.players.length>=2&&s.players.length<=4&&integer(s.active,0,s.players.length-1));
 need(['turn','dice','reroll','moving','branch','result','shop','v4-choice','v4-game-request','v4-event-request','event','official','official-result','done'].includes(s.phase));
 for(const [id,p] of s.players.entries()){
  need(p.id===id&&rules.validate(p)&&PLAYER_SPECIES.some(c=>c.id===p.character?.id));
  for(const [k,min,max]of[['pos',0,47],['stage',1,8],['sodachi',0,100],['money',0,100000],['turns',0,s.rounds],['suppressUntil',0,s.rounds+1],['evolvedRound',0,s.rounds],['youth',0,2]])need(integer(p[k],min,max));
  need(typeof p.human==='boolean'&&['easy','normal'].includes(p.difficulty)&&['used','bought','charm'].every(k=>typeof p[k]==='boolean')&&[null,'double','slow'].includes(p.dieMode));
  need(Array.isArray(p.items)&&p.items.length<=3&&p.items.every(id=>ITEMS[id])&&Array.isArray(p.history)&&p.history.length<=1000&&p.history.every(h=>h&&typeof h.text==='string'&&typeof h.type==='string'&&integer(h.round,1,s.rounds)));
  need(p.numericRecent&&typeof p.numericRecent==='object'&&!Array.isArray(p.numericRecent));
  need(Array.isArray(p.walkPath)&&p.walkPath.length>0&&p.walkPath.length<=14&&p.walkPath.at(-1)===p.pos&&p.walkPath.every((n,i)=>integer(n,0,47)&&(i===0||BOARD[p.walkPath[i-1]].next.includes(n))));
  need(Array.isArray(p.routes)&&Array.isArray(p.seen)&&Array.isArray(p.redone));
  for(const book of [p.purchases,p.uses])need(book&&typeof book==='object'&&!Array.isArray(book)&&Object.entries(book).every(([id,count])=>Object.hasOwn(ITEMS,id)&&integer(count,0,100)));
  need(p.turns===(s.phase==='done'?s.rounds:s.round-1+(id<s.active?1:0)));
  need(p.rerollLedger.every(h=>h.round<=s.round));
 }
 need(Array.isArray(s.miniHistory)&&s.miniHistory.length<=s.rounds*s.players.length);
 need(s.lastOfficial==null||s.lastOfficial==='defend'||Object.values(POOLS).flat().includes(s.lastOfficial));
 const p=active(s),m=s.pending;
 if(['dice','reroll','moving','branch'].includes(s.phase)){
  need(m?.staged===true&&m.dice?.length===(p.dieMode==='double'?2:1)&&m.dice.every(v=>v<=(p.dieMode==='slow'?3:6))&&Array.isArray(m.dice)&&m.dice.length>=1&&m.dice.length<=2&&m.dice.every(v=>integer(v,1,6))&&integer(m.remaining,1,12));
  need(Array.isArray(m.path)&&m.path.length>0&&m.path.at(-1)===p.pos&&m.path.every((n,i)=>integer(n,0,47)&&(i===0||BOARD[m.path[i-1]].next.includes(n)))&&m.remaining+m.path.length-1===m.dice.reduce((a,b)=>a+b,0));
  if(s.phase==='dice')need(['rolling','settling'].includes(m.presentation)&&Number.isFinite(m.deadline)&&m.path.length===1);
  if(s.phase==='reroll')need(p.rerolls>0&&m.path.length===1);
  if(s.phase==='moving')need(BOARD[p.pos].next.length===1);
  if(s.phase==='branch')need(BOARD[p.pos].next.length>1);
 }
 if(['official','official-result'].includes(s.phase))need(BOARD[p.pos].type===m?.pool&&validateTournament(s,m)&&(s.phase==='official-result')===(m.results!==null));
 if(s.phase==='v4-choice')need(BOARD[p.pos].type===m?.type&&rules.validateOffer(p,m));
 if(s.phase==='event')need(BOARD[p.pos].type==='event'&&m?.kind==='event'&&eligibleEvents({...s,recent:[]},p).some(e=>e.id===m.eventId));
 need(Array.isArray(s.recent)&&s.recent.length<=3&&s.recent.every(id=>EVENTS.some(e=>e.id===id)));
 if(s.phase==='result')need(m?.kind==='result'&&typeof m.text==='string'&&typeof m.title==='string'&&Number.isInteger(m.delta?.sodachi)&&Number.isInteger(m.delta?.money));
 if(s.phase==='shop')need(m?.kind==='shop'&&m.tileId===p.pos&&BOARD[p.pos].type==='shop');
 if(s.phase==='v4-game-request')need(['quick','game'].includes(m?.pool)&&m.tileId===p.pos&&BOARD[p.pos].type===m.pool&&m.landingPlayer===s.active&&typeof m.requestId==='string');
 if(s.phase==='v4-event-request')need(m?.tileId===p.pos&&BOARD[p.pos].type==='event'&&m.worldRegion===BOARD[p.pos].worldRegion&&typeof m.requestId==='string');
 if(s.phase==='done')need(s.round===s.rounds&&s.active===s.players.length-1&&s.players.every(p=>p.turns===s.rounds));
 return s;
}

// Pure deterministic policy. Decisions use a copy, never advance gameplay RNG
// while rendering, and never alter the dice or official minigame scores.
export function cpuAction(s){
 if(s.rulesVersion!==4)return legacy.cpuAction(s);
 const p=active(s),act=(type,extra={})=>({type,revision:s.revision,...extra});
 const pick=n=>int(copy(s),n),normal=p.difficulty==='normal';
 switch(s.phase){
  case 'turn':{
   const id=!p.used&&p.items.find(id=>id==='clock'?s.rewind&&p.stage>=4&&s.round<=s.rounds-3:id==='charm'?!p.charm:id==='seed'?p.sodachi<=97:true);
   return id?act('item',{id}):act('dice-start');
  }
  case 'dice':return act(s.pending.presentation==='rolling'?'dice-stop':'dice-settle');
  case 'reroll':return act(s.pending.dice.reduce((a,b)=>a+b,0)<(p.dieMode==='double'?6:3)?'reroll':'accept-dice');
  case 'moving':return act('step');
  case 'branch':return act('branch',{to:BOARD[p.pos].next[pick(BOARD[p.pos].next.length)]});
  case 'v4-choice':return act('select',{index:pick(s.pending.candidates.length)});
  case 'event':{
   const e=EVENTS.find(e=>e.id===s.pending.eventId);
   const index=normal?e.choices.reduce((a,c,i)=>c.sodachi*3+c.money>e.choices[a].sodachi*3+e.choices[a].money?i:a,0):pick(e.choices.length);
   return act('choose',{index});
  }
  case 'shop':{
   const ids=Object.keys(ITEMS).filter(id=>ITEMS[id].price<=p.money&&(id!=='clock'||s.rewind));
   if(p.bought||p.items.length>=3||!ids.length)return act('leave-shop');
   const id=normal?(ids.includes('seed')&&p.sodachi<95?'seed':ids.includes('charm')&&!p.charm?'charm':ids[pick(ids.length)]):ids[pick(ids.length)];
   return act('buy',{id});
  }
  case 'result':case 'official-result':return act('continue');
  case 'v4-game-request':return act('official-open');
  // The official host owns game input. Never synthesize a score here.
  default:return null;
 }
}
export function album(s){
 if(s.rulesVersion!==4)return legacy.album(s);
 need(s.phase==='done');
 return {id:s.id,version:4,seed:s.seed,rounds:s.rounds,players:rank(s).map(p=>copy({id:p.id,character:p.character,rank:p.rank,sodachi:p.sodachi,money:p.money,stage:p.stage,friends:p.friends,partner:p.partner,married:p.married,rerollLedger:p.rerollLedger,history:p.history}))};
}
