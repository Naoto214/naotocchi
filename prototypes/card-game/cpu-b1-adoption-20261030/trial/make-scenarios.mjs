// Builds the trial's starting positions (CPU saves) from the B1 test fixtures (real games, official saves).
// For each position the CPU is the seat to move and must choose a stat. A policy seed is picked where heuristic-1
// chooses a mode of the WRONG stat and heuristic-2 the compared stat, so the difference can be seen on the device.
// Output: JSON for trial.mjs. Read-only use of the official engine/CPU.  Usage: node make-scenarios.mjs > scenarios.json
import {readFileSync} from 'node:fs';
import * as e from '../../engine.mjs';
import {observeCpu} from '../../cpu-observation.mjs';
import {chooseCpuAction} from '../../cpu-policy.mjs';
const F=JSON.parse(readFileSync(new URL('../../tests/fixtures/cpu-b1-positions.json',import.meta.url)));
const STAT={power:'power',wisdom:'wisdom','パンチ':'power','キック':'power','ガード':'wisdom'},JA={power:'ちから',wisdom:'ちえ'};
const LABEL={'ski:power':'CPUがちからでちょうせん → スキージャンプの能力値','ski:wisdom':'CPUがちえでちょうせん → スキージャンプの能力値',
 'fight:power:opp':'あなたがちからでちょうせん中 → CPUのかくとうバトル','fight:wisdom:opp':'あなたがちえでちょうせん中 → CPUのかくとうバトル'};
const out=[];
for(const key of Object.keys(LABEL)){
 const f=F[key],s=e.restore(f.save),o=observeCpu(s,f.seat),k=s.challenge.parameter;
 const pick=v=>o.actions.find(x=>x.id===chooseCpuAction(o,{difficulty:'intermediate',seed:v.seed,step:0,version:v.version}).id);
 let seed=null;for(let v=1;v<=500&&seed===null;v++){const a=pick({seed:v,version:'heuristic-1'}),b=pick({seed:v,version:'heuristic-2'});
  if(a.variant in STAT&&STAT[a.variant]!==k&&b.variant in STAT&&STAT[b.variant]===k)seed=v;}
 if(seed===null)throw Error('no contrasting seed for '+key);
 const save=policy=>JSON.stringify({version:'cpu-match-1',policy,humanSeat:f.seat==='A'?'B':'A',difficulty:'intermediate',policySeed:seed,step:0,guard:{turn:null,count:0,seen:{}},diagnostic:null,game:JSON.parse(f.save)});
 const name=x=>`${x.card?.name??''} ${JA[x.variant]??x.variant}（${JA[STAT[x.variant]]}が上がる）`;
 out.push({key,label:LABEL[key],round:s.round,parameter:JA[k],cpuSeat:f.seat,expected:{'heuristic-1':name(pick({seed,version:'heuristic-1'})),'heuristic-2':name(pick({seed,version:'heuristic-2'}))},
  saves:{'heuristic-2':save('heuristic-2'),'heuristic-1':save('heuristic-1')}});
}
console.log(JSON.stringify({scenarios:out},null,1));
