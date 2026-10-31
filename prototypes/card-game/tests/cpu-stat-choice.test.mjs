// CPU policy heuristic-2 (B1): during an open challenge the intermediate CPU values a stat-choosing candidate
// (スキージャンプ ちから/ちえ, かくとうバトル パンチ/キック/ガード, chosenStat variants) by the compared stat.
// Positions are real games from the PR #491 experiment (official saves, restored exactly).
// heuristic-1 and the beginner must keep the exact choices recorded on main 851cf09a before heuristic-2.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as e from '../engine.mjs';
import {observeCpu} from '../cpu-observation.mjs';
import {chooseCpuAction,scoreCpuAction,timeOpportunity,legacySpend,PROFILES} from '../cpu-policy.mjs';
const F=JSON.parse(readFileSync(new URL('./fixtures/cpu-b1-positions.json',import.meta.url)));
const STAT={power:'power',wisdom:'wisdom','パンチ':'power','キック':'power','ガード':'wisdom'};
const KEYS=Object.keys(F).filter(k=>k!=='_note');
const pos=k=>{const f=F[k],s=e.restore(f.save);return {f,s,o:observeCpu(s,f.seat)};};
// Raw scores of every candidate as chooseCpuAction ranks them (before the beginner mask/cap).
function scores(o,profile){const t=timeOpportunity(o,profile);return o.actions.map((a,i)=>t?t[i]:scoreCpuAction(a,o,legacySpend,profile));}
const H2={...PROFILES.intermediate,statChoice:true};
for(const [key,label] of [['ski:power','スキージャンプ・ちからの勝負'],['ski:wisdom','スキージャンプ・ちえの勝負'],['ski:tie','スキージャンプ・同点（勝敗が変わる）'],['ski:decided','スキージャンプ・大差（勝敗が変わらない）'],
 ['fight:power:opp','かくとうバトル・相手のちからの勝負（連鎖中）'],['fight:wisdom:opp','かくとうバトル・相手のちえの勝負（連鎖2段）'],['fight:tie:any','かくとうバトル・同点（連鎖中）'],['fight:own','かくとうバトル・自分の勝負']])
 test(`中級 heuristic-2：${label} では勝負の種目の能力値を選ぶ`,()=>{
  const {f,s,o}=pos(key),k=s.challenge.parameter,sc=scores(o,H2);
  const rows=o.actions.map((a,i)=>({a,s:sc[i]})).filter(x=>x.a.card?.cardId===f.card&&x.a.variant in STAT);
  const on=rows.filter(x=>STAT[x.a.variant]===k),off=rows.filter(x=>STAT[x.a.variant]!==k);
  assert.ok(on.length&&off.length);
  assert.ok(Math.min(...on.map(x=>x.s))>Math.max(...off.map(x=>x.s)),`on=${on.map(x=>x.a.variant+':'+x.s)} off=${off.map(x=>x.a.variant+':'+x.s)}`);
  for(let seed=1;seed<=20;seed++){const c=o.actions.find(x=>x.id===chooseCpuAction(o,{difficulty:'intermediate',seed,step:0}).id);
   if(c.card?.cardId===f.card&&c.variant in STAT)assert.equal(STAT[c.variant],k,`seed ${seed}: ${c.variant}`);}
 });
test('heuristic-1（旧保存の続き）と初級は、実装前の main と同じ選択（全局面・20 seed）',()=>{
 for(const key of KEYS){const {f,o}=pos(key);
  for(let seed=1;seed<=20;seed++){
   const h1=chooseCpuAction(o,{difficulty:'intermediate',seed,step:0,version:'heuristic-1'});assert.equal(o.actions.findIndex(x=>x.id===h1.id),f.h1Choices.intermediate[seed-1],`${key} intermediate h1 seed ${seed}`);
   for(const version of ['heuristic-1','heuristic-2']){const b=chooseCpuAction(o,{difficulty:'beginner',seed,step:0,version});assert.equal(o.actions.findIndex(x=>x.id===b.id),f.h1Choices.beginner[seed-1],`${key} beginner ${version} seed ${seed}`);}}}});
test('選択肢のない能力値カード（ビーチバレー）の評価は変えない（あそびずきカワウソの誘発など別の理由を残す）',()=>{
 const {o}=pos('volley:otter'),a=scores(o,PROFILES.intermediate),b=scores(o,H2);
 o.actions.forEach((x,i)=>{if(x.card?.cardId==='G-beach-volley')assert.equal(b[i],a[i]);});});
test('勝負と無関係な候補の評価は変えない',()=>{for(const key of KEYS){const {o}=pos(key),a=scores(o,PROFILES.intermediate),b=scores(o,H2);
 o.actions.forEach((x,i)=>{if(!(x.variant in STAT))assert.equal(b[i],a[i],`${key} ${x.kind} ${x.card?.cardId??''}`);});}});
// Other variant-bearing stat effects (ペンギン⑥ / おとこのひと② shape, chosenStat +1 this turn): synthetic observation.
function synthetic(challenge){
 const pl=(power,wisdom)=>({time:3,growth:30,stats:{power,wisdom},board:{main:{cardId:'M-penguin-06'},partner:null,world:null,companions:[],prepared:[]},deckCount:20,hand:[],discard:[]});
 const act=v=>({id:'x'+v,kind:'trigger',variant:v,card:{cardId:'M-penguin-06',type:'main'},program:{steps:[{op:'chosenStat',n:1,power:0,wisdom:0,to:'self',destination:null,duration:'turn',steps:[]}],handCost:false,selfCost:false,select:[]},cost:0,mandatory:false});
 return {seat:'A',round:5,turn:'A',phase:challenge?'response':'trigger',players:{A:pl(4,2),B:pl(3,3)},challenge,chain:[],deck:[],reactive:[],challengeKit:{own:[],opponent:{faceDown:0,hand:0,time:0}},actions:[act('power'),act('wisdom'),{id:'skip',kind:'skip'}]};
}
test('ほかの能力値選択（ペンギン⑥型）：ちえの勝負ではちえ、勝負の外では差の大きい能力値を優先',()=>{
 const a=synthetic({parameter:'wisdom',completed:false}).actions,o1=synthetic({parameter:'wisdom',completed:false}),o2=synthetic(null);
 const s1=o1.actions.map(x=>scoreCpuAction(x,o1,legacySpend,H2)),s2=o2.actions.map(x=>scoreCpuAction(x,o2,legacySpend,H2));
 assert.ok(s1[1]>s1[0],`in challenge power=${s1[0]} wisdom=${s1[1]}`);assert.ok(s2[0]>s2[1]&&s2[1]>0,`outside power=${s2[0]} wisdom=${s2[1]}`);assert.equal(a.length,3);});
