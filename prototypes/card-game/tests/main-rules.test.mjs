import test from 'node:test';
import assert from 'node:assert/strict';
import {CATALOG} from '../full-catalog.mjs';
import {MAIN_RULES} from '../main-rules.mjs';

test('explicit main programs bind canonical main sources without fallback',()=>{
 assert.ok(Object.keys(MAIN_RULES).length>=59);
 for(const [id,rule] of Object.entries(MAIN_RULES)){
  const source=CATALOG[id];
  assert.equal(source.type,'main',id);
  assert.ok(source.source.includes('#'),id);
  assert.match(source.source_sha256,/^[a-f0-9]{64}$/);
  assert.equal(rule.mode,'main');
  if(!rule.triggers&&!rule.active&&!rule.passive)assert.equal(source.text,'能力なし。',id);
 }
 assert.equal(MAIN_RULES['M-cat-06'],undefined,'replacement must not silently become vanilla');
 assert.equal(MAIN_RULES['M-phoenix-03'],undefined,'unimplemented activation costs must not be omitted');
});

test('birth ordering descriptors distinguish reorder from top/bottom choice',()=>{
 assert.equal(CATALOG['M-cat-01'].text,'このメインがたんじょうした時、発動できる。山札上2枚を見る。その2枚を好きな順で山札の一番上に戻す。');
 assert.deepEqual(MAIN_RULES['M-cat-01'].triggers[0].steps,[{op:'reorderTop',n:2}]);
 assert.equal(CATALOG['M-stagbeetle-01'].text,'このメインがたんじょうした時、発動できる。山札上2枚を見る。そのうち1枚を山札の一番上、残りを山札の一番下に置く。');
 assert.deepEqual(MAIN_RULES['M-stagbeetle-01'].triggers[0].steps,[{op:'chooseTop',n:2}]);
});

test('higher-stage challenge programs bind exact action-count predicates',()=>{
 for(const [id,n,bonus] of [['M-cat-04',1,1],['M-cat-05',1,2],['M-cat-08',0,2]]){
  const t=MAIN_RULES[id].triggers[0];
  assert.equal(t.when,'challenge');assert.equal(t.target,'selfMain');assert.equal(t.once,true);
  assert.deepEqual(t.condition,{all:['ownChallenge',{value:'actions',op:id==='M-cat-04'?'gte':'eq',n}]});
  assert.deepEqual(t.steps,[{op:'battleStat',n:bonus}]);
 }
 assert.match(CATALOG['M-cat-05'].text,/アクションカードがちょうど1枚/);
 assert.match(CATALOG['M-cat-08'].text,/アクションカードをプレイしていない/);
});

test('cicada search includes complete species and stage bounds with mandatory selection',()=>{
 assert.equal(CATALOG['M-cicada-04'].text,'このメインがときおくりでこの段階になった時、発動できる。山札上3枚を見る。その中から⑤〜⑧のセミ1枚を選んで公開し、手札に加える。残りを好きな順で山札の一番下に置く。');
 assert.deepEqual(MAIN_RULES['M-cicada-04'].triggers[0].steps,[{op:'search',n:3,filter:{type:'main',species:'M-cicada',minStage:5,maxStage:8},min:1,max:1,reveal:true}]);
});

test('persistent-world and end-turn requirements remain explicit',()=>{
 assert.match(CATALOG['M-dandelion-06'].text,/このメインがこの段階になった時/);
 assert.equal(MAIN_RULES['M-dandelion-06'].triggers[0].when,'arrival');
 assert.deepEqual(MAIN_RULES['M-dandelion-06'].triggers[0].condition,{value:'sameWorldSinceStart',op:'eq',n:1});
 assert.match(CATALOG['M-world_tree-05'].text,/ちょうせんしておらず.*なかま・こいびと・セカイの3種類すべて/);
 assert.equal(MAIN_RULES['M-world_tree-05'].triggers[0].condition.all.length,4);
});


test('new exact family descriptors retain timing, cost-free conditions and source clauses',()=>{
 assert.equal(CATALOG['M-antlion-05'].text,'このメインがときおくりでこの段階になった時、自分の準備枠にカードがない場合、発動できる。1枚引く。');
 assert.deepEqual(MAIN_RULES['M-antlion-05'].triggers[0].condition,{value:'prepared',op:'eq',n:0});
 assert.equal(MAIN_RULES['M-clownfish-01'].triggers[0].when,'transform');
 assert.deepEqual(MAIN_RULES['M-cicada-05'].triggers[0].steps,[{op:'discount',action:'quick_play',n:2}]);
 assert.match(CATALOG['M-cicada-05'].text,/「すぐつかう」でプレイするあそびの時を2/);
 assert.match(CATALOG['M-frog-08'].text,/名前の異なるセカイカードが2枚以上/);
 assert.deepEqual(MAIN_RULES['M-frog-08'].triggers[0].condition.all[1],{value:'discardWorldNames',op:'gte',n:2});
 assert.match(CATALOG['M-dog-08'].text,/このターン開始時からそれぞれの枠にあり続け/);
 assert.deepEqual(MAIN_RULES['M-dog-08'].triggers[0].condition.all,['sameMainSinceStart','samePartnerSinceStart',{value:'relationship',op:'eq',n:4}]);
});

test('woman challenge modifier grants one bonus for either person and two for both',()=>{
 assert.equal(CATALOG['M-woman-04'].text,'1ターンに1回。このメインが自分からちょうせんする時、自分になかままたはこいびとがある場合、発動できる。このちょうせんの間、このメインの使用する能力値+1。自分になかまとこいびとの両方がある場合、代わりに+2する。');
 const t=MAIN_RULES['M-woman-04'].triggers[0];
 assert.equal(t.condition.all[1].any.length,2);
 assert.equal(t.steps[0].n,1);assert.equal(t.steps[1].steps[0].n,1);
 assert.equal(t.steps[1].condition.all.length,2);
});

test('world continuity draw captures the selected world instead of this main',()=>{
 assert.equal(CATALOG['M-dandelion-05'].text,'1ターンに1回。自分のターン終了時、自分のセカイ1枚を対象として発動できる。次の自分のターン開始時まで、そのカードが自分のセカイ枠にあり続けていた場合、その開始時に1枚引く。');
 const t=MAIN_RULES['M-dandelion-05'].triggers[0];
 assert.equal(t.target,'ownWorld');assert.equal(t.steps[0].timing,'start');
 assert.equal(t.steps[0].steps[0].condition,'targetPresent');
});


test('opponent action triggers preserve turn, ordinal and repeated method clauses',()=>{
 assert.equal(CATALOG['M-stagbeetle-04'].text,'1ターンに1回。相手ターンに、相手がそのターン最初のアクションカードをプレイした時、発動できる。1枚引き、その後手札1枚を山札の一番下に置く。');
 assert.equal(CATALOG['M-venus_flytrap-01'].text,'1ターンに1回。相手のターンに、相手がそのターン2枚目のアクションカードをプレイした時、発動できる。1枚引き、その後手札1枚を山札の一番下に置く。');
 for(const [id,predicate] of [['M-stagbeetle-04','eventActorFirstAction'],['M-venus_flytrap-01','eventActorSecondAction'],['M-venus_flytrap-02','eventActorRepeatedMethod'],['M-venus_flytrap-04','eventActorRepeatedMethod']]){
  const t=MAIN_RULES[id].triggers[0];assert.equal(t.opponent,true);assert.equal(t.once,true);
  assert.deepEqual(t.condition,{all:[{not:'ownTurn'},'eventAction',predicate]});
 }
 assert.match(CATALOG['M-venus_flytrap-02'].text,/それより前に同じプレイ方法/);
 assert.equal(MAIN_RULES['M-venus_flytrap-04'].triggers[0].target,'opponentPrepared');
});

test('face-up play families require earlier qualifying plays instead of raw totals',()=>{
 assert.equal(CATALOG['M-ren-03'].text,'1ターンに1回。自分が「あそび」カードを表向きでプレイした時、このターン、自分がそれより前に「あそび」カードを表向きでプレイしていた場合、発動できる。1枚引き、その後手札1枚を山札の一番下に置く。');
 assert.deepEqual(MAIN_RULES['M-ren-03'].triggers[0].condition,{all:['eventFaceUpPlay','priorFaceUpPlay']});
 assert.match(CATALOG['M-woman-06'].text,/それより前に.*別の種類のアクションカードを表向き/);
 assert.equal(MAIN_RULES['M-woman-06'].triggers[0].condition,'eventFaceUpActionWithEarlierDifferentType');
 assert.match(CATALOG['M-antlion-03'].text,/相手のターン.*「すぐつかう」.*伏せたカード/);
 assert.deepEqual(MAIN_RULES['M-antlion-03'].triggers[0].condition.all[2],{value:'preparedHidden',op:'gte',n:1});
});

test('delayed programs schedule exact next-start or same-turn-end effects',()=>{
 assert.equal(CATALOG['M-cicada-03'].text,'自分のターン開始時、発動できる。このターンの終了時、このターン自分がセミへときおくりしていた場合、1枚引く。');
 const c=MAIN_RULES['M-cicada-03'].triggers[0].steps[0];assert.equal(c.timing,'end');
 assert.deepEqual(c.steps[0].condition,{value:'cicadaTimeSkips',op:'gte',n:1});
 assert.match(CATALOG['M-sakura-01'].text,/次の自分のターン.*最初に「みにつける」/);
 assert.equal(MAIN_RULES['M-sakura-01'].triggers[0].steps[0].timing,'start');
 assert.equal(MAIN_RULES['M-stagbeetle-03'].triggers[0].condition.n,2);
});

test('butterfly recovery follows successful movement and hermit crab searches methods',()=>{
 assert.equal(CATALOG['M-butterfly-06'].text,'このメインがときおくりでこの段階になった時、自分の準備枠のカード1枚を対象として発動できる。そのカードを手札に戻す。そうしたなら、このターン、自分が次に「すぐつかう」でプレイするカードの時を1少なくする。');
 const t=MAIN_RULES['M-butterfly-06'].triggers[0];assert.equal(t.target,'ownPrepared');assert.equal(t.steps[1].condition,'moved');
 assert.deepEqual(t.steps[1].steps,[{op:'discount',action:'quick',n:1}]);
 assert.deepEqual(MAIN_RULES['M-hermit_crab-01'].triggers[0].steps[0].filter,{method:'みにつける'});
});
