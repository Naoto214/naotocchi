// 修正前エンジン（main e33ec25a、hotseat-6）で、ボンバーの誘発を含む実際の対戦の保存を作る（旧保存の再生互換の確認用）。
// CPU（中級）に、ボンバーの誘発が出たら発動させ、自分側の対象に指定の札（自分自身／ほかの札）を選ばせる。それ以外はCPUの判断。
// 使い方: node make-hotseat6-saves.mjs > ../../tests/bomber-hotseat6-saves.json
import {createHash} from 'node:crypto';
import * as e from '../../engine.mjs';import {observeCpu} from '../../cpu-observation.mjs';import {chooseCpuAction} from '../../cpu-policy.mjs';
const BOMB='G-bomber-maze';const x=spec=>Object.entries(spec).flatMap(([id,n])=>Array(n).fill(id));
const DECK=x({[BOMB]:3,'G-real-fishing':3,'I-bowtie':3,'W-snow':3,'W-countryside':3,'M-dog-01':3,'M-dog-02':3,'M-dog-03':3,'M-dog-04':3,'M-dog-05':2,'M-beetle-01':3,'C-panda':3,'C-shiba':2,'I-c_coin2':3});
const digest=s=>createHash('sha256').update(JSON.stringify({players:s.players,result:s.result,log:s.log})).digest('hex');
const rows=[];
for(const [kase,self] of [['self-target',true],['other-target',false]])for(let seed=1;seed<80;seed++){
 let s=e.createGame(seed,{A:DECK,B:DECK});let g=0,triggerRevision=null,hit=false,picking=false;
 while(s.phase!=='finished'&&g++<6000){const a=e.actor(s),acts=e.legalActions(s);
  if(!hit&&!picking){const t=acts.find(q=>q.kind==='trigger'&&s.cards[q.source]?.cardId===BOMB&&s.players[a].board.prepared.length>=2);
   if(t){triggerRevision=s.revision;picking=true;s=e.act(s,a,s.revision,t.id);continue;}}
  if(picking&&s.choice?.kind==='activation_selection'){const d=s.activationDraft,key=d.rule.select[d.index].key;
   if(key==='own'){const want=acts.find(q=>q.kind==='choose'&&(self?q.value===d.action.source:q.value!==d.action.source&&!['done','cancel'].includes(q.value)));
    if(!want){picking=false;s=e.act(s,a,s.revision,acts.find(q=>q.value==='cancel').id);continue;}s=e.act(s,a,s.revision,want.id);continue;}
   if(key==='other'){hit=true;picking=false;s=e.act(s,a,s.revision,acts.find(q=>q.kind==='choose'&&!['done','cancel'].includes(q.value)).id);continue;}}
  const o=observeCpu(s,a),d=chooseCpuAction(o,{difficulty:'intermediate',seed:seed+(a==='A'?1:2),step:s.revision});s=e.act(s,a,s.revision,d.id);}
 if(!hit||s.phase!=='finished')continue;
 rows.push({case:kase,selfTargeted:self,seed,triggerRevision,finalRevision:s.revision,result:s.result,stateSha256:digest(s),save:JSON.parse(e.save(s))});break;}
console.log(JSON.stringify({note:'hotseat-6 saves made with the pre-fix engine (main e33ec25a). self-target: ボンバーが自分側の対象に自分自身を選んだ操作を含む。Restoring must reproduce stateSha256 exactly.',generatedFrom:'e33ec25a',rows},null,1));
