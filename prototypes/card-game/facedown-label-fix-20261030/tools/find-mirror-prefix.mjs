// 2人対戦（現行版）で、手番の席が自分の伏せ札（ボンバー）の誘発を持ち、相手も同じ名前の札を伏せている局面の保存（操作列の途中）を探す。画面QA用。
import * as e from '../../engine.mjs';import {observeCpu} from '../../cpu-observation.mjs';import {chooseCpuAction} from '../../cpu-policy.mjs';
const x=spec=>Object.entries(spec).flatMap(([id,n])=>Array(n).fill(id));
const DECK=x({'G-bomber-maze':3,'G-takoyaki-grill':3,'G-real-fishing':3,'I-bowtie':3,'W-snow':3,'W-countryside':3,'M-dog-01':3,'M-dog-02':3,'M-dog-03':3,'M-dog-04':3,'M-dog-05':2,'M-beetle-01':3,'C-panda':3,'I-c_coin2':2});
const nameOf=(s,id)=>s.cards[id].cardId;
for(let seed=1;seed<80;seed++){let s=e.createGame(seed,{A:DECK,B:DECK});let g=0;
 while(s.phase!=='finished'&&g++<6000){const a=e.actor(s),o=a==='A'?'B':'A',acts=e.legalActions(s);
  const t=acts.find(q=>q.kind==='trigger'&&nameOf(s,q.source)==='G-bomber-maze');
  const oppHidden=new Set(s.players[o].board.prepared.filter(p=>p.faceDown).map(p=>nameOf(s,p.id)));
  const ownOther=s.players[a].board.prepared.filter(p=>p.faceDown&&p.id!==t?.source&&oppHidden.has(nameOf(s,p.id)));
  if(t&&oppHidden.has('G-bomber-maze')&&ownOther.length){console.log(JSON.stringify({seed,seat:a,save:JSON.parse(e.save(s)),bomb:t.source,own:ownOther[0].id}));process.exit(0);}
  const ob=observeCpu(s,a),d=chooseCpuAction(ob,{difficulty:'intermediate',seed:seed+(a==='A'?1:2),step:s.revision});s=e.act(s,a,s.revision,d.id);}}
process.exit(1);
