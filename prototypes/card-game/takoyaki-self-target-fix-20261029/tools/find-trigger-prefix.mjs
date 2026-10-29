// 新しい版（hotseat-5）で、たこやきやさんの終了時の誘発が出ていて準備枠にほかの札もある局面の保存（操作列の途中）を探す。画面QA用。
import * as e from '../../engine.mjs';import {observeCpu} from '../../cpu-observation.mjs';import {chooseCpuAction} from '../../cpu-policy.mjs';
const TAKO='G-takoyaki-grill';const x=spec=>Object.entries(spec).flatMap(([id,n])=>Array(n).fill(id));
const DECK=x({[TAKO]:3,'G-real-fishing':3,'I-bowtie':3,'M-dog-01':3,'M-dog-02':3,'M-dog-03':3,'M-dog-04':3,'M-dog-05':2,'M-beetle-01':3,'M-beetle-02':3,'C-panda':3,'C-shiba':3,'W-snow':2,'I-c_coin2':3});
for(let seed=1;seed<60;seed++){let s=e.createGame(seed,{A:DECK,B:DECK});let g=0;
 while(s.phase!=='finished'&&g++<5000){const a=e.actor(s),acts=e.legalActions(s);
  const t=acts.filter(q=>q.kind==='trigger'&&s.cards[q.source]?.cardId===TAKO);
  if(t.length&&s.players[a].board.prepared.length>=3){console.log(JSON.stringify({seed,seat:a,save:JSON.parse(e.save(s)),tako:t[0].source,targets:t.map(q=>q.target)}));process.exit(0);}
  const o=observeCpu(s,a),d=chooseCpuAction(o,{difficulty:'intermediate',seed:seed+(a==='A'?1:2),step:s.revision});s=e.act(s,a,s.revision,d.id);}}
process.exit(1);
