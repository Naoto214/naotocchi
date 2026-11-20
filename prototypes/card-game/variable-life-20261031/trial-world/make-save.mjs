// 比較試遊版のブラウザ確認用に、方式ごとの2人対戦の保存（R8・先攻Aの手番、Aが XI・XII の両方を手札に持つ局面）を作る。
// 試遊版と同じパッチ済みモジュール（build-trial.mjs --stage-only の .stage/）で、CPU に両席を指させて進める。
// XI・XII を出す行動だけは選ばせない（ブラウザで人が操作して確かめるため）。対戦の進行そのものは本物のコマンドの列。
// 使い方: node trial-world/make-save.mjs <stageDir> <outDir>   → <outDir>/r8-A.json・r8-B.json・r8-C.json
import fs from 'node:fs';import path from 'node:path';import {pathToFileURL} from 'node:url';
const [stage,outDir]=process.argv.slice(2);const u=f=>pathToFileURL(path.join(path.resolve(stage),f)).href;
const e=await import(u('engine.mjs')),{observeCpu}=await import(u('cpu-observation.mjs')),{chooseCpuAction}=await import(u('cpu-policy.mjs')),{advanceResponses}=await import(u('auto-progress.mjs'));
const {CPU_DECKS}=await import(u('cpu-decks.mjs')),{newMetadata,encodeMatch}=await import(u('records-match.mjs'));
const X=/^X-XII?-[ABC]$/;
// 試遊版 app.mjs の __lifeTrial.inject と同じ規則で2枚入れ替える。
function inject(list,m){const count=new Map(),order=[];for(const id of list)if(!id.startsWith('M-')){if(!count.has(id))order.push(id);count.set(id,(count.get(id)??0)+1);}
 const pick=[...order].sort((x,y)=>count.get(y)-count.get(x)||order.indexOf(x)-order.indexOf(y)).slice(0,2),c=[...list];pick.forEach((id,k)=>{c[c.lastIndexOf(id)]=k?'X-XII-'+m:'X-XI-'+m;});return c;}
fs.mkdirSync(outDir,{recursive:true});const found={};
for(const m of ['A','B','C']){
 const decks={A:inject(CPU_DECKS.find(d=>d.id==='balance').cards,m),B:inject(CPU_DECKS.find(d=>d.id==='item').cards,m)};
 const holdsBoth=s=>['X-XI-'+m,'X-XII-'+m].every(id=>s.players.A.hand.some(x=>s.cards[x].cardId===id));
 search:for(let seed=1;seed<=400;seed++){
  let s=e.createGame(seed,decks),step={A:0,B:0};const adv=()=>{s=advanceResponses(s).state;};adv();
  for(let n=0;n<6000&&s.phase!=='finished';n++){
   if(s.round===8&&s.turn==='A'&&s.phase==='normal'&&!s.choice&&holdsBoth(s)){
    const meta=newMetadata({mode:'hotseat',decks:{A:{id:null,name:'試験A（バランス）',cards:decks.A},B:{id:null,name:'試験B（アイテム・じゅんび）',cards:decks.B}}});
    fs.writeFileSync(path.join(outDir,`r8-${m}.json`),encodeMatch(e.save(s),meta));found[m]={seed,growth:{A:s.players.A.growth,B:s.players.B.growth},commands:s.commands.length,final:s.life.final};continue search;}
   if(s.round>8)break;
   const a=e.actor(s),o=observeCpu(s,a),raw=e.legalActions(s);
   const keep=o.actions.map((x,i)=>i).filter(i=>!(raw[i].source&&X.test(s.cards[raw[i].source]?.cardId??'')&&raw[i].kind!=='pass'));
   const sub={...o,actions:keep.map(i=>o.actions[i])};const d=chooseCpuAction(sub,{difficulty:'intermediate',seed:seed*7+(a==='A'?1:2),step:step[a]++});
   const i=keep[sub.actions.findIndex(x=>x.id===d.id)];s=e.act(s,a,s.revision,raw[i].id);adv();
  }
 }
 if(!found[m])throw Error('条件に合う局面が見つかりません：方式'+m);
}
console.log(JSON.stringify(found));
