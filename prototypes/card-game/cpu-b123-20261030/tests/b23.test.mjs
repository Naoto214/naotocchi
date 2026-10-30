// B2 (last-turn hold value) and B3 (trap fire chance) direct tests on real positions (tests/fixtures-b23.json).
// Run: node --test tests/b23.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as e from '../../engine.mjs';
import * as exp from '../lib/policy-exp.mjs';
import {observeExp,trapChance,horizon} from '../lib/observe-exp.mjs';
const F=JSON.parse(readFileSync(new URL('./fixtures-b23.json',import.meta.url)));
const pos=k=>{const f=F[k];return {f,s:e.restore(f.save)};};
function scores(s,seat,difficulty,profile){const o=observeExp(s,seat),prof={...exp.PROFILES[difficulty],...profile},t=exp.timeOpportunity(o,prof);
 const spend=prof.b2?(a,x)=>x.horizon==='none'?0:exp.legacySpend(a,x):exp.legacySpend;return {o,score:o.actions.map((a,i)=>t?t[i]:exp.scoreCpuAction(a,o,spend,prof))};}
const isPlay=a=>['play','programPlay'].includes(a.kind);
// ---- B2
test('B2 horizon: R1-R9は full、R10の先攻は相手ターンだけ残る、後攻の最終ターンは none',()=>{
 for(const k of ['b2:r9','b2:last:B','b2:last:A:plain']){const {f,s}=pos(k);assert.equal(horizon(s,f.seat),{'b2:r9':'full','b2:last:B':'none','b2:last:A:plain':'oppOnly'}[k],k);}});
test('B2 R9では評価が変わらない（最終ターン以外に適用しない）',()=>{const {f,s}=pos('b2:r9');for(const d of ['intermediate','beginner']){const a=scores(s,f.seat,d,{}),b=scores(s,f.seat,d,{b2:true});assert.deepEqual(a.score,b.score,d);}});
test('B2 後攻R10：手札1枚の保持価値3をほぼ差し引かない（効果0のカードがパスと同点にならない0.05だけ残す）',()=>{const {f,s}=pos('b2:last:B'),a=scores(s,f.seat,'intermediate',{}),b=scores(s,f.seat,'intermediate',{b2:true});
 a.o.actions.forEach((x,i)=>{if(isPlay(x)&&!x.program?.select?.some(g=>g.cost))assert.equal(Math.round((b.score[i]-a.score[i])*1e6)/1e6,2.95,x.card?.cardId);});});
test('B2 先攻R10：相手ターンで使える反応カード（かくとうバトル）は保持価値を残し、それ以外は差し引かない',()=>{const {f,s}=pos('b2:last:A:oppUsable'),a=scores(s,f.seat,'intermediate',{}),b=scores(s,f.seat,'intermediate',{b2:true});
 let fight=0,plain=0;a.o.actions.forEach((x,i)=>{if(!isPlay(x))return;const d=Math.round((b.score[i]-a.score[i])*1e6)/1e6;
  if(x.card?.cardId==='G-street-fight'){assert.equal(d,0,'street-fight kept');fight++;}else if(!x.program?.select?.some(g=>g.cost)){assert.equal(d,2.95,x.card?.cardId);plain++;}});
 assert.ok(fight&&plain,'both kinds present');});
test('B2 R10でも効果0のカードは使わない（無条件に全部使う処理ではない）',()=>{const {f,s}=pos('b2:last:B'),o=observeExp(s,f.seat),d=exp.chooseCpuAction(o,{difficulty:'intermediate',seed:1,step:0,profile:{b2:true}});
 const c=o.actions.find(x=>x.id===d.id);assert.equal(c.kind,'pass','E-mirror with no higher-stage target left (effect 0) is still not played');});
// ---- B3
test('B3 ミサイルコマンド：序盤は見込みあり、相手の対象カードが見えないまま後半になると低い',()=>{const a=pos('b3:missile:early'),b=pos('b3:missile:late');
 const pa=trapChance(a.s,a.f.seat,'G-missile-command'),pb=trapChance(b.s,b.f.seat,'G-missile-command');assert.ok(pa>pb&&pb<.35,`early=${pa} late=${pb}`);});
test('B3 スキージャンプ：R10の自分ターンにしかけても次の宣言機会がないので0、序盤は1',()=>{const a=pos('b3:ski:r10'),b=pos('b3:ski:early');
 assert.equal(trapChance(a.s,a.f.seat,'G-ski-jump'),0);assert.equal(trapChance(b.s,b.f.seat,'G-ski-jump'),1);});
test('B3 たこやきやさん（自分のターン終了時）は確実に発動機会が来るので1',()=>{const {f,s}=pos('b3:takoyaki');assert.equal(trapChance(s,f.seat,'G-takoyaki-grill'),1);});
test('B3 R10のスキージャンプはしかけない／序盤のしかけ評価は現行と同じ',()=>{
 {const {f,s}=pos('b3:ski:r10'),o=observeExp(s,f.seat),d=exp.chooseCpuAction(o,{difficulty:'intermediate',seed:1,step:0,profile:{b3:true}});const c=o.actions.find(x=>x.id===d.id);assert.ok(!(c.kind==='place'&&c.trapHint),'no trap placed at R10');}
 {const {f,s}=pos('b3:ski:early'),a=scores(s,f.seat,'intermediate',{}),b=scores(s,f.seat,'intermediate',{b3:true});assert.deepEqual(a.score,b.score);}});
