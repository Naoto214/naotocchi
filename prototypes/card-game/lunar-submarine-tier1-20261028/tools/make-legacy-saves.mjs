// Generates hotseat saves with the MAIN engine (before the wording change). Usage: node gen.mjs <card-game dir>
import {createHash} from 'node:crypto';
const dir=process.argv[2];
const e=await import(dir+'/engine.mjs');const {observeCpu}=await import(dir+'/cpu-observation.mjs');const {chooseCpuAction}=await import(dir+'/cpu-policy.mjs');const {CATALOG}=await import(dir+'/full-catalog.mjs');
const x=spec=>Object.entries(spec).flatMap(([id,n])=>Array(n).fill(id));
const DECK=x({'M-dog-01':3,'M-dog-02':3,'M-dog-03':3,'M-dog-04':3,'M-dog-05':2,'M-dog-06':1,'M-beetle-01':3,'M-beetle-02':3,'M-beetle-03':2,'G-lunar-lander':3,'G-submarine-3d':3,'C-shiba':3,'W-snow':2,'I-c_coin2':3,'G-sugoroku-race':3});
const digest=s=>createHash('sha256').update(JSON.stringify({players:s.players,result:s.result,log:s.log})).digest('hex');
// 発動の記録（history の activation）は、その時のカード本文の写しを持つ（ルール・CPU・戦績・画面のどれも読まない）。それだけを除いた全状態。
const fullDigest=s=>createHash('sha256').update(JSON.stringify({...s,history:s.history.map(h=>h.kind==='activation'?{...h,text:null}:h)})).digest('hex');
const out=[];
for(const version of e.RULE_VERSIONS)for(let seed=1,n=0;seed<=30&&n<2;seed++){let s=e.createGame(seed,{A:DECK,B:DECK},version);let g=0;const used=new Set();
 while(s.phase!=='finished'&&g++<5000){const a=e.actor(s),o=observeCpu(s,a),d=chooseCpuAction(o,{difficulty:'intermediate',seed:seed+(a==='A'?1:2),step:s.revision}),i=o.actions.findIndex(q=>q.id===d.id);s=e.act(s,a,s.revision,e.legalActions(s)[i].id);}
 for(const h of s.history)if(h.kind==='play'&&['G-lunar-lander','G-submarine-3d'].includes(h.cardId))used.add(h.cardId);
 if(used.size===2&&++n)out.push({version,seed,lunar_resolutions:s.log.filter(l=>/ルナランダーを解決/.test(l)).length,used:[...used].sort(),save:JSON.parse(e.save(s)),board_result_log_sha256:digest(s),state_sha256_without_activation_text:fullDigest(s),result:s.result,growth:{A:s.players.A.growth,B:s.players.B.growth}});}
console.log(JSON.stringify({generated_by:'main eb97817d engine (before the 478 wording change)',engine_version:e.VERSION,lunar_text:CATALOG['G-lunar-lander'].text,submarine_text:CATALOG['G-submarine-3d'].text,saves:out},null,1));
