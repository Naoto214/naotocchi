// 本文明確化（478）の前後で、状態遷移が完全に同一かを確かめる。読み取り専用。
// 使い方: node compat-replay.mjs <card-game ディレクトリ> > out.json（main と作業ブランチで実行し、出力を比べる）
import {readFileSync,readdirSync} from 'node:fs';import {createHash} from 'node:crypto';import {join,resolve} from 'node:path';import {pathToFileURL} from 'node:url';
const dir=resolve(process.argv[2]);const imp=f=>import(pathToFileURL(join(dir,f)).href);
const e=await imp('engine.mjs');const {observeCpu}=await imp('cpu-observation.mjs');const {chooseCpuAction}=await imp('cpu-policy.mjs');
const h=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
const state=s=>h({players:s.players,result:s.result,log:s.log,effects:s.effects??null,history:s.history??null,commands:s.commands});
// 発動記録（history）にはカード本文の写し（text）が入る。処理の比較ではその写しだけを除く。
const stateNoText=s=>h({players:s.players,result:s.result,log:s.log,effects:s.effects??null,history:(s.history??[]).map(({text,...r})=>r),commands:s.commands});
const view=(s,v)=>{const x=e.view(s,v);return {all:h(x),noText:h(JSON.parse(JSON.stringify(x),(k,val)=>k==='text'?undefined:val))};};
const out={saves:{},games:{}};
// 1) リポジトリに保存されている旧保存（hotseat-1〜2）をすべて復元
for(const f of readdirSync(join(dir,'tests')).filter(f=>/saves\.json$/.test(f))){const data=JSON.parse(readFileSync(join(dir,'tests',f)));
 const walk=(x,path)=>{if(!x||typeof x!=='object')return;if(x.save&&x.save.version){const s=e.restore(JSON.stringify(x.save));out.saves[f+':'+path]={version:s.version,revision:s.revision,state:state(s),stateNoText:stateNoText(s),save:h(e.save(s)),viewA:view(s,'A'),viewB:view(s,'B')};return;}for(const [k,v] of Object.entries(x))walk(v,path+'/'+k);};walk(data,'');}
// 2) ルナランダー・サブマリン3Dを3枚ずつ入れたCPU同士の小規模対戦（版3種×難易度2×seed3=18戦）
const x=spec=>Object.entries(spec).flatMap(([id,n])=>Array(n).fill(id));
const DECK=x({'G-lunar-lander':3,'G-submarine-3d':3,'M-dog-01':3,'M-dog-02':3,'M-dog-03':3,'M-dog-04':3,'M-dog-05':2,'M-beetle-01':3,'M-beetle-02':3,'C-panda':3,'C-shiba':3,'W-snow':2,'I-c_coin2':3,'G-real-fishing':3});
for(const version of e.RULE_VERSIONS)for(const difficulty of ['beginner','intermediate'])for(const seed of [1,2,3]){
 let s=e.createGame(seed,{A:DECK,B:DECK},version);let guard=0;const used={lunar:0,lunarHit:0,submarine:{0:0,1:0,2:0}};
 while(s.phase!=='finished'&&guard++<5000){const a=e.actor(s),o=observeCpu(s,a),d=chooseCpuAction(o,{difficulty,seed:seed+(a==='A'?1:2),step:s.revision}),act=o.actions.find(q=>q.id===d.id);
  const c=act?.card?.cardId;const g0=s.players[a].growth;s=e.act(s,a,s.revision,d.id);
  if(c==='G-lunar-lander'&&['play','programPlay'].includes(act.kind))used.lunar++;if(c==='G-submarine-3d'&&['play','programPlay'].includes(act.kind))used.submarine[act.variant]++;}
 used.lunarHit=s.log.filter(l=>l.includes('ルナランダーを解決')).length;
 const back=e.restore(e.save(s));
 out.games[`${version}/${difficulty}/${seed}`]={phase:s.phase,revision:s.revision,commands:h(s.commands),state:state(s),stateNoText:stateNoText(s),restoredEqual:state(back)===state(s),viewA:view(s,'A'),viewB:view(s,'B'),used};}
console.log(JSON.stringify(out,null,1));
