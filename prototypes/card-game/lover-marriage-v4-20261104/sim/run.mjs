// VERSION 4 の対戦比較。腕：A0＝現行の正式（無変更の写し）、V4＝結婚後の能力＋CPU対応、V4cpu0＝結婚後の能力だけ（CPUは現行）。
// 同じグループは全腕で同じ山札順seed・CPU判断seed、先攻・後攻を入れ替える（既存の balance-verification と同じ方式）。
// 使い方：node sim/run.mjs plan <out.json> | node sim/run.mjs run <plan.json> <out.jsonl> <shard> <shards> | node sim/run.mjs build <dir>
import fs from 'node:fs';import path from 'node:path';import {fileURLToPath,pathToFileURL} from 'node:url';
import {buildStage} from '../lib/build-stage.mjs';
import {deriveSeed,permutations,inputFor,apply,sha} from '../../balance-verification-20261020/lib.mjs';
const HERE=path.dirname(fileURLToPath(import.meta.url));
const [cmd,...args]=process.argv.slice(2);
const ARMS={A0:{v4:false},V4:{v4:true,cpu:true},V4cpu0:{v4:true,cpu:false}};
if(cmd==='build'){const root=path.resolve(args[0]);for(const [k,o] of Object.entries(ARMS))buildStage(path.join(root,k),{...o,ui:o.v4});console.log('built',root);process.exit(0);}
const {CPU_DECKS}=await import('../../cpu-decks.mjs');
const base=id=>[...CPU_DECKS.find(d=>d.id===id).cards];
const swap=(l,from,to,n=99)=>{let k=n;return l.map(id=>id===from&&k>0?(k--,to):id);};
const LOVERS=['P-anglerfish','P-cat_ceo','P-cliff_goat','P-desert_scorpion','P-field_cow','P-forest_bear','P-gentle_gorilla','P-grove_deer','P-high_eagle','P-knitting_spider','P-oasis_cactus','P-robot_neighbor','P-rock_octopus','P-sea_mermaid','P-snow_spirit','P-snowman','P-sunflower_partner','P-swamp_croc'];
function decks(){const D=Object.fromEntries(CPU_DECKS.map(d=>[d.id,base(d.id)]));
 for(const l of LOVERS.filter(l=>!['P-grove_deer','P-high_eagle'].includes(l)))D['partner/'+l]=swap(base('partner'),'P-grove_deer',l);
 const S='E-misunderstanding';D['challenge+S']=swap(base('challenge'),'E-mirror',S,2);D['growth+S']=swap(base('growth'),'G-mini-golf-physics',S,2);D['item+S']=swap(base('item'),'G-gomoku-9',S,2);D['partner+S']=swap(base('partner'),'E-reconciliation',S,2);
 return D;}
if(cmd==='plan'){const D=decks(),ids=CPU_DECKS.map(d=>d.id),M=[];
 const add=(set,X,Y,groups,arms)=>{for(let g=1;g<=groups;g++){const key=`${set}:${X}:${Y}:${g}`,orderSeed=deriveSeed('order','lover4',key);
  for(const arm of arms)for(const first of ['X','Y'])M.push({match:`${key}:${arm}:${first}`,set,group:key,arm,X,Y,first,orderSeed,policySeed:{X:deriveSeed('policy','lover4',key,first,'X'),Y:deriveSeed('policy','lover4',key,first,'Y')}});}};
 // RR：7デッキの総当たり（同じデッキ同士を除く21組）。
 for(let i=0;i<ids.length;i++)for(let j=i+1;j<ids.length;j++)add('RR',ids[i],ids[j],Number(args[1]??10),['A0','V4']);
 // LV：恋人デッキのこだちのシカ3枚を、ほかの恋人16種類それぞれ3枚に替えて、他の公式6デッキと対戦。
 for(const l of LOVERS.filter(l=>!['P-grove_deer','P-high_eagle'].includes(l)))for(const y of ids.filter(x=>x!=='partner'))add('LV','partner/'+l,y,Number(args[2]??4),['A0','V4']);
 // SX：相手にすれちがい2枚（別れ・離婚・らぶれたー・クマの守りが実際に起きる組）。CPU変更の効果も分けるため V4cpu0 も。
 for(const y of ['challenge+S','growth+S','item+S','partner+S'])add('SX','partner',y,Number(args[3]??10),['A0','V4','V4cpu0']);
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
  v4:H.filter(x=>x.kind==='ability'&&x.v4&&x.actor===a).map(x=>x.cardId),endMarried:p.relationship===4?cid(p.board.partner):null,
  partnerPlaced:H.some(x=>x.kind==='place'&&x.actor===a&&x.slot==='partner'),hand:p.hand.length,deck:p.deck.length};};
 let replay='skipped';if(status==='completed'){try{const back=e.restore(e.save(s));replay=e.save(back)===e.save(s)&&JSON.stringify(back.result)===JSON.stringify(s.result)?'match':'mismatch';}catch(err){replay='error';}}
 return {match:m.match,set:m.set,group:m.group,arm:m.arm,X:m.X,Y:m.Y,first:m.first,xSeat,status,error,round:s.round,reason:s.result?.reason??null,
  x:seatRow(xSeat),y:seatRow(xSeat==='A'?'B':'A'),replay,saveSha:status==='completed'?sha(e.save(s)):null,ms:Date.now()-t0};}
// 結婚の記録は history の marriage イベントにラウンドが無いので、ラウンドは log から補う必要があれば集計側で扱う。
for(const m of plan.matches.filter((m,i)=>i%Number(shards)===Number(shard)&&!done.has(m.match))){const r=await play(m);fs.appendFileSync(out,JSON.stringify(r)+'\n');}
