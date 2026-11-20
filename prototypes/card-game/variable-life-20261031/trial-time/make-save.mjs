// 時のカード試遊版のブラウザ確認用に、2人対戦の保存（R8・先攻Aの手番。Aが IX・X、Bが XII・XI を手札に持ち、Bの残り時が4以上）を作る。
// 試遊版と同じパッチ済みモジュール（build-trial.mjs --stage-only の .stage/）で、CPU に両席を指させて進める。
// 時のカードを出す行動（通常・カウンター）だけは選ばせない。デッキは試遊版の「各2枚」と同じ入れ替え。対戦の進行そのものは本物のコマンドの列。
// 使い方: node trial-time/make-save.mjs <stageDir> <outDir>   → <outDir>/r8-chain.json
import fs from 'node:fs';import path from 'node:path';import {pathToFileURL} from 'node:url';
const [stage,outDir]=process.argv.slice(2);const u=f=>pathToFileURL(path.join(path.resolve(stage),f)).href;
const e=await import(u('engine.mjs')),{observeCpu}=await import(u('cpu-observation.mjs')),{chooseCpuAction}=await import(u('cpu-policy.mjs')),{advanceResponses}=await import(u('auto-progress.mjs'));
const {CPU_DECKS}=await import(u('cpu-decks.mjs')),{newMetadata,encodeMatch}=await import(u('records-match.mjs'));
const X=/^X-T-/,T=['X-T-IX','X-T-X','X-T-XI','X-T-XII'];
// 試遊版 app.mjs の __lifeTrial.inject（各2枚）と同じ規則で8枚入れ替える。
function inject(list){const left={},order=[];for(const id of list)if(!id.startsWith('M-')){if(!(id in left)){left[id]=0;order.push(id);}left[id]++;}
 const c=[...list];for(const to of [...T,...T]){const id=[...order].sort((x,y)=>left[y]-left[x]||order.indexOf(x)-order.indexOf(y))[0];c[c.lastIndexOf(id)]=to;left[id]--;}return c;}
fs.mkdirSync(outDir,{recursive:true});const found={};
{const m='chain';
 const decks={A:inject(CPU_DECKS.find(d=>d.id==='balance').cards),B:inject(CPU_DECKS.find(d=>d.id==='item').cards)};
 const has=(s,a,ids)=>ids.every(id=>s.players[a].hand.some(x=>s.cards[x].cardId===id));
 const ready=s=>has(s,'A',['X-T-IX','X-T-X'])&&has(s,'B',['X-T-XII','X-T-XI'])&&s.players.B.time>=4;
 search:for(let seed=1;seed<=1500;seed++){
  let s=e.createGame(seed,decks),step={A:0,B:0};const adv=()=>{s=advanceResponses(s).state;};adv();
  for(let n=0;n<6000&&s.phase!=='finished';n++){
   if(s.round===8&&s.turn==='A'&&s.phase==='normal'&&!s.choice&&ready(s)){
    const meta=newMetadata({mode:'hotseat',decks:{A:{id:null,name:'試験A（バランス）',cards:decks.A},B:{id:null,name:'試験B（アイテム・じゅんび）',cards:decks.B}}});
    fs.writeFileSync(path.join(outDir,`r8-${m}.json`),encodeMatch(e.save(s),meta));found[m]={seed,growth:{A:s.players.A.growth,B:s.players.B.growth},time:{A:s.players.A.time,B:s.players.B.time},commands:s.commands.length,final:s.life.final};break search;}
   if(s.round>8)break;
   const a=e.actor(s),o=observeCpu(s,a),raw=e.legalActions(s);
   const keep=o.actions.map((x,i)=>i).filter(i=>!(raw[i].source&&X.test(s.cards[raw[i].source]?.cardId??'')&&raw[i].kind!=='pass'));
   const sub={...o,actions:keep.map(i=>o.actions[i])};const d=chooseCpuAction(sub,{difficulty:'intermediate',seed:seed*7+(a==='A'?1:2),step:step[a]++});
   const i=keep[sub.actions.findIndex(x=>x.id===d.id)];s=e.act(s,a,s.revision,raw[i].id);adv();
  }
 }
 if(!found[m])throw Error('条件に合う局面が見つかりません');
}
console.log(JSON.stringify(found));
