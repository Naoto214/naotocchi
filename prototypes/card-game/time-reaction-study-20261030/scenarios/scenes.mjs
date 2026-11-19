// Representative positions from the natural runs (read-only). Replays a match from its manifest with the official
// decision loop and dumps the CPU's own view at the chosen decision: hand, time, board, every candidate with the
// official score and its value without time cost, and the official choice.
// Usage: node scenarios/scenes.mjs > results/representative-scenes.json
import {readFileSync} from 'node:fs';
import * as e from '../../engine.mjs';
import {observeCpu} from '../../cpu-observation.mjs';
import {chooseCpuAction,timeOpportunity,scoreCpuAction,legacySpend,PROFILES} from '../../cpu-policy.mjs';
import {advanceResponses} from '../../auto-progress.mjs';
import {permutations,inputFor,apply} from '../../balance-verification-20261020/lib.mjs';
import {timeOpportunityCF} from '../lib/counterfactual.mjs';
const here=new URL('..',import.meta.url).pathname;
const MAN={TR:JSON.parse(readFileSync(here+'runs/TR-manifest.json','utf8')),X:JSON.parse(readFileSync(here+'../deck-balance-20261025/runs/X-manifest.json','utf8'))};
const label=a=>a.kind==='pass'?'pass':`${a.kind}:${a.card?.cardId??'-'}${a.slot?':'+a.slot:''}${a.variant?':'+a.variant:''}${a.target?.cardId?'→'+a.target.cardId:''}`;
const cid=(s,id)=>id?s.cards[id].cardId:null;
function snap(s,a,o,m,chosen){
 const p=s.players[a],q=s.players[a==='A'?'B':'A'],prof=PROFILES[m.difficulty[a]],t=timeOpportunity(o,prof),sb=timeOpportunityCF(o,prof,{strictlyBetter:true});
 return {round:s.round,turn:s.turn,phase:s.phase,window:s.window,difficulty:m.difficulty[a],deck:a==='A'?m.deckA:m.deckB,first:a==='A',
  own:{time:p.time,growth:p.growth,hand:p.hand.map(id=>cid(s,id)),main:cid(s,p.board.main),partner:cid(s,p.board.partner),world:cid(s,p.board.world),companions:p.board.companions.map(id=>cid(s,id)),prepared:p.board.prepared.map(x=>({card:cid(s,x.id),faceDown:Boolean(x.faceDown)}))},
  opponent:{time:q.time,growth:q.growth,main:cid(s,q.board.main),handCount:q.hand.length,prepared:q.board.prepared.length},
  challenge:s.challenge?{parameter:s.challenge.parameter,actor:s.challenge.actor??null}:null,
  candidates:o.actions.map((x,i)=>({action:label(x),cost:x.cost??0,official:+(t?t[i]:scoreCpuAction(x,o,legacySpend,prof)).toFixed(2),valueWithoutTime:+scoreCpuAction(x,o,()=>0,prof).toFixed(2),strictlyBetterCF:sb?+sb[i].toFixed(2):null})),
  chosen:label(chosen)};
}
function scene(spec){
 const M=MAN[spec.set],m=M.matches.find(x=>x.match===spec.match),g=M.groups.find(x=>x.group===m.group),perm=permutations(g.orderSeed);
 const order={X:apply(M.decks[g.X].cards,perm.A),Y:apply(M.decks[g.Y].cards,perm.B)},so={A:m.first==='X'?order.X:order.Y,B:m.first==='X'?order.Y:order.X};
 let s=e.createGame(g.orderSeed,{A:inputFor(so.A,perm.A),B:inputFor(so.B,perm.B)});s=advanceResponses(s).state;
 const step={A:0,B:0},out=[];
 for(let n=0;n<6000&&s.phase!=='finished';n++){
  const a=e.actor(s),o=observeCpu(s,a),d=chooseCpuAction(o,{difficulty:m.difficulty[a],seed:m.policySeed[a],step:step[a]}),i=o.actions.findIndex(x=>x.id===d.id);
  if(a===spec.seat&&spec.rounds.includes(s.round)&&spec.when(s,a,o.actions[i]))out.push(snap(s,a,o,m,o.actions[i]));
  const raw=e.legalActions(s);s=e.act(s,a,s.revision,raw[i].id);step[a]++;s=advanceResponses(s).state;
 }
 return {id:spec.id,title:spec.title,match:spec.match,seat:spec.seat,positions:out.slice(0,spec.limit??3)};
}
const ownPass=(s,a,x)=>s.phase==='normal'&&s.turn===a&&x.kind==='pass';
const usedOnOpp=card=>(s,a,x)=>s.turn!==a&&s.phase==='response'&&x.card?.cardId===card;
const SPECS=[
 {id:'P1',set:'TR',match:'TR:main:007:mirror:X-first:II',seat:'B',rounds:[4,5,6],when:ownPass,title:'中級：⑤のたんじょう候補が2枚あり、互いを「失う候補」として相殺。3ターン続けてたまごのまま終了'},
 {id:'P2',set:'X',match:'PX:main:001:X1:X-first',seat:'A',rounds:[1,2],when:ownPass,title:'中級（こいびと・交際）：①ねこ2枚の相殺でR1・R2にたんじょうせず終了'},
 {id:'P3',set:'TR',match:'TR:challenge:004:mirror:X-first:II',seat:'B',rounds:[8],when:usedOnOpp('E-boss'),title:'中級：相手のちょうせんに負けた直後、相手ターンに「あやまりにきただいおういか」を使用（合理的な反応）'},
 {id:'P4',set:'TR',match:'TR:challenge:001:mirror:Y-first:II',seat:'A',rounds:[2],when:usedOnOpp('G-street-fight'),title:'中級：相手のちょうせんの比較前に「かくとうバトル」で自分の参加メインを補正（相手ターンの反応）'},
 {id:'P5',set:'TR',match:'TR:challenge:004:mirror:Y-first:II',seat:'A',rounds:[8],when:usedOnOpp('G-grand-prix-3d'),title:'中級：両者のちょうせん完了後、相手ターンに「グランプリ」で+10（相手ターンにしか来ない発動機会）'},
 {id:'P6',set:'TR',match:'TR:main:001:mirror:X-first:II',seat:'A',rounds:[8],when:ownPass,title:'中級：R8で時8を残して終了。手札に時を使える札がない（構造的な使い残し）'},
 {id:'P7',set:'TR',match:'TR:item:001:mirror:Y-first:II',seat:'A',rounds:[3],when:(s,a,x)=>x.kind==='place'&&x.card?.cardId==='G-missile-command',title:'中級（アイテム）：R3に「ミサイルコマンド」をしかける。この試合では最後まで発動条件が成立しない'},
];
console.log(JSON.stringify({engine:e.VERSION,scenes:SPECS.map(scene)},null,1));
