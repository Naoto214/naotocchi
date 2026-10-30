// 修正の前後で、旧版（hotseat-2〜6）の対戦と既存の旧保存がまったく同じに再生されることを確かめる。読み取り専用。
// 使い方: node compat-replay.mjs <card-game ディレクトリ> > out.json（main と作業ブランチで実行し、compat-compare.py で比べる）
import {readFileSync,readdirSync} from 'node:fs';import {createHash} from 'node:crypto';import {join,resolve} from 'node:path';import {pathToFileURL} from 'node:url';
const dir=resolve(process.argv[2]);const imp=f=>import(pathToFileURL(join(dir,f)).href);
const e=await imp('engine.mjs');const {observeCpu}=await imp('cpu-observation.mjs');const {chooseCpuAction}=await imp('cpu-policy.mjs');
const h=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
const state=s=>h({players:s.players,result:s.result,log:s.log,effects:s.effects??null,history:s.history??null,scheduled:s.scheduled??null,commands:s.commands});
// 発動記録（history）や予約（scheduled）にはルール定義の写し（contract）が入る。版の切り替え用の onlyVersions（処理には使わない）だけを除いた比較も出す。
const stripMeta=x=>JSON.parse(JSON.stringify(x??null),(k,v)=>k==='onlyVersions'?undefined:v);
const stateNoMeta=s=>h(stripMeta({players:s.players,result:s.result,log:s.log,effects:s.effects??null,history:s.history??null,scheduled:s.scheduled??null,commands:s.commands}));
const out={saves:{},games:{}};
for(const f of readdirSync(join(dir,'tests')).filter(f=>/saves\.json$/.test(f))){const data=JSON.parse(readFileSync(join(dir,'tests',f)));
 const walk=(x,path)=>{if(!x||typeof x!=='object')return;if(x.save&&x.save.version){const s=e.restore(JSON.stringify(x.save));out.saves[f+':'+path]={version:s.version,state:state(s),stateNoMeta:stateNoMeta(s),save:h(e.save(s))};return;}for(const [k,v] of Object.entries(x))walk(v,path+'/'+k);};walk(data,'');}
const x=spec=>Object.entries(spec).flatMap(([id,n])=>Array(n).fill(id));
const DECK=x({'G-bomber-maze':3,'G-frogger-road':2,'G-takoyaki-grill':2,'G-real-fishing':3,'I-bowtie':3,'W-snow':3,'W-countryside':3,'M-dog-01':3,'M-dog-02':3,'M-dog-03':3,'M-dog-04':3,'M-dog-05':1,'M-beetle-01':3,'C-panda':2,'I-c_coin2':3});
for(const version of ['hotseat-2','hotseat-3','hotseat-4','hotseat-5','hotseat-6'])for(const difficulty of ['beginner','intermediate'])for(const seed of [1,2,3]){
 let s=e.createGame(seed,{A:DECK,B:DECK},version);let g=0;
 while(s.phase!=='finished'&&g++<5000){const a=e.actor(s),o=observeCpu(s,a),d=chooseCpuAction(o,{difficulty,seed:seed+(a==='A'?1:2),step:s.revision});s=e.act(s,a,s.revision,d.id);}
 const back=e.restore(e.save(s));
 out.games[`${version}/${difficulty}/${seed}`]={phase:s.phase,commands:h(s.commands),state:state(s),stateNoMeta:stateNoMeta(s),restoredEqual:state(back)===state(s),selfTargets:s.history.filter(r=>r.kind==='activation'&&['G-bomber-maze','G-frogger-road','G-takoyaki-grill'].includes(r.sourceCardId)&&r.targets?.includes(r.source)).length};}
console.log(JSON.stringify(out,null,1));
