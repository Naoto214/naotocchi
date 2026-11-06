// 試遊版のブラウザ確認用に、2人対戦の保存（R10・後攻Bの手番、AとBの両方が「人生延長（仮）」を手札に持つ局面）を作る。
// 試遊版と同じパッチ済みモジュール（build-trial.mjs --stage-only の .stage/）で、CPU に両席を指させて進める。
// 人生延長をしかける行動だけは選ばせない（ブラウザで人が操作して確かめるため）。対戦の進行そのものは本物のコマンドの列。
// 使い方: node trial/make-save.mjs <stageDir> <out.json>
import fs from 'node:fs';import path from 'node:path';import {pathToFileURL} from 'node:url';
const [stage,out]=process.argv.slice(2);const u=f=>pathToFileURL(path.join(path.resolve(stage),f)).href;
const e=await import(u('engine.mjs')),{observeCpu}=await import(u('cpu-observation.mjs')),{chooseCpuAction}=await import(u('cpu-policy.mjs')),{advanceResponses}=await import(u('auto-progress.mjs'));
const {CPU_DECKS}=await import(u('cpu-decks.mjs')),{newMetadata,encodeMatch}=await import(u('records-match.mjs'));
const X='X-life-extend';
// 試遊版 app.mjs の __lifeTrial.inject と同じ規則で1枚入れ替える。
function inject(list){const count=new Map();for(const id of list)if(!id.startsWith('M-'))count.set(id,(count.get(id)??0)+1);let pick=null;for(const [id,n] of count)if(!pick||n>count.get(pick))pick=id;const c=[...list];c[c.lastIndexOf(pick)]=X;return c;}
const deck=id=>inject(CPU_DECKS.find(d=>d.id===id).cards),decks={A:deck('balance'),B:deck('item')};
const holds=(s,a)=>s.players[a].hand.some(id=>s.cards[id].cardId===X);
for(let seed=1;seed<=400;seed++){
 let s=e.createGame(seed,decks),step={A:0,B:0};const adv=()=>{s=advanceResponses(s).state;};adv();
 for(let n=0;n<6000&&s.phase!=='finished';n++){
  if(s.round===10&&s.turn==='B'&&s.phase==='normal'&&!s.choice&&holds(s,'A')&&holds(s,'B')&&s.players.B.board.prepared.length<3&&s.players.A.board.prepared.length<3){
   const meta=newMetadata({mode:'hotseat',decks:{A:{id:null,name:'試験A（バランス）',cards:decks.A},B:{id:null,name:'試験B（アイテム・じゅんび）',cards:decks.B}}});
   const raw=encodeMatch(e.save(s),meta);fs.writeFileSync(out,raw);
   console.log(JSON.stringify({seed,round:s.round,turn:s.turn,growth:{A:s.players.A.growth,B:s.players.B.growth},commands:s.commands.length,final:s.life.final}));process.exit(0);}
  if(s.round>10)break;
  const a=e.actor(s),o=observeCpu(s,a),raw=e.legalActions(s);
  // CPU の候補から「人生延長をしかける／発動する」を除く（同じ順位付けで次点を選ぶ）。
  const keep=o.actions.map((x,i)=>i).filter(i=>!(raw[i].source&&s.cards[raw[i].source]?.cardId===X&&raw[i].kind!=='pass'));
  const sub={...o,actions:keep.map(i=>o.actions[i])};const d=chooseCpuAction(sub,{difficulty:'intermediate',seed:seed*7+(a==='A'?1:2),step:step[a]++});
  const i=keep[sub.actions.findIndex(x=>x.id===d.id)];s=e.act(s,a,s.revision,raw[i].id);adv();
 }
}
throw Error('条件に合う局面が見つかりません');
