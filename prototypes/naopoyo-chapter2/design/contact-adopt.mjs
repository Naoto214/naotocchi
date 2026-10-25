import fs from 'node:fs';import {expansionStages} from '../expansion-stages.mjs';import {stages} from '../stages.mjs';import {replay} from '../search.mjs';import {complete} from '../../naopoyo-v2/engine.mjs';
const dir='docs/naopoyo-contact-20261025',old=JSON.parse(fs.readFileSync('docs/naopoyo-gravity-20261024/solutions.json')),simple=JSON.parse(fs.readFileSync(`${dir}/evidence/search-11-12-13-14-16-17-20.json`));
const selected=Object.fromEntries([18,20].map(n=>[n,JSON.parse(fs.readFileSync(`${dir}/evidence/selected-${n}.json`))]));
for(const n of [18,20]){const s=expansionStages.find(s=>s.number===n),t=selected[n].stage;s.walls=t.walls;s.gates=t.gates;}
const eighteen=expansionStages.find(s=>s.number===18);eighteen.hints[2]='二つの8を作ろう。下の岩へ登って8の門を渡り、右隣のトゲで分けよう。';eighteen.hint=eighteen.hints[0];
const twenty=expansionStages.find(s=>s.number===20);twenty.discovery='二つの8で門を越え、片方を足場にもう片方を分ける。上の作業場で7を組み、足場役も3ずつ回収する。';twenty.hints=['全部で16。上の星は7、下の星は3。帰す組み合わせから考えよう。','下の門の先では、もう一人を足場にしてトゲへ登ろう。7の材料と、支える仲間を同時に残したい。','3の門の向こうの作業場で7を作ろう。7は左上の岩を回って星へ。下に残った仲間は3ずつ帰そう。'];twenty.hint=twenty.hints[0];
fs.writeFileSync('prototypes/naopoyo-chapter2/expansion-stages.mjs','// Authored definitions; contact-v1 evidence: docs/naopoyo-contact-20261025/\nexport const expansionStages='+JSON.stringify(expansionStages,null,2)+';\n');
const rows=[];for(const s0 of stages){const s=selected[s0.number]?.stage||s0;let row={id:s.id,number:s.number,shortestProven:false};
 if(selected[s.number])row.path=selected[s.number].path;
 else if(s.number===19)row.path=JSON.parse(fs.readFileSync(`${dir}/evidence/witness-19.json`)).find(r=>r.path).path;
 else {const solved=simple.find(r=>r.number===s.number)?.result;if(solved?.status==='solved')Object.assign(row,solved);else row.path=old.stages.find(r=>r.id===s.id).path;}
 if(!complete(replay(s,row.path)))throw Error('not rescued '+s.number);row.status='solved';row.depth=row.path.length;rows.push(row);
}fs.writeFileSync(`${dir}/solutions.json`,JSON.stringify({movementRules:'contact-v1',gravityRules:'supported-v1',note:'Every path replayed with new rules; shortest only where BFS was rerun to completion.',stages:rows},null,2));console.log(rows.map(r=>[r.number,r.depth,r.shortestProven]));
