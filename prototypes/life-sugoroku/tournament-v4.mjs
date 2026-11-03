// Tournament bookkeeping only. Scores come exclusively from the original game
// callback in an isolated host; no random or difficulty-based score synthesis.
export const POOLS=Object.freeze({quick:Object.freeze(["eat", "dodge", "catch", "mash", "clean", "stop", "swipe", "medicine", "find", "charge", "partner", "season", "jump", "pull", "pet", "button", "flames", "coins", "cliff", "throw", "flee", "mole", "slice", "guard", "bento", "lift", "tickle", "balance", "color", "count", "bigger", "odd", "order", "holdlid", "umbrella", "shutter", "sort", "trace", "pushbox", "fish", "stack", "pair", "doors", "feather", "weather"]),game:Object.freeze(['lights-out','takoyaki-grill'])});
export const GAME_NAMES=Object.freeze({defend:"旧V4クイック","eat": "たべろ！", "dodge": "よけろ！", "catch": "つかまえろ！", "mash": "れんだ！", "clean": "そうじしろ！", "stop": "とめろ！", "swipe": "スワイプ！", "medicine": "くすりをのませろ！", "find": "さがせ！", "charge": "ためて…はなせ！", "partner": "こいびとは？", "season": "きせつは？", "jump": "とべ！", "pull": "ひっぱれ！", "pet": "なでろ！", "button": "みどりでおせ！", "flames": "けせ！", "coins": "あつめろ！", "cliff": "とまれ！", "throw": "なげろ！", "knock": "たたけ！", "wait": "まて！", "flee": "にげろ！", "mole": "でたらたたけ！", "slice": "きれ！", "guard": "まもれ！", "bento": "つめろ！", "spin": "まわせ！", "lift": "もちあげろ！", "tickle": "くすぐれ！", "balance": "バランス！", "color": "いろは？", "count": "いくつ？", "bigger": "おおきいほう！", "odd": "ちがうの！", "order": "じゅんばんに！", "holdlid": "おさえろ！", "umbrella": "あめがきたらかさ！", "shutter": "とれ！", "sort": "ごはんはひだり！", "rhythm": "リズム！", "trace": "なぞれ！", "pushbox": "おしだせ！", "fish": "ひいたら つれ！", "stack": "つめ！", "pair": "おなじの！", "doors": "どっち？", "sneak": "そっとはこべ！", "feather": "ふけ！", "weather": "てんきは？", "lights-out": "ライツアウト", "takoyaki-grill": "たこやきやさん"});
const need=v=>{if(!v)throw Error('正式ゲームの保存・対戦状態が不正です');};
const integer=(v,a,b)=>Number.isInteger(v)&&v>=a&&v<=b;
export function openTournament(s,pool,draw){
 need(POOLS[pool]);const all=POOLS[pool],choices=all.length>1?all.filter(id=>id!==s.lastOfficial):all;
 const index=draw(choices.length),seed=draw(4294967294)+1;need(integer(index,0,choices.length-1)&&integer(seed,1,4294967295));
 return {kind:'official',pool,gameId:choices[index],seed,landingPlayer:s.active,tileId:s.players[s.active].pos,requestId:`${s.id}:${s.revision}:official`,seat:0,attempt:null,scores:[],results:null};
}
export function validAttempt(a,m,p){
 if(!a||a.gameId!==m.gameId||a.seed!==m.seed||a.difficulty!==p.difficulty||a.cpu!==!p.human||!integer(a.frame,0,m.pool==='quick'?1800:3600)||!Array.isArray(a.inputs)||a.inputs.length>20000||typeof a.done!=='boolean')return false;
 if(a.done?!(integer(a.score,0,100)&&a.frame>0&&typeof a.summary==='string'&&a.summary.length<=1000):a.score!==undefined)return false;
 if(a.cpuSeed!==undefined&&!integer(a.cpuSeed,0,4294967295))return false;
 const pending=a.pendingInputs===undefined?[]:a.pendingInputs;
 if(!Array.isArray(pending)||pending.length+a.inputs.length>20000)return false;
 if(!pending.every((e,i)=>e&&integer(e.frame,a.frame+1,m.pool==='quick'?1800:3600)&&(i===0||e.frame>=pending[i-1].frame)&&['pointerdown','pointermove','pointerup','pointercancel'].includes(e.type)&&Number.isFinite(e.x)&&Number.isFinite(e.y)&&Math.abs(e.x)<=10000&&Math.abs(e.y)<=10000))return false;
 return a.inputs.every((e,i)=>e&&integer(e.frame,1,a.frame)&&(i===0||e.frame>=a.inputs[i-1].frame)&&['pointerdown','pointermove','pointerup','pointercancel'].includes(e.type)&&Number.isFinite(e.x)&&Number.isFinite(e.y)&&Math.abs(e.x)<=10000&&Math.abs(e.y)<=10000);
}
export function validateTournament(s,m){
 if(m?.kind!=='official'||!(POOLS[m.pool]?.includes(m.gameId)||(m.pool==='quick'&&m.gameId==='defend'))||!integer(m.seed,1,4294967295)||m.landingPlayer!==s.active||m.tileId!==s.players[s.active].pos||typeof m.requestId!=='string'||!integer(m.seat,0,s.players.length)||!Array.isArray(m.scores)||m.scores.length!==m.seat)return false;
 if(!m.scores.every((r,i)=>r.id===i&&integer(r.score,0,100)&&integer(r.frame,1,m.pool==='quick'?1800:3600)&&typeof r.summary==='string'))return false;
 if(m.seat===s.players.length)return m.attempt===null&&Array.isArray(m.results)&&m.results.length===m.seat&&m.results.every((r,i)=>r.id===i&&r.score===m.scores[i].score&&r.rank===1+m.scores.filter(q=>q.score>r.score).length&&r.reward===Math.max(0,20-5*r.rank));
 return m.results===null&&(m.attempt===null||!m.attempt.done&&validAttempt(m.attempt,m,s.players[m.seat]));
}
export function checkpoint(s,m,a){
 need(validateTournament(s,m)&&m.seat<s.players.length&&validAttempt(a,m,s.players[m.seat]));
 if(m.attempt){need((a.cpuSeed??m.seed)===(m.attempt.cpuSeed??m.seed));need(a.frame>=m.attempt.frame&&a.inputs.length>=m.attempt.inputs.length);need(m.attempt.inputs.every((e,i)=>['frame','type','x','y'].every(k=>e[k]===a.inputs[i][k])));}
 if(!a.done){m.attempt=structuredClone(a);return;}
 m.scores.push({id:m.seat,score:a.score,summary:a.summary,frame:a.frame});m.seat++;m.attempt=null;
 if(m.seat<s.players.length)return;
 m.results=m.scores.map(r=>{const rank=1+m.scores.filter(q=>q.score>r.score).length;return {...r,rank,reward:Math.max(0,20-rank*5)};});
 for(const r of m.results){const p=s.players[r.id],before={sodachi:p.sodachi,money:p.money};if(m.pool==='quick')p.money+=r.reward;else p.sodachi=Math.min(100,p.sodachi+r.reward);p.history.push({round:s.round,type:'official-game',gameId:m.gameId,pool:m.pool,rank:r.rank,score:r.score,reward:r.reward,text:`${GAME_NAMES[m.gameId]}で${r.rank}位。${m.pool==='quick'?'お金':'そだち'}＋${r.reward}。`,stage:p.stage,sodachi:p.sodachi,money:p.money,delta:{sodachi:p.sodachi-before.sodachi,money:p.money-before.money}});}
 s.lastOfficial=m.gameId;s.miniHistory.push({round:s.round,pool:m.pool,gameId:m.gameId,seed:m.seed,requestId:m.requestId,results:structuredClone(m.results)});
}
