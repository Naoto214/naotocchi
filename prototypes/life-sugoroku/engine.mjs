import {PARTNER_PROFILES} from './profiles.mjs';
import {BOARD,EVENTS,ITEMS,SCHEDULE,MINI_NAMES} from './data.mjs';
const copy=x=>JSON.parse(JSON.stringify(x));
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const need=(ok,msg='今はその操作ができません')=>{if(!ok)throw Error(msg);};
export function random(s){let x=s.rng|0;x^=x<<13;x^=x>>>17;x^=x<<5;s.rng=x>>>0;return s.rng/4294967296;}
const int=(s,n)=>Math.floor(random(s)*n);
const active=s=>s.players[s.active];
const log=(s,p,type,text,extra={})=>p.history.push({round:s.round,type,text,stage:p.stage,sodachi:p.sodachi,money:p.money,...extra});
export function createGame({seed=1,rounds=15,players,miniEvery=2,rewind=true}={}){
 need([10,15,20].includes(rounds)&&[1,2].includes(miniEvery),'モードが不正です');need(Array.isArray(players)&&players.length===4,'4席を設定してください');
 return {version:1,id:`life-${seed>>>0}-${rounds}`,seed:seed>>>0,rng:(seed>>>0)||1,rounds,miniEvery,rewind,round:1,active:0,revision:0,phase:'turn',pending:null,recent:[],miniHistory:[],players:players.map((p,i)=>({id:i,character:copy(p.character),human:!!p.human,difficulty:p.difficulty==='easy'?'easy':'normal',pos:0,stage:1,sodachi:20,money:20,turns:0,items:['clock'],used:false,bought:false,charm:false,dieMode:null,suppressUntil:0,youth:0,redone:[],seen:[],history:[],routes:[],purchases:{},uses:{},evolvedRound:0}))};
}
export function rank(s){const a=s.players.map(p=>({...p})).sort((a,b)=>b.sodachi-a.sodachi||b.money-a.money);a.forEach((p,i)=>p.rank=i&&p.sodachi===a[i-1].sodachi&&p.money===a[i-1].money?a[i-1].rank:i+1);return a;}
export const growthGain=(s,value)=>s.rounds===20&&value>0?Math.max(1,Math.floor(value*.75)):value;
function reward(s,p,sd=0,m=0){sd=growthGain(s,sd);if((sd<0||m<0)&&p.charm){p.charm=false;sd=Math.max(0,sd);m=Math.max(0,m);log(s,p,'item','おまもりが、困ったできごとを一度だけふせいだ。');}const before=[p.sodachi,p.money];p.sodachi=clamp(p.sodachi+sd,0,100);p.money=Math.max(0,p.money+m);return {sodachi:p.sodachi-before[0],money:p.money-before[1]};}
function changeStage(s,p,amount,cause){const before=p.stage;p.stage=clamp(p.stage+amount,1,8);if(p.stage===before)return; if(amount>0)p.evolvedRound=s.round;else {p.suppressUntil=s.round+1;p.youth=2;}log(s,p,amount>0?'evolve':'rewind',`${cause}：第${before}段階 → 第${p.stage}段階`,{before,after:p.stage});}
function endTurn(s){const p=active(s);log(s,p,'day','今日の発見を、ひとつ胸にしまった。');if(SCHEDULE[s.rounds].includes(s.round)&&p.evolvedRound!==s.round&&s.round>p.suppressUntil)changeStage(s,p,1,'自然の成長');p.turns++;p.used=false;p.bought=false;p.dieMode=null;
 if(s.active<3){s.active++;s.phase='turn';s.pending=null;}else if(s.round%s.miniEvery===0){startMini(s);}else nextRound(s);
}
function nextRound(s){s.pending=null;if(s.round===s.rounds){s.phase='done';return;}s.round++;s.active=0;s.phase='turn';}
export function eligibleEvents(s,p=active(s),category){const region=BOARD[p.pos].region;let pool=EVENTS.filter(e=>!p.seen.includes(e.id)&&p.stage>=e.stages[0]&&p.stage<=e.stages[1]&&e.regions.includes(region)&&(!category||e.category===category));const fresh=pool.filter(e=>!s.recent.includes(e.id));return fresh.length?fresh:pool;}
function offerEvent(s,category){let pool=eligibleEvents(s,active(s),category);if(!pool.length&&category!=='fate')pool=eligibleEvents(s);if(!pool.length){result(s,'小さな休息','風の音を聞きながら、今日のことを思い出した。',2,0);return;}const e=pool[int(s,pool.length)];s.phase='event';s.pending={eventId:e.id};}
function result(s,title,text,sd=0,m=0){const p=active(s),delta=reward(s,p,sd,m);log(s,p,'tile',text,{title,delta});s.phase='result';s.pending={title,text,delta};}
function land(s){const tile=BOARD[active(s).pos];switch(tile.type){case'plus':result(s,'おこづかい','道ばたのお手伝い。「ありがとう」が、おこづかいになった。',2,5);break;case'minus':result(s,'あれれ、うっかり','荷物を落としてしまった。拾って、深呼吸。明日は気をつけよう。',-2,-5);break;case'event':offerEvent(s);break;case'social':offerEvent(s,'friend');break;case'fate':offerEvent(s,'fate');break;case'item':{const p=active(s),id=Object.keys(ITEMS)[int(s,6)];let text;if(p.items.length<3){p.items.push(id);text=`包みの中には「${ITEMS[id].name}」。次の番から使えるよ。`;}else{text='持ちものがいっぱい。贈りものをお金＋5にかえてもらった。';reward(s,p,0,5);}result(s,'届いた贈りもの',text,2,0);break;}case'facility':result(s,'よりみち商店','店番さんと、おしゃべり。次の番に出発前のお買いものができるよ。',3,3);break;}}
function advance(s){while(s.pending.remaining>0){const tile=BOARD[active(s).pos];if(tile.next.length>1){s.phase='branch';return;}active(s).pos=tile.next[0];s.pending.path.push(active(s).pos);s.pending.remaining--;}const path=s.pending.path, dice=s.pending.dice;land(s);s.lastMove={player:s.active,path,dice};}
// The pending journey is authoritative and saved after every edge.
function journeyPhase(s){
 const m=s.pending;
 if(m.remaining===0){const path=m.path,dice=m.dice;land(s);s.lastMove={player:s.active,path,dice};return;}
 s.phase=BOARD[active(s).pos].next.length>1?'branch':'moving';
}
function journeyStep(s,to){const p=active(s),m=s.pending;need(m?.staged&&m.remaining>0&&BOARD[p.pos].next.includes(to));p.pos=to;m.path.push(to);m.remaining--;journeyPhase(s);}
function choose(s,index){const p=active(s),e=EVENTS.find(e=>e.id===s.pending.eventId);need(e&&Number.isInteger(index)&&e.choices[index]);const c=e.choices[index];p.seen.push(e.id);s.recent=[...s.recent,e.id].slice(-3);const youth=p.youth>0?1:0;if(youth)p.youth--;const delta=reward(s,p,c.sodachi+youth,c.money);if(c.evolve)changeStage(s,p,c.evolve,'人生の節目');if(c.time)changeStage(s,p,c.time,'時間のいたずら');const text=eventText(p,e,c);log(s,p,'event',text,{eventId:e.id,choice:index,title:eventTitle(p,e),category:e.category,npc:e.npc||null,delta,album:e.album});s.phase='result';s.pending={title:eventTitle(p,e),text,delta};if(c.redo){const candidates=redoCandidates(p);if(candidates.length){s.phase='redo';s.pending={candidates};}}}
export function canRomance(character,event){
 const npc=PARTNER_PROFILES[event.npc];
 if(!npc||character.id===event.npc)return false;
 const targets=c=>{
  if(!c.gender||!c.orientationId||['aro','questioning'].includes(c.orientationId))return [];
  if(Array.isArray(c.attractedTo))return c.attractedTo;
  if(['pan','bi'].includes(c.orientationId))return ['male','female','nonbinary'];
  if(c.orientationId==='gay')return [c.gender];
  return c.gender==='nonbinary'?['male','female']:[c.gender==='male'?'female':'male'];
 };
 return targets(character).includes(npc.gender)&&targets(npc).includes(character.gender);
}
export function eventTitle(p,e){return e.category==='romance'&&!canRomance(p.character,e)?e.friendshipTitle||e.title:e.title;}
export function eventText(p,e,c){return e.category==='romance'&&!canRomance(p.character,e)?(c?.friendshipText||e.friendshipText||c?.text||e.text):(c?.text||e.text);}
export function redoCandidates(p){return p.redone.length>=2?[]:p.history.filter(h=>h.type==='event'&&!p.redone.includes(h.eventId)&&EVENTS.find(e=>e.id===h.eventId)?.category!=='fate').map(h=>({eventId:h.eventId,choice:h.choice,title:h.title}));}
function redo(s,id){const p=active(s),h=redoCandidates(p).find(x=>x.eventId===id);need(h);const e=EVENTS.find(e=>e.id===id),choice=h.choice===0?1:0,c=e.choices[choice];p.redone.push(id);const delta=reward(s,p,Math.min(2,c.sodachi),Math.min(5,c.money));const text=`あの日とは違う道を選んだ。${eventText(p,e,c)}`;log(s,p,'redo',text,{eventId:id,choice,delta,title:e.title});s.phase='result';s.pending={title:'人生のやりなおし',text,delta};}
export function toggleLights(cells,index){const out=[...cells];for(const j of [index,index-3,index+3,index%3?index-1:-1,index%3<2?index+1:-1])if(j>=0&&j<9)out[j]=1-out[j];return out;}
function makeChallenge(s,kind){return kind===0?{delay:1200+int(s,2201)}:kind===1?{sequence:Array.from({length:5},()=>int(s,4))}:(()=>{let cells=Array(9).fill(0);const picks=[];while(picks.length<3){const i=int(s,9);if(!picks.includes(i))picks.push(i);}for(const i of picks)cells=toggleLights(cells,i);return {cells};})();}
function startMini(s){const kind=s.miniHistory.length%3;s.phase='mini';s.active=0;s.pending={kind,challenge:makeChallenge(s,kind),scores:[null,null,null,null],attempt:null};}
function miniScore(s,score){const m=s.pending;need(m.scores[s.active]===null);m.scores[s.active]=clamp(Math.round(score),0,100);m.attempt=null;if(s.active<3){s.active++;m.challenge=makeChallenge(s,m.kind);return;}const sorted=m.scores.map((score,id)=>({score,id})).sort((a,b)=>b.score-a.score);sorted.forEach((r,i)=>{r.rank=i&&r.score===sorted[i-1].score?sorted[i-1].rank:i+1;const p=s.players[r.id];const delta=reward(s,p,[4,2,1,0][r.rank-1],[8,5,3,1][r.rank-1]);log(s,p,'mini',`${MINI_NAMES[m.kind]}：${r.rank}位`,{score:r.score,delta});});s.miniHistory.push({round:s.round,kind:m.kind,results:sorted});s.phase='mini-result';s.pending={kind:m.kind,results:sorted};}
export function dispatch(state,command){need(command&&command.revision===state.revision,'古い操作です。画面を更新してください');const s=copy(state),p=active(s),c=command;need(s.phase!=='done','対戦は終了しました');
 if(c.type==='roll-start'){need(s.phase==='turn');const dice=p.dieMode==='double'?[1+int(s,6),1+int(s,6)]:[1+int(s,p.dieMode==='slow'?3:6)];s.pending={dice,remaining:dice.reduce((a,b)=>a+b,0),path:[p.pos],staged:true};journeyPhase(s);}
 else if(c.type==='step'){need(s.phase==='moving'&&s.pending?.staged&&BOARD[p.pos].next.length===1);journeyStep(s,BOARD[p.pos].next[0]);s.presentationSteps=(s.presentationSteps||0)+1;}
 else if(c.type==='roll'){need(s.phase==='turn');const dice=p.dieMode==='double'?[1+int(s,6),1+int(s,6)]:[1+int(s,p.dieMode==='slow'?3:6)];s.phase='moving';s.pending={dice,remaining:dice.reduce((a,b)=>a+b,0),path:[p.pos]};advance(s);}
 else if(c.type==='branch'){need(s.phase==='branch'&&BOARD[p.pos].next.includes(c.to));p.routes.push({round:s.round,region:BOARD[p.pos].region,branch:c.to%12===2?'left':'right'});if(s.pending.staged)journeyStep(s,c.to);else {p.pos=c.to;s.pending.path.push(c.to);s.pending.remaining--;s.phase='moving';advance(s);}}
 else if(c.type==='choose'){need(s.phase==='event');choose(s,c.index);}
 else if(c.type==='redo'){need(s.phase==='redo');redo(s,c.id);}
 else if(c.type==='skip-redo'){need(s.phase==='redo');s.phase='result';s.pending={title:'今を選ぶ',text:'昔の自分に、そっと手を振った。',delta:{sodachi:0,money:0}};}
 else if(c.type==='continue'){need(['result','mini-result'].includes(s.phase));s.phase==='result'?endTurn(s):nextRound(s);}
 else if(c.type==='buy'){need(s.phase==='turn'&&!p.bought&&p.items.length<3&&ITEMS[c.id]&&p.money>=ITEMS[c.id].price);p.money-=ITEMS[c.id].price;p.items.push(c.id);p.bought=true;p.purchases[c.id]=(p.purchases[c.id]||0)+1;log(s,p,'buy',`${ITEMS[c.id].name}を買った。`);}
 else if(c.type==='item'){need(s.phase==='turn'&&!p.used&&p.items.includes(c.id));need(c.id!=='clock'||p.stage>1,'第2段階から使えます');need(c.id!=='charm'||!p.charm,'おまもりは準備済みです');p.items.splice(p.items.indexOf(c.id),1);p.used=true;p.uses[c.id]=(p.uses[c.id]||0)+1;log(s,p,'item',`${ITEMS[c.id].name}を使った。`);if(c.id==='double'||c.id==='slow')p.dieMode=c.id;if(c.id==='charm')p.charm=true;if(c.id==='clock')changeStage(s,p,-2,'ときもどし時計');if(c.id==='seed')reward(s,p,3);if(c.id==='box'){const draw=int(s,3);if(draw===0)reward(s,p,3,0);if(draw===1)reward(s,p,0,10);if(draw===2)changeStage(s,p,1,'ふしぎな箱');}}
 else if(c.type==='mini-auto'){need(s.phase==='mini');const base=p.difficulty==='easy'?45:55;miniScore(s,base+int(s,41));}
 else if(c.type==='mini-start'){need(s.phase==='mini'&&!s.pending.attempt);s.pending.attempt={phase:s.pending.kind===1?'show':'play',inputs:[],cells:s.pending.challenge.cells?[...s.pending.challenge.cells]:null,moves:0,elapsed:0};}
 else if(c.type==='mini-ready'){need(s.phase==='mini'&&s.pending.attempt?.phase==='show');s.pending.attempt.phase='play';}
 else if(c.type==='mini-input'){need(s.phase==='mini'&&s.pending.attempt?.phase==='play');const m=s.pending,a=m.attempt;if(m.kind===0){need(Number.isFinite(c.ms)&&c.ms>=-1);miniScore(s,c.ms<0?0:100-c.ms/10);}else if(m.kind===1){need(Number.isInteger(c.index)&&c.index>=0&&c.index<4);a.inputs.push(c.index);if(a.inputs.length===5)miniScore(s,a.inputs.reduce((n,v,i)=>n+(v===m.challenge.sequence[i]?20:0),0));}else{need(Number.isInteger(c.index)&&c.index>=0&&c.index<9);a.cells=toggleLights(a.cells,c.index);a.moves++;a.elapsed+=Math.max(0,Math.min(60000,Number(c.elapsed)||0));if(a.cells.every(v=>!v))miniScore(s,100-Math.max(0,a.moves-3)*5-Math.floor(a.elapsed/5000));else if(a.moves>=20)miniScore(s,0);}}
 else if(c.type==='mini-pass'){need(s.phase==='mini');miniScore(s,0);}
 else throw Error('未知の操作');s.revision++;return s;
}
function policyPick(s,n){let x=(s.seed^Math.imul(s.revision-(s.presentationSteps||0)+1,0x9e3779b9)^Math.imul(s.active+1,0x85ebca6b))>>>0;x=Math.imul(x^(x>>>16),0x7feb352d);x=Math.imul(x^(x>>>15),0x846ca68b);return ((x^(x>>>16))>>>0)%n;}
export function cpuAction(s){const p=active(s),revision=s.revision;const act=(type,rest={})=>({type,revision,...rest});if(s.phase==='turn'){
 const normal=p.difficulty==='normal';if(!p.used){const id=p.items.find(id=>id==='clock'?s.rewind&&p.stage>=4&&s.round<=s.rounds-3:id==='charm'?!p.charm:id==='seed'?p.sodachi<=97:true);if(id)return act('item',{id});}
 if(!p.bought&&p.items.length<3&&p.money>=10){const choice=normal?(p.money>=20&&p.sodachi<90?'seed':p.money>=15&&s.rewind&&p.stage>=4&&s.round<s.rounds-4?'clock':'box'):Object.keys(ITEMS).filter(id=>ITEMS[id].price<=p.money&&(id!=='clock'||s.rewind))[policyPick(s,Object.keys(ITEMS).filter(id=>ITEMS[id].price<=p.money&&(id!=='clock'||s.rewind)).length)];if(p.money>=ITEMS[choice].price)return act('buy',{id:choice});}return act('roll');}
 if(s.phase==='moving')return act('step');
 if(s.phase==='branch'){const opts=BOARD[p.pos].next;const value=n=>({plus:3,event:4,minus:-3,social:4,item:2,fate:3,facility:3}[BOARD[n].type]);return act('branch',{to:p.difficulty==='easy'?opts[policyPick(s,opts.length)]:[...opts].sort((a,b)=>value(b)-value(a)||((s.round+p.id)%2?b-a:a-b))[0]});}
 if(s.phase==='event'){const e=EVENTS.find(e=>e.id===s.pending.eventId);const index=p.difficulty==='easy'?policyPick(s,e.choices.length):e.choices.reduce((best,c,i)=>c.sodachi*3+c.money/5+(c.evolve&&p.stage<8?1:0)>e.choices[best].sodachi*3+e.choices[best].money/5+(e.choices[best].evolve&&p.stage<8?1:0)?i:best,0);return act('choose',{index});}
 if(s.phase==='redo')return s.pending.candidates.length?act('redo',{id:s.pending.candidates[0].eventId}):act('skip-redo');
 if(s.phase==='mini')return act('mini-auto');return act('continue');
}
export const serialize=s=>JSON.stringify(s);
export function restore(raw){need(typeof raw==='string'&&raw.length<3000000,'セーブが大きすぎます');const s=JSON.parse(raw);need(s?.version===1&&[10,15,20].includes(s.rounds)&&[1,2].includes(s.miniEvery)&&Number.isInteger(s.rng)&&s.rng>0&&s.rng<=4294967295&&Number.isInteger(s.revision)&&s.revision>=0,'対応していないセーブです');need(Number.isInteger(s.round)&&s.round>=1&&s.round<=s.rounds&&Number.isInteger(s.active)&&s.active>=0&&s.active<4);need(['turn','moving','branch','event','result','redo','mini','mini-result','done'].includes(s.phase)&&s.players?.length===4);for(let i=0;i<4;i++){const p=s.players[i];need(p.id===i&&typeof p.character?.id==='string'&&typeof p.character.label==='string');for(const [key,min,max]of[['pos',0,47],['stage',1,8],['sodachi',0,100],['money',0,100000],['turns',0,s.rounds],['suppressUntil',0,s.rounds+1],['youth',0,2]])need(Number.isInteger(p[key])&&p[key]>=min&&p[key]<=max);need(Array.isArray(p.items)&&p.items.length<=3&&p.items.every(id=>ITEMS[id])&&Array.isArray(p.history)&&p.history.length<=1000&&Array.isArray(p.seen)&&Array.isArray(p.redone)&&p.redone.length<=2&&Array.isArray(p.routes));}need(Array.isArray(s.recent)&&Array.isArray(s.miniHistory));if(s.phase==='event')need(EVENTS.some(e=>e.id===s.pending?.eventId));if(s.phase==='branch')need(Number.isInteger(s.pending?.remaining)&&s.pending.remaining>0&&s.pending.remaining<=12&&BOARD[active(s).pos].next.length>1&&Array.isArray(s.pending.path));if(s.phase==='moving')need(s.pending?.staged===true&&Number.isInteger(s.pending.remaining)&&s.pending.remaining>0&&s.pending.remaining<=12&&BOARD[active(s).pos].next.length===1&&Array.isArray(s.pending.path));if(s.phase==='mini')need([0,1,2].includes(s.pending?.kind)&&s.pending.scores?.length===4&&s.pending.challenge);if(s.phase==='result')need(typeof s.pending?.text==='string');if(s.phase==='redo')need(Array.isArray(s.pending?.candidates));if(s.phase==='mini-result')need(s.pending?.results?.length===4);validateSnapshot(s);return s;}
export function album(s){need(s.phase==='done');return {id:s.id,seed:s.seed,rounds:s.rounds,players:rank(s).map(p=>({id:p.id,character:p.character,rank:p.rank,sodachi:p.sodachi,money:p.money,stage:p.stage,title:p.history.some(h=>h.type==='rewind')?'時を旅したひと':p.history.filter(h=>h.category==='friend').length>=2?'出会いをつないだひと':p.history.some(h=>h.category==='adventure')?'まだ見ぬ道の旅人':'小さな日々の発見者',history:p.history}))};}

function validateSnapshot(s){
 need(s.presentationSteps===undefined||(Number.isInteger(s.presentationSteps)&&s.presentationSteps>=0&&s.presentationSteps<=s.revision));
 const integer=(v,a,b)=>Number.isInteger(v)&&v>=a&&v<=b;
 const cells=v=>Array.isArray(v)&&v.length===9&&v.every(x=>x===0||x===1);
 for(const p of s.players){
  need(typeof p.human==='boolean'&&['easy','normal'].includes(p.difficulty));
  need(p.uses&&p.purchases&&typeof p.uses==='object'&&typeof p.purchases==='object');
  need(Object.entries(p.uses).every(([k,v])=>ITEMS[k]&&integer(v,0,100))&&Object.entries(p.purchases).every(([k,v])=>ITEMS[k]&&integer(v,0,100)));
  need(['used','bought','charm'].every(k=>typeof p[k]==='boolean')&&[null,'double','slow'].includes(p.dieMode));
  need(integer(p.evolvedRound,0,s.rounds)&&p.seen.every(id=>EVENTS.some(e=>e.id===id))&&p.redone.every(id=>p.seen.includes(id)));
  need(p.history.every(h=>h&&typeof h.text==='string'&&typeof h.type==='string'&&integer(h.round,1,s.rounds)));
 }
 if(s.phase==='branch'||s.phase==='moving'){const m=s.pending;need(Array.isArray(m.dice)&&m.dice.length>=1&&m.dice.length<=2&&m.dice.every(n=>integer(n,1,6))&&m.path.every(n=>integer(n,0,47)));if(m.staged){need(m.path.length>0&&m.path.at(-1)===active(s).pos&&m.remaining+m.path.length-1===m.dice.reduce((a,b)=>a+b,0));need(m.path.every((n,i)=>i===0||BOARD[m.path[i-1]].next.includes(n)));}}
 if(s.phase==='mini'){
  const m=s.pending,c=m.challenge,a=m.attempt;
  need(m.scores.every((v,i)=>i<s.active?integer(v,0,100):v===null));
  if(m.kind===0)need(integer(c.delay,1200,3400));
  if(m.kind===1)need(Array.isArray(c.sequence)&&c.sequence.length===5&&c.sequence.every(v=>integer(v,0,3)));
  if(m.kind===2)need(cells(c.cells));
  if(a){need((m.kind===1?['show','play'].includes(a.phase):a.phase==='play')&&Array.isArray(a.inputs)&&a.inputs.length<5&&a.inputs.every(v=>integer(v,0,3))&&integer(a.moves,0,19)&&Number.isFinite(a.elapsed)&&a.elapsed>=0);if(m.kind===2)need(cells(a.cells));}
 }
 if(s.phase==='redo'){
  const legal=redoCandidates(active(s));
  need(s.pending.candidates.every(c=>c&&legal.some(h=>h.eventId===c.eventId&&h.choice===c.choice&&h.title===c.title)));
 }
 if(s.phase==='mini-result'){
  const m=s.pending;need([0,1,2].includes(m.kind)&&new Set(m.results.map(r=>r?.id)).size===4);
  for(const r of m.results)need(r&&integer(r.id,0,3)&&integer(r.rank,1,4)&&integer(r.score,0,100));
 }
 if(s.phase==='done')need(s.players.every(p=>p.turns===s.rounds));
}
