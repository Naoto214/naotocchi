// B1 direct tests on real positions (tests/fixtures.json, restored from official saves).
// CPU_IMPL=official -> the official CPU (expected RED on the "follows the parameter" tests);
// default           -> the experiment CPU with b1 for intermediate (expected GREEN).
// Run: node --test tests/b1.test.mjs ; CPU_IMPL=official node --test tests/b1.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as e from '../../engine.mjs';
import * as official from '../../cpu-policy.mjs';
import {observeCpu} from '../../cpu-observation.mjs';
import * as exp from '../lib/policy-exp.mjs';
import {observeExp} from '../lib/observe-exp.mjs';
const F=JSON.parse(readFileSync(new URL('./fixtures.json',import.meta.url)));
const OFFICIAL=process.env.CPU_IMPL==='official';
const STAT={power:'power',wisdom:'wisdom','パンチ':'power','キック':'power','ガード':'wisdom'};
const pos=k=>{const f=F[k];return {f,s:e.restore(f.save)};};
// Scores of every candidate under the implementation under test (intermediate).
function scored(s,seat,impl=OFFICIAL?'official':'exp',profile={b1:true}){
 if(impl==='official'){const o=observeCpu(s,seat),t=official.timeOpportunity(o,official.PROFILES.intermediate);
  return {o,score:o.actions.map((a,i)=>t?t[i]:official.scoreCpuAction(a,o,official.legacySpend,official.PROFILES.intermediate)),choice:official.chooseCpuAction(o,{difficulty:'intermediate',seed:1,step:0})};}
 const o=observeExp(s,seat),prof={...exp.PROFILES.intermediate,...profile},t=exp.timeOpportunity(o,prof);
 return {o,score:o.actions.map((a,i)=>t?t[i]:exp.scoreCpuAction(a,o,exp.legacySpend,prof)),choice:exp.chooseCpuAction(o,{difficulty:'intermediate',seed:1,step:0,profile})};
}
function followsParameter(key){
 const {f,s}=pos(key),{o,score,choice}=scored(s,f.seat),k=s.challenge.parameter;
 const rows=o.actions.map((a,i)=>({a,s:score[i]})).filter(x=>x.a.card?.cardId===f.card&&x.a.variant in STAT);
 const on=rows.filter(x=>STAT[x.a.variant]===k),off=rows.filter(x=>STAT[x.a.variant]!==k);
 assert.ok(on.length&&off.length,'both kinds of variants are legal here');
 // every variant raising the compared stat must score strictly above every variant raising the other stat
 assert.ok(Math.min(...on.map(x=>x.s))>Math.max(...off.map(x=>x.s)),`${key}: on=${on.map(x=>x.a.variant+':'+x.s.toFixed(2))} off=${off.map(x=>x.a.variant+':'+x.s.toFixed(2))}`);
 const c=o.actions.find(x=>x.id===choice.id);
 if(c.card?.cardId===f.card&&c.variant in STAT)assert.equal(STAT[c.variant],k,`${key}: chose ${c.variant} in a ${k} challenge`);
}
for(const [key,label] of [['ski:power','スキージャンプ・ちからの勝負'],['ski:wisdom','スキージャンプ・ちえの勝負'],['ski:tie','スキージャンプ・同点（勝敗が変わる）'],['ski:decided','スキージャンプ・大差（勝敗が変わらない）'],
 ['fight:power:opp','かくとうバトル・相手のちからの勝負（反応・連鎖中）'],['fight:wisdom:opp','かくとうバトル・相手のちえの勝負（連鎖2段）'],['fight:tie:any','かくとうバトル・同点（連鎖中）'],['fight:own','かくとうバトル・自分の勝負']])
 test(`B1 ${label}: 勝負の種目の能力値を選ぶ`,()=>followsParameter(key));
// Protection: the experiment copy with every switch off, and the beginner (b1 not applied), equal the official CPU.
if(!OFFICIAL){
 test('スイッチ無効時は正式CPUと同じ選択（中級・初級、全局面）',()=>{for(const k of Object.keys(F)){const {f,s}=pos(k);
  for(const difficulty of ['intermediate','beginner']){const a=official.chooseCpuAction(observeCpu(s,f.seat),{difficulty,seed:7,step:3}),b=exp.chooseCpuAction(observeExp(s,f.seat),{difficulty,seed:7,step:3});
   assert.equal(observeCpu(s,f.seat).actions.findIndex(x=>x.id===a.id),observeExp(s,f.seat).actions.findIndex(x=>x.id===b.id),k+' '+difficulty);}}});
 test('B1は勝負の外の候補の評価を変えない（勝負と無関係な行動の値は同じ）',()=>{const {f,s}=pos('ski:power'),x=scored(s,f.seat,'exp',{}),y=scored(s,f.seat,'exp',{b1:true});
  x.o.actions.forEach((a,i)=>{if(!(a.variant in STAT))assert.equal(x.score[i],y.score[i],a.kind+' '+(a.card?.cardId??''));});});
}
// Other variant-bearing stat effects (not in the seven CPU decks): synthetic observation, ability-trigger shape of
// ペンギン⑥ / おとこのひと② (chosenStat +1, this turn). In a wisdom challenge the wisdom variant must win; outside a
// challenge the stat with the larger own margin is preferred (the other keeps a positive value).
function synthetic(challenge){
 const pl=(power,wisdom)=>({time:3,growth:30,stats:{power,wisdom},board:{main:{cardId:'M-penguin-06'},partner:null,world:null,companions:[],prepared:[]},deckCount:20,hand:[],discard:[]});
 const act=v=>({id:'x'+v,kind:'trigger',variant:v,card:{cardId:'M-penguin-06',type:'main'},program:{steps:[{op:'chosenStat',n:1,power:0,wisdom:0,to:'self',destination:null,duration:'turn',steps:[]}],handCost:false,selfCost:false,select:[]},cost:0,mandatory:false});
 return {seat:'A',round:5,turn:'A',phase:challenge?'response':'trigger',players:{A:pl(4,2),B:pl(3,3)},challenge,chain:[],deck:[],reactive:[],challengeKit:{own:[],opponent:{faceDown:0,hand:0,time:0}},actions:[act('power'),act('wisdom'),{id:'skip',kind:'skip'}]};
}
const synScore=(o)=>OFFICIAL?o.actions.map(a=>official.scoreCpuAction(a,o,official.legacySpend,official.PROFILES.intermediate)):o.actions.map(a=>exp.scoreCpuAction(a,o,exp.legacySpend,{...exp.PROFILES.intermediate,b1:true}));
test('B1 ほかの能力値選択（ペンギン⑥型・このターン+1）: ちえの勝負ではちえ',()=>{const s=synScore(synthetic({parameter:'wisdom',completed:false}));assert.ok(s[1]>s[0],`power=${s[0]} wisdom=${s[1]}`);});
test('B1 ほかの能力値選択: 勝負の外では差の大きい能力値（ちから+1）を優先',()=>{const s=synScore(synthetic(null));assert.ok(s[0]>s[1]&&s[1]>0,`power=${s[0]} wisdom=${s[1]}`);});
