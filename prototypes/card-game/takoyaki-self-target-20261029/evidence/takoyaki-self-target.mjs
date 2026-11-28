// 証拠（読み取り専用・修正なし）：たこやきやさん（G-takoyaki-grill）が、発動中の自分自身を対象に選べる。
// 正式裁定：87 G-takoyaki-grill の接続「このしかけ自身は発動領域へ出ているため対象にできない」、88 X06。
// 使い方: node prototypes/card-game/takoyaki-self-target-20261029/evidence/takoyaki-self-target.mjs
// 原本：PR #468（重複のためクローズ）commit a1c206e4 の prototypes/card-game/lunar-submarine-tier1-20261028/evidence/。処理は同一。
import * as e from '../../engine.mjs';
function fixture(){const s=e.createGame(71);s.choice=null;s.pending=[];s.phase='normal';s.window='normal';return s;}
function place(s,c,extra){const id=s.players.A.deck.shift();s.cards[id].cardId=c;s.cards[id].generation++;extra(s,id);return id;}
const out=[];
for(const withOther of [false,true]){let s=fixture();const main=place(s,'M-dog-03',(s,id)=>{s.players.A.board.main=id;});
 const tako=place(s,'G-takoyaki-grill',(s,id)=>s.players.A.board.prepared.push({id,faceDown:true,setSerial:0}));
 const other=withOther?place(s,'I-bowtie',(s,id)=>s.players.A.board.prepared.push({id,target:main,targetGeneration:s.cards[main].generation,attachedAt:0})):null;
 s=e.act(s,'A',s.revision,e.legalActions(s).find(a=>a.kind==='pass').id);
 let g=0;while(!e.legalActions(s).some(a=>a.kind==='trigger')&&g++<6)s=e.act(s,e.actor(s),s.revision,e.legalActions(s).find(a=>a.kind==='pass').id);
 const rows=e.legalActions(s).filter(a=>a.kind==='trigger'&&a.source===tako);
 out.push({case:withOther?'準備枠にほかの札あり':'準備枠はたこやきだけ',triggerTargets:rows.map(a=>({label:a.label,targetIsSelf:a.target===tako,targetIsOther:a.target===other}))});}
const selfOffered=out.every(r=>r.triggerTargets.some(t=>t.targetIsSelf));
console.log(JSON.stringify({card:'G-takoyaki-grill',ruling:'87 接続／88 X06：自身は対象にできない',implementation:"remaining-rules.mjs: triggers[{when:'end',target:'ownPrepared',...}]",selfTargetOffered:selfOffered,mismatch:selfOffered,cases:out},null,1));
