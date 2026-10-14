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
 assert.equal(MAIN_RULES['M-phoenix-04'],undefined,'unimplemented post-challenge effects must not be omitted');
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


test('one-card activation costs remain separate from effect resolution',()=>{
 assert.equal(CATALOG['M-clownfish-02'].text,'1ターンに1回。自分のターンに、手札のメイン1枚を公開して山札の一番下に置いて発動できる。山札上2枚を見る。その中から1枚を選んで手札に加え、残りを山札の一番下に置く。');
 const c=MAIN_RULES['M-clownfish-02'].active;
 assert.deepEqual(c.handCost,{destination:'bottom',type:'main',reveal:true});
 assert.deepEqual(c.steps,[{op:'search',n:2,filter:{},min:1,max:1}]);
 assert.equal(CATALOG['M-phoenix-01'].text,'このメインがたんじょうした時、手札1枚を捨て札に置いて発動できる。このターン、このメインのちえ+2。');
 const p=MAIN_RULES['M-phoenix-01'].triggers[0];assert.deepEqual(p.handCost,{destination:'discard'});assert.equal(p.steps[0].wisdom,2);
 assert.match(CATALOG['M-salmon-02'].text,/セカイを変更していない.*手札のセカイカード1枚を公開/);
 assert.deepEqual(MAIN_RULES['M-salmon-02'].triggers[0].handCost,{destination:'bottom',type:'world',reveal:true});
});

test('numeric time costs are paid for the full canonical dragon triggers',()=>{
 assert.equal(CATALOG['M-dragon-02'].text,'1ターンに1回。自分のターン終了時、時2を払って発動できる。次の自分のターン開始時に1枚引く。');
 const e=MAIN_RULES['M-dragon-02'].triggers[0];assert.equal(e.cost,2);assert.equal(e.steps[0].timing,'start');
 assert.equal(CATALOG['M-dragon-03'].text,'1ターンに1回。このメインが自分からちょうせんする時、手札が4枚以上ある場合、時1を払って発動できる。このちょうせんの間、このメインの使用する能力値+1。');
 const c=MAIN_RULES['M-dragon-03'].triggers[0];assert.equal(c.cost,1);assert.deepEqual(c.condition,{all:['ownChallenge',{value:'hand',op:'gte',n:4}]});
});

test('main observers watch any own companion placement with exact costs and targets',()=>{
 assert.equal(CATALOG['M-sakura-03'].text,'1ターンに1回。自分のなかまが自分の盤面に置かれた時、時1を払い、自分の捨て札の「みにつける」の使用方法を持つカード1枚を対象として発動できる。そのカードを山札の一番上に置く。');
 const s=MAIN_RULES['M-sakura-03'].triggers[0];assert.equal(s.when,'place');assert.equal(s.anySource,true);assert.equal(s.condition,'eventCompanion');assert.equal(s.target,'ownDiscardEquipment');assert.equal(s.cost,1);
 assert.equal(CATALOG['M-dandelion-03'].text,'1ターンに1回。自分のなかまが出た時、自分にセカイがある場合、手札1枚を捨て札に置いて発動できる。1枚引く。');
 const d=MAIN_RULES['M-dandelion-03'].triggers[0];assert.equal(d.anySource,true);assert.equal(d.condition.all[0],'eventCompanion');assert.deepEqual(d.handCost,{destination:'discard'});
});


test('multi-card main costs preserve exact counts, destination and distinctness',()=>{
 assert.equal(CATALOG['M-phoenix-03'].text,'1ターンに1回。自分のターンに、時2を払い、手札2枚を好きな順で山札の一番下に置いて発動できる。3枚引く。');
 const p=MAIN_RULES['M-phoenix-03'].active;assert.equal(p.cost,2);assert.equal(p.select[0].count,2);assert.equal(p.select[0].zone,'ownHand');assert.equal(p.select[0].cost,'bottom');assert.equal(p.steps[0].n,3);
 assert.match(CATALOG['M-star-02'].text,/段階が異なる①〜③のメイン2枚/);
 const st=MAIN_RULES['M-star-02'].active.select[0];assert.equal(st.distinct,'stage');assert.deepEqual(st.filter,{type:'main',minStage:1,maxStage:3});
 assert.match(CATALOG['M-woman-07'].text,/カード種類が異なるメイン以外のカード2枚/);
 assert.equal(MAIN_RULES['M-woman-07'].active.select[0].distinct,'type');
 assert.equal(MAIN_RULES['M-woman-07'].active.condition,undefined);
});

test('prepared-card costs apply before targeted recovery or removal',()=>{
 assert.match(CATALOG['M-phoenix-07'].text,/時1を払い、自分の準備枠のカード1枚を捨て札/);
 const p=MAIN_RULES['M-phoenix-07'].active;assert.equal(p.cost,1);assert.equal(p.target,'ownDiscardMain');assert.equal(p.select[0].cost,'discard');
 assert.match(CATALOG['M-hermit_crab-03'].text,/このメインにみにつけられているカード1枚/);
 assert.deepEqual(MAIN_RULES['M-hermit_crab-03'].active.select[0].filter,{attachedTo:'main'});
 assert.match(CATALOG['M-dragon-06'].text,/時3を払い、手札1枚と自分の準備枠のカード1枚を捨て札/);
 const d=MAIN_RULES['M-dragon-06'].active;assert.equal(d.cost,3);assert.equal(d.handCost.destination,'discard');assert.equal(d.select[0].cost,'discard');
});

test('god arrival returns two distinct non-main targets and retains its full activation costs',()=>{
 assert.equal(CATALOG['M-god-06'].text,'この名前の能力は1ターンに1回。このメインがこの段階になった時、自分のそだちが相手より10以上低い場合、時2を払い、手札1枚を山札の一番下に置き、自分の捨て札のカード種類が異なるメイン以外のカード2枚を対象として発動できる。その対象を手札に戻す。');
 const t=MAIN_RULES['M-god-06'].triggers[0];assert.equal(t.onceName,true);assert.equal(t.cost,2);assert.deepEqual(t.handCost,{destination:'bottom'});assert.equal(t.select[0].distinct,'type');assert.equal(t.select[0].count,2);assert.equal(t.select[0].cost,undefined);assert.deepEqual(t.steps,[{op:'selectedMove',key:'recovery',destination:'hand'}]);
});


test('main result triggers preserve participant and result-specific canonical requirements',()=>{
 assert.equal(CATALOG['M-butterfly-03'].text,'1ターンに1回。このメインが自分から行ったちょうせんに勝った時、このメインがこのターン開始時からメイン枠にあり、自分の準備枠にカードがある場合、発動できる。1枚引く。');
 const b=MAIN_RULES['M-butterfly-03'].triggers[0];assert.equal(b.when,'challengeResult');assert.deepEqual(b.condition.all.slice(0,3),['won','eventOwnChallenge','sameMainSinceStart']);
 assert.match(CATALOG['M-cicada-07'].text,/このターンにメイン枠に置かれており.*まだあそびカードを表向きでプレイしていない/);
 const c=MAIN_RULES['M-cicada-07'].triggers[0];assert.deepEqual(c.condition.all.slice(2),[{value:'enteredThisTurn',op:'eq',n:1},{value:'plays',op:'eq',n:0}]);
 assert.equal(MAIN_RULES['M-coral-08'].triggers[0].condition.all[0],'won');
 assert.equal(MAIN_RULES['M-frog-05'].triggers[0].condition.all[2],'changedDifferentWorld');
});

test('plush losing challenge compares its actual result value and draws only after moving hand',()=>{
 assert.equal(CATALOG['M-plush-05'].text,'1ターンに1回。このメインがちょうせんに負けた時、その比較でこのメインが使用した能力値が3以下だった場合、発動できる。手札1枚を山札の一番下に置く。そうしたなら、2枚引く。');
 const p=MAIN_RULES['M-plush-05'].triggers[0];assert.deepEqual(p.condition,{all:['lost',{value:'eventOwnValue',op:'lt',n:4}]});assert.equal(p.handCost,undefined);assert.equal(p.steps[0].op,'handBottom');assert.equal(p.steps[1].condition,'handMoved');assert.equal(p.steps[1].steps[0].n,2);
});

test('received challenge bonuses retain round limits and both-direction bonus shares one trigger',()=>{
 assert.match(CATALOG['M-turtle-02'].text,/1ラウンドに1回.*相手からちょうせんされた/);
 for(const id of ['M-turtle-02','M-penguin-01']){const t=MAIN_RULES[id].triggers[0];assert.equal(t.opponent,true);assert.equal(t.limit,'round');}
 assert.equal(CATALOG['M-starfish-06'].text,'1ターンに1回。このメインが自分からちょうせんする時、または相手からちょうせんを受ける時、自分の捨て札にカード種類が異なるメイン以外のカードが3種類以上ある場合、発動できる。このちょうせんの間、このメインの使用する能力値+1。');
 const f=MAIN_RULES['M-starfish-06'];assert.equal(f.triggers.length,1);assert.equal(f.triggers[0].anyActor,true);assert.equal(f.triggers[0].once,true);
});

test('phoenix challenge pays time for a computed-value deficit and printed-stat star target stays distinct',()=>{
 assert.equal(CATALOG['M-phoenix-02'].text,'1ターンに1回。このメインが自分からちょうせんする時、このメインの使用する能力値が相手より低い場合、時1を払って発動できる。このちょうせんの間、このメインの使用する能力値+2。');
 const p=MAIN_RULES['M-phoenix-02'].triggers[0];assert.equal(p.cost,1);assert.deepEqual(p.condition.all[1],{value:'battleValue',op:'lt',n:{value:'opponentBattleValue'}});
 assert.match(CATALOG['M-star-05'].text,/印刷されたちえがちからより高いメイン/);
 const st=MAIN_RULES['M-star-05'].triggers[0];assert.equal(st.target,'ownDiscardWisdomHigherMain');assert.deepEqual(st.condition,{all:['won','eventPower']});
});
