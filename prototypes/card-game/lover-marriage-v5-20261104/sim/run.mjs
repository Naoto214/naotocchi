// VERSION 5 の対戦比較（V4 の sim/run.mjs を写したもの）。V4 と同じ seed（'lover4'）と組を使うので、V4 の A0・V4 の結果とそのまま対にして比べられる。
// 腕：A0＝正式の写し、V4＝V4 の能力（V5 のパッチで FINAL を V4 に戻したもの）、G*/S*/C*＝ゴリラ・せいれい・サボテンの案、V5＝最終案。cpu0 付きは CPU を現行のまま。
// 同じグループは全腕で同じ山札順seed・CPU判断seed、先攻・後攻を入れ替える（既存の balance-verification と同じ方式）。
// 使い方：node sim/run.mjs plan <out.json> | node sim/run.mjs run <plan.json> <out.jsonl> <shard> <shards> | node sim/run.mjs build <dir>
import fs from 'node:fs';import path from 'node:path';import {fileURLToPath,pathToFileURL} from 'node:url';
import {buildStage} from '../lib/build-stage.mjs';import {FINAL} from '../lib/v5-patches.mjs';
import {deriveSeed,permutations,inputFor,apply,sha} from '../../balance-verification-20261020/lib.mjs';
const HERE=path.dirname(fileURLToPath(import.meta.url));
const [cmd,...args]=process.argv.slice(2);
const V4V={gorilla:'v4',snow:'v4',cactus:'v4'};
const LOVERS=['P-anglerfish','P-cat_ceo','P-cliff_goat','P-desert_scorpion','P-field_cow','P-forest_bear','P-gentle_gorilla','P-grove_deer','P-high_eagle','P-knitting_spider','P-oasis_cactus','P-robot_neighbor','P-rock_octopus','P-sea_mermaid','P-snow_spirit','P-snowman','P-sunflower_partner','P-swamp_croc'];
export const ARMS={A0:{v4:false},V4:{v4:true,cpu:true,variants:V4V},
 Gnone:{variants:{...V4V,gorilla:'none'}},Gv2b:{variants:{...V4V,gorilla:'v2b'}},Gv3n:{variants:{...V4V,gorilla:'v3n'}},Gg4:{variants:{...V4V,gorilla:'g4'}},
 Snone:{variants:{...V4V,snow:'none'}},Sdraw:{variants:{...V4V,snow:'draw'}},Sb:{variants:{...V4V,snow:'b'}},
 Cnone:{variants:{...V4V,cactus:'none'}},Cb:{variants:{...V4V,cactus:'b'}},Cc3:{variants:{...V4V,cactus:'c3'}},
 Ktop:{variants:{...V4V,spider:'top'}},Xspider:{variants:{...V4V,off:['P-knitting_spider']}},Xeagle:{variants:{...V4V,off:['P-high_eagle']}},Xdeer:{variants:{...V4V,off:['P-grove_deer']}},
 V5:{variants:FINAL},V5cpu0:{cpu:false,variants:FINAL}};
// V5c：せいれいの CPU 評価だけを直した V5（直す前は R10 だけの +5 を「残りターン×6」で数えていた）。results/final の V5 が直す前。
ARMS.V5c={v4:true,cpu:true,variants:FINAL};
// シカの代替案：結婚した時だけ（Dm）／ターン開始時だけ（Ds）。
ARMS.Dm={v4:true,cpu:true,variants:{...FINAL,deer:'m'}};ARMS.Ds={v4:true,cpu:true,variants:{...FINAL,deer:'s'}};
// 最終検証（V5 固定）：恋人ごとに「結婚後の追加能力だけ」を外した腕（V5off-<名前>）。
for(const id of LOVERS)ARMS['V5off-'+id.slice(2)]={v4:true,cpu:true,variants:{...FINAL,off:[id]}};
for(const a of Object.values(ARMS)){a.v4??=true;a.cpu??=true;}
if(cmd==='build'){const root=path.resolve(args[0]);for(const k of (args[1]?args[1].split(','):Object.keys(ARMS)))buildStage(path.join(root,k),{...ARMS[k],ui:ARMS[k].v4});console.log('built',root);process.exit(0);}
const {CPU_DECKS}=await import('../../cpu-decks.mjs');
const base=id=>[...CPU_DECKS.find(d=>d.id===id).cards];
const swap=(l,from,to,n=99)=>{let k=n;return l.map(id=>id===from&&k>0?(k--,to):id);};
function decks(){const D=Object.fromEntries(CPU_DECKS.map(d=>[d.id,base(d.id)]));
 for(const l of LOVERS.filter(l=>!['P-grove_deer','P-high_eagle'].includes(l)))D['partner/'+l]=swap(base('partner'),'P-grove_deer',l);
 const S='E-misunderstanding';D['challenge+S']=swap(base('challenge'),'E-mirror',S,2);D['growth+S']=swap(base('growth'),'G-mini-golf-physics',S,2);D['item+S']=swap(base('item'),'G-gomoku-9',S,2);D['partner+S']=swap(base('partner'),'E-reconciliation',S,2);
 return D;}
// plan <out.json> <spec>：spec は「set:X:Y群:groups:arms」を ; で並べたもの（X/Y は * で公式7デッキ、!d で d 以外）。key は V4 と同じ形。
if(cmd==='plan'){const D=decks(),ids=CPU_DECKS.map(d=>d.id),M=[],seen=new Set();
 const pick=x=>x==='*'?ids:x.startsWith('!')?ids.filter(i=>i!==x.slice(1)):x.split(',');
 const add=(set,X,Y,g0,g1,arms)=>{for(let g=g0;g<=g1;g++){const key=`${set}:${X}:${Y}:${g}`,orderSeed=deriveSeed('order','lover4',key);
  for(const arm of arms)for(const first of ['X','Y']){const match=`${key}:${arm}:${first}`;if(seen.has(match))continue;seen.add(match);M.push({match,set,group:key,arm,X,Y,first,orderSeed,policySeed:{X:deriveSeed('policy','lover4',key,first,'X'),Y:deriveSeed('policy','lover4',key,first,'Y')}});}}};
 for(const part of args[1].split(';').filter(Boolean)){const [set,xs,ys,gs,arms]=part.split(':');const [g0,g1]=gs.includes('-')?gs.split('-').map(Number):[1,Number(gs)];
  for(const X of pick(xs))for(const Y of pick(ys)){if(X===Y)continue;
   // RR は V4 と同じく公式デッキ id の順（i<j）を X,Y にする。
   if(set==='RR'&&ids.indexOf(X)>ids.indexOf(Y)){add(set,Y,X,g0,g1,arms.split(','));continue;}
   add(set,X,Y,g0,g1,arms.split(','));}}
 fs.writeFileSync(args[0],JSON.stringify({decks:D,matches:M}));console.log(M.length,'matches');process.exit(0);}
if(cmd!=='run')throw Error('unknown command');
const [planPath,out,shard='0',shards='1',buildRoot=path.join(HERE,'build')]=args;
const plan=JSON.parse(fs.readFileSync(planPath,'utf8'));
const done=new Set(fs.existsSync(out)?fs.readFileSync(out,'utf8').split('\n').filter(Boolean).map(l=>JSON.parse(l).match):[]);
const MODS={};async function mods(arm){if(MODS[arm])return MODS[arm];const u=f=>pathToFileURL(path.join(buildRoot,arm,f)).href;
 const [e,o,p,ap]=await Promise.all([import(u('engine.mjs')),import(u('cpu-observation.mjs')),import(u('cpu-policy.mjs')),import(u('auto-progress.mjs'))]);
 return MODS[arm]={e,observeCpu:o.observeCpu,chooseCpuAction:p.chooseCpuAction,advanceResponses:ap.advanceResponses};}
async function play(m){const {e,observeCpu,chooseCpuAction,advanceResponses}=await mods(m.arm);
 const perm=permutations(m.orderSeed),order={X:apply(plan.decks[m.X],perm.A),Y:apply(plan.decks[m.Y],perm.B)};
 const seat={A:m.first==='X'?'X':'Y',B:m.first==='X'?'Y':'X'},xSeat=m.first==='X'?'A':'B';
 let s=e.createGame(m.orderSeed,{A:inputFor(order[seat.A],perm.A),B:inputFor(order[seat.B],perm.B)});
 const t0=Date.now(),step={A:0,B:0};const adv=()=>{const r=advanceResponses(s);s=r.state;if(r.halted)throw Error('halted '+r.reason);};
 let status='completed',error=null;
 try{adv();for(let n=0;s.phase!=='finished';n++){if(n>6000)throw Error('step limit');const a=e.actor(s),o=observeCpu(s,a);
  const d=chooseCpuAction(o,{difficulty:'intermediate',seed:m.policySeed[seat[a]],step:step[a]++});const i=o.actions.findIndex(x=>x.id===d.id);s=e.act(s,a,s.revision,e.legalActions(s)[i].id);adv();}}
 catch(err){status='abnormal';error=String(err.message).slice(0,200);}
 const cid=id=>s.cards[id]?.cardId,H=s.history;
 const seatRow=a=>{const p=s.players[a];return {growth:p.growth,result:s.result?.winner===a?1:s.result?.winner?0:0.5,first:a==='A',
  married:H.filter(x=>x.kind==='marriage'&&x.actor===a).map(x=>x.round??null),marriedRound:(()=>{const x=H.find(y=>y.kind==='marriage'&&y.actor===a);return x?x.round??null:null;})(),
  breakups:H.filter(x=>x.kind==='breakup'&&x.actor===a).map(x=>({stage:x.stage,penalty:x.penalty,card:x.cardId,round:x.round??null})),
  v4:H.filter(x=>x.kind==='ability'&&x.v4&&x.actor===a).map(x=>x.cardId),
  // 結婚中に使った恋人の能力（v4 印のない「能力の組み替え」型：うし・ゆきだるま・タコなども数える。* は v4 印なし）。
  // 同じターン（serial）に同じ恋人の能力が何回記録されたか（不正な再発動の確認）。
  perTurnMax:(()=>{const c={};for(const x of H)if(x.actor===a&&x.kind==='ability'&&/^P-/.test(x.cardId??'')){const k=x.cardId+'#'+x.serial+'#'+(x.v4?1:0);c[k]=(c[k]??0)+1;}return Math.max(0,...Object.values(c));})(),
  loverUse:(()=>{let m=false,div=false;const out=[];for(const x of H){if(x.actor!==a)continue;if(x.kind==='marriage')m=true;if(x.kind==='breakup'){div=x.stage===4;m=false;}
   if(x.kind==='ability'&&/^P-/.test(x.cardId??'')&&(x.v4||m||(x.cardId==='P-snowman'&&div)))out.push(x.cardId+(x.v4?'':'*'));}return out;})(),endMarried:p.relationship===4?cid(p.board.partner):null,
  partnerPlaced:H.some(x=>x.kind==='place'&&x.actor===a&&x.slot==='partner'),hand:p.hand.length,deck:p.deck.length};};
 let replay='skipped';if(status==='completed'){try{const back=e.restore(e.save(s));replay=e.save(back)===e.save(s)&&JSON.stringify(back.result)===JSON.stringify(s.result)?'match':'mismatch';}catch(err){replay='error';}}
 return {match:m.match,set:m.set,group:m.group,arm:m.arm,X:m.X,Y:m.Y,first:m.first,xSeat,status,error,round:s.round,reason:s.result?.reason??null,
  x:seatRow(xSeat),y:seatRow(xSeat==='A'?'B':'A'),replay,saveSha:status==='completed'?sha(e.save(s)):null,ms:Date.now()-t0};}
// 結婚の記録は history の marriage イベントにラウンドが無いので、ラウンドは log から補う必要があれば集計側で扱う。
for(const m of plan.matches.filter((m,i)=>i%Number(shards)===Number(shard)&&!done.has(m.match))){const r=await play(m);fs.appendFileSync(out,JSON.stringify(r)+'\n');}
