// 修正前エンジン（main 7a59eff0、hotseat-5）で、かえるの誘発を含む実際の対戦の保存を作る（旧保存の再生互換の確認用）。
// CPU（中級）に、かえるの誘発が出たら指定の対象（自分自身／ほかの札）で発動させる。それ以外はCPUの判断。
// 使い方: node make-hotseat5-saves.mjs > ../../tests/frogger-hotseat5-saves.json
import {createHash} from 'node:crypto';
import * as e from '../../engine.mjs';import {observeCpu} from '../../cpu-observation.mjs';import {chooseCpuAction} from '../../cpu-policy.mjs';
const FROG='G-frogger-road';const x=spec=>Object.entries(spec).flatMap(([id,n])=>Array(n).fill(id));
const DECK=x({[FROG]:3,'G-real-fishing':3,'I-bowtie':3,'W-snow':3,'W-countryside':3,'M-dog-01':3,'M-dog-02':3,'M-dog-03':3,'M-dog-04':3,'M-dog-05':2,'M-beetle-01':3,'C-panda':3,'C-shiba':2,'I-c_coin2':3});
const digest=s=>createHash('sha256').update(JSON.stringify({players:s.players,result:s.result,log:s.log})).digest('hex');
const rows=[];
for(const [kase,self] of [['self-target',true],['other-target',false]])for(let seed=1;seed<40;seed++){
 let s=e.createGame(seed,{A:DECK,B:DECK});let g=0,triggerRevision=null,hit=false;
 while(s.phase!=='finished'&&g++<5000){const a=e.actor(s),acts=e.legalActions(s);
  const tako=acts.filter(q=>q.kind==='trigger'&&s.cards[q.source]?.cardId===FROG);
  const pick=!hit?tako.find(q=>self?q.target===q.source:q.target&&q.target!==q.source):null;
  if(pick){triggerRevision=s.revision;hit=true;s=e.act(s,a,s.revision,pick.id);continue;}
  const o=observeCpu(s,a),d=chooseCpuAction(o,{difficulty:'intermediate',seed:seed+(a==='A'?1:2),step:s.revision});s=e.act(s,a,s.revision,d.id);}
 if(!hit||s.phase!=='finished')continue;
 rows.push({case:kase,selfTargeted:self,seed,triggerRevision,finalRevision:s.revision,result:s.result,stateSha256:digest(s),save:JSON.parse(e.save(s))});break;}
console.log(JSON.stringify({note:'hotseat-5 saves made with the pre-fix engine (main 7a59eff0). self-target: かえるのおうちがえりが自分自身を対象にした操作を含む。Restoring must reproduce stateSha256 exactly.',generatedFrom:'7a59eff0',rows},null,1));
