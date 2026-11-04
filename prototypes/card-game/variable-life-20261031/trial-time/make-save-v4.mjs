// VERSION 4 ブラウザ確認用の2人対戦の保存を作る（make-save.mjs と同じ方法：試遊版と同じパッチ済みモジュールで、CPU に両席を指させて進める。
// 時のカードと新カードを使う行動だけは選ばせない）。対戦の進行そのものは本物のコマンドの列。
// 使い方: node trial-time/make-save-v4.mjs <stageDir> <outDir>
//   r8-haya.json  : R8・先攻A。A が負けていて、手札に IX とはやじまい。A の時4以上。
//   r9-naga.json  : R9・先攻A。A が負けていて、手札に XII とながいきのひけつ。A の時4以上。
//   r7-machi.json : R7・先攻A。A の手札にまちぶせどけいと XII、B の手札に IX。
//   u12-star.json : R8・先攻A。A のメインがヒトデ⑦で、A の手札に IX、B の手札に XII（U12 の確認。見つからなければ作らない）。
import fs from 'node:fs';import path from 'node:path';import {pathToFileURL} from 'node:url';
const [stage,outDir]=process.argv.slice(2);const u=f=>pathToFileURL(path.join(path.resolve(stage),f)).href;
const e=await import(u('engine.mjs')),{observeCpu}=await import(u('cpu-observation.mjs')),{chooseCpuAction}=await import(u('cpu-policy.mjs')),{advanceResponses}=await import(u('auto-progress.mjs'));
const {CPU_DECKS}=await import(u('cpu-decks.mjs')),{newMetadata,encodeMatch}=await import(u('records-match.mjs'));
const X=/^X-[TN]-/,T=['X-T-IX','X-T-X','X-T-XI','X-T-XII'],NW=n=>'X-N-'+n;
function inject(list,fill){const left={},order=[];for(const id of list)if(!id.startsWith('M-')){if(!(id in left)){left[id]=0;order.push(id);}left[id]++;}
 const c=[...list];for(const to of fill){const id=[...order].sort((x,y)=>left[y]-left[x]||order.indexOf(x)-order.indexOf(y))[0];c[c.lastIndexOf(id)]=to;left[id]--;}return c;}
const deck=id=>CPU_DECKS.find(d=>d.id===id).cards;
const has=(s,a,ids)=>ids.every(id=>s.players[a].hand.filter(x=>s.cards[x].cardId===id).length>=ids.filter(y=>y===id).length);
const mainIs=(s,a,id)=>s.players[a].board.main&&s.cards[s.players[a].board.main].cardId===id;
const starDeck=[...Array(3).fill('M-starfish-01'),'M-starfish-02','M-starfish-02','M-starfish-03','M-starfish-03','M-starfish-04','M-starfish-04','M-starfish-05','M-starfish-06','M-starfish-07','M-starfish-07',...deck('balance').filter(id=>!id.startsWith('M-'))];
const SPECS=[
 {name:'r8-haya',round:8,decks:{A:inject(deck('growth'),[...T,'X-T-IX',NW('hayajimai'),NW('hayajimai')]),B:inject(deck('item'),T)},ready:s=>has(s,'A',['X-T-IX',NW('hayajimai')])&&s.players.A.growth<s.players.B.growth&&s.players.B.growth-s.players.A.growth<=15&&s.players.A.time>=4,label:['試験A（そだち獲得＋はやじまい）','試験B（アイテム）']},
 {name:'r9-naga',round:9,decks:{A:inject(deck('balance'),[...T,'X-T-XII',NW('nagaiki'),NW('nagaiki')]),B:inject(deck('item'),T)},ready:s=>has(s,'A',['X-T-XII',NW('nagaiki')])&&s.players.A.growth<s.players.B.growth&&s.players.A.time>=4,label:['試験A（バランス＋ながいき）','試験B（アイテム）']},
 {name:'r7-machi',round:7,decks:{A:inject(deck('balance'),[...T,'X-T-XII',NW('machibuse'),NW('machibuse')]),B:inject(deck('item'),[...T,'X-T-IX'])},ready:s=>has(s,'A',['X-T-XII',NW('machibuse')])&&has(s,'B',['X-T-IX']),label:['試験A（バランス＋まちぶせ）','試験B（アイテム）']},
 {name:'u12-star',round:8,decks:{A:inject(starDeck.slice(0,40),[...T,'X-T-IX']),B:inject(deck('item'),[...T,'X-T-XII'])},ready:s=>mainIs(s,'A','M-starfish-07')&&has(s,'A',['X-T-IX'])&&has(s,'B',['X-T-XII'])&&s.players.B.time>=2,label:['試験A（ヒトデ）','試験B（アイテム）'],optional:true},
];
fs.mkdirSync(outDir,{recursive:true});const found={};
for(const sp of SPECS){search:for(let seed=1;seed<=(sp.optional?600:1500);seed++){
 let s=e.createGame(seed,sp.decks),step={A:0,B:0};const adv=()=>{s=advanceResponses(s).state;};adv();
 for(let n=0;n<6000&&s.phase!=='finished';n++){
  if(s.round===sp.round&&s.turn==='A'&&s.phase==='normal'&&!s.choice&&!s.chain.length&&sp.ready(s)){
   const meta=newMetadata({mode:'hotseat',decks:{A:{id:null,name:sp.label[0],cards:sp.decks.A},B:{id:null,name:sp.label[1],cards:sp.decks.B}}});
   fs.writeFileSync(path.join(outDir,sp.name+'.json'),encodeMatch(e.save(s),meta));found[sp.name]={seed,growth:{A:s.players.A.growth,B:s.players.B.growth},time:{A:s.players.A.time,B:s.players.B.time},commands:s.commands.length};break search;}
  if(s.round>sp.round)break;
  const a=e.actor(s),o=observeCpu(s,a),raw=e.legalActions(s);
  const keep=o.actions.map((x,i)=>i).filter(i=>!(raw[i].source&&X.test(s.cards[raw[i].source]?.cardId??'')&&raw[i].kind!=='pass'));
  const sub={...o,actions:keep.map(i=>o.actions[i])};const d=chooseCpuAction(sub,{difficulty:'intermediate',seed:seed*7+(a==='A'?1:2),step:step[a]++});
  const i=keep[sub.actions.findIndex(x=>x.id===d.id)];s=e.act(s,a,s.revision,raw[i].id);adv();
 }}
 if(!found[sp.name]&&!sp.optional)throw Error('条件に合う局面が見つかりません：'+sp.name);}
console.log(JSON.stringify(found));
