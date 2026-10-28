// PR #460 の Tier 1（6枚）と、本文を明確化した2枚（ルナランダー・サブマリン3D）の直接テスト。
// 固定局面で誘発・連鎖・対象・コスト・裏向き情報・期限を確認し、実際の操作列の保存→途中復帰を小規模（2試合）で確認する。
import test from 'node:test';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
import * as e from '../engine.mjs';
import {CATALOG} from '../full-catalog.mjs';
import {observeCpu} from '../cpu-observation.mjs';import {chooseCpuAction} from '../cpu-policy.mjs';

function fixture(){const s=e.createGame(71);s.choice=null;s.pending=[];s.phase='normal';s.window='normal';s.players.A.time=10;s.players.B.time=10;return s;}
function take(s,a,c){const x=s.players[a].deck.shift();s.cards[x].cardId=c;return x;}
function field(s,a,c,slot='main'){const id=take(s,a,c);s.cards[id].generation++;if(slot==='companions')s.players[a].board.companions.push(id);else s.players[a].board[slot]=id;return id;}
function hand(s,a,c){const id=take(s,a,c);s.players[a].hand.push(id);return id;}
function discard(s,a,c){const id=take(s,a,c);s.players[a].discard.push(id);return id;}
function trap(s,a,c){const id=take(s,a,c);s.players[a].board.prepared.push({id,faceDown:true,setSerial:0});return id;}
function top(s,a,c){const id=take(s,a,c);s.players[a].deck.unshift(id);return id;}
const cid=(s,id)=>s.cards[id]?.cardId;
function find(s,pred){return e.legalActions(s).find(pred);}
function doAction(s,a){assert.ok(a,'action not legal');return e.act(s,e.actor(s),s.revision,a.id);}
// 通常の局面まで進める。pick が返した行動を優先し、それ以外は見送り・パス。
function settle(s,pick=()=>null){let guard=0;while(s.phase!=='normal'||s.choice){assert.ok(guard++<80,'settle loop');if(s.phase==='finished')return s;const acts=e.legalActions(s);
 const a=pick(s,acts)??acts.find(x=>x.kind==='skip')??acts.find(x=>x.kind==='pass')??acts.find(x=>x.kind==='choose'&&x.value!=='cancel')??acts[0];s=e.act(s,e.actor(s),s.revision,a.id);}return s;}
const activate=(...ids)=>(s,acts)=>acts.find(a=>a.kind==='trigger'&&ids.includes(cid(s,a.source)));
// 自分のターンを終えて、次に who の通常局面（ターン開始の誘発は見送り）まで進める。
function passTo(s,who){let guard=0;do{assert.ok(guard++<20,'passTo loop');s=settle(doAction(s,find(s,a=>a.kind==='pass')));}while(s.turn!==who);return s;}
const reservations=(s,c,a='A')=>s.effects.filter(r=>r.kind==='reservation'&&r.actor===a&&cid(s,r.link?.source)===c);
const lastComparison=s=>s.history.filter(h=>h.kind==='comparison').at(-1);

// --- 本文を明確化した2枚 ---
const LUNAR='G-lunar-lander',SUB='G-submarine-3d';
test('ルナランダー：新本文で、時1・すぐつかう・ドロー1・+5は不変',()=>{
 const c=CATALOG[LUNAR];assert.equal(c.text,'解決時に自分の残り時がちょうど2なら、1枚引き、自分のそだち+5。');
 assert.deepEqual([c.cost,c.type,c.method,c.rare],[1,'play','すぐつかう',false]);
});
test('ルナランダー：残り時は支払い後の解決時に見る（3→2で得る、2→1で得ない。不一致でも使える）',()=>{
 for(const [time,hit] of [[3,true],[2,false],[4,false]]){let s=fixture();field(s,'A','M-dog-01');field(s,'B','M-dog-01');s.players.A.time=time;const l=hand(s,'A',LUNAR);
  const h0=s.players.A.hand.length,g0=s.players.A.growth;s=settle(doAction(s,find(s,a=>a.source===l)));
  assert.equal(s.players.A.time,time-1);assert.equal(s.players.A.growth,g0+(hit?5:0),'time '+time);assert.equal(s.players.A.hand.length,h0-1+(hit?1:0),'time '+time);}
});
test('ルナランダー：使った後、解決前の応答で残り時が変わったら、解決時の値で判定する',()=>{
 // 自分の応答でラッキーコイン（時1）を重ねる。コインが先に解決（山札上はメイン以外→1枚引く）し、その後ルナランダーが解決する。
 for(const [time,hit] of [[4,true],[3,false]]){let s=fixture();field(s,'A','M-dog-01');field(s,'B','M-dog-01');s.players.A.time=time;const l=hand(s,'A',LUNAR),coin=hand(s,'A','I-c_coin2');top(s,'A','C-panda');
  const h0=s.players.A.hand.length,g0=s.players.A.growth;s=doAction(s,find(s,a=>a.source===l));assert.equal(s.players.A.time,time-1,'使用時の残り時');
  s=doAction(s,find(s,a=>a.source===coin));s=settle(s);
  assert.equal(s.players.A.time,time-2);assert.equal(s.players.A.growth,g0+(hit?5:0),'time '+time);assert.equal(s.players.A.hand.length,h0-2+1+(hit?1:0),'time '+time);}
});
test('サブマリン3D：新本文で、時2・すぐつかうは不変',()=>{
 const c=CATALOG[SUB];assert.equal(c.text,'発動時に0・1・2から数を1つ選び、時コストをその数だけ増やす。山札の上から、選んだ数が0なら3枚、1なら5枚、2なら7枚を見る。その中から1枚までを手札に加え、残りを好きな順で山札の一番下に置く。');
 assert.deepEqual([c.cost,c.type,c.method,c.rare],[2,'play','すぐつかう',false]);
});
test('サブマリン3D：選んだ数0/1/2は時2/3/4を払い、山札上3/5/7枚を見る（1枚まで加える）',()=>{
 let s0=fixture();const sub0=hand(s0,'A',SUB);assert.deepEqual(e.legalActions(s0).filter(a=>a.source===sub0).map(a=>[a.variant,a.cost]),[[0,2],[1,3],[2,4]],'選べるのは0・1・2だけ');
 for(const [variant,cost,n] of [[0,2,3],[1,3,5],[2,4,7]]){let s=fixture();field(s,'A','M-dog-01');field(s,'B','M-dog-01');const sub=hand(s,'A',SUB);const looked=s.players.A.deck.slice(0,n);
  s=doAction(s,find(s,a=>a.source===sub&&a.variant===variant));assert.equal(s.players.A.time,10-cost);
  let guard=0;while(!s.choice){assert.ok(guard++<10);s=doAction(s,find(s,a=>a.kind==='pass'));}assert.equal(s.choice.kind,'search_take');
  assert.deepEqual(s.choice.options.map(o=>o.id).filter(id=>id!=='done'),looked,'見る枚数 '+n);assert.ok(e.legalActions(s).some(a=>a.value==='done'),'0枚（加えない）も選べる');}
});

test('カタログ：変わったのは2枚の本文と、設計正本83・85の出典hashだけ（main eb97817d と同じ）',()=>{
 const before={[LUNAR]:'自分の残り時がちょうど2なら、1枚引き、自分のそだち+5。',[SUB]:'発動時に0・1・2から数を1つ選び、時コストをその数だけ増やす。山札の上から、3に選んだ数の2倍を足した枚数を見る。その中から1枚までを手札に加え、残りを好きな順で山札の一番下に置く。'};
 const norm=c=>{const x={...c};delete x.source_sha256;if(before[x.id])x.text=before[x.id];return x;};
 assert.equal(Object.keys(CATALOG).length,452);
 assert.equal(createHash('sha256').update(JSON.stringify(Object.keys(CATALOG).sort().map(k=>norm(CATALOG[k])))).digest('hex'),'c866d45849130a035f298c3caa1ec16d360dfa9f131876be5947cc1bf26322bd');
});

// --- M-mushroom-08 キノコ⑧ ---
const M8='M-mushroom-08';
function mushroomSetup(){const s=fixture();field(s,'A',M8);field(s,'B','M-dog-01');const to=hand(s,'A','M-dog-02');return {s,to};}
const transformAway=(s,to)=>settle(doAction(s,find(s,a=>a.source===to&&a.variant==='transform')),activate(M8));
test('キノコ⑧：へんしんで捨て札に置かれた時に誘発し、次の自分のターン終了までの予約を作る',()=>{
 let {s,to}=mushroomSetup();s=doAction(s,find(s,a=>a.source===to&&a.variant==='transform'));
 assert.equal(s.phase,'trigger');assert.ok(e.legalActions(s).some(a=>a.kind==='trigger'&&cid(s,a.source)===M8));s=settle(s,activate(M8));
 const r=reservations(s,M8);assert.equal(r.length,1);assert.equal(r[0].duration,'nextEnd');assert.ok(s.players.A.discard.some(id=>cid(s,id)===M8));
});
test('キノコ⑧：へんしん以外で捨て札に置かれた時（相手の除去）は誘発しない',()=>{
 let s=fixture();field(s,'B',M8);const dragon=field(s,'A','M-dragon-06');trap(s,'A','G-real-fishing');hand(s,'A','C-panda');const m8=s.players.B.board.main;
 s=doAction(s,find(s,a=>a.source===dragon&&a.target===m8));let offered=false;
 s=settle(s,(s,acts)=>{if(acts.some(a=>a.kind==='trigger'&&cid(s,a.source)===M8))offered=true;return activate(M8)(s,acts)??(s.choice?.kind==='activation_selection'?acts.find(a=>a.value!=='cancel'):null);});assert.equal(offered,false,'誘発しない');
 assert.ok(s.players.B.discard.includes(m8),'除去された');assert.equal(reservations(s,M8,'B').length,0);
});
test('キノコ⑧：裏向きでしかけても引かず、表向きのメイン以外＋捨て札に同名で1回だけ1枚引く',()=>{
 let {s,to}=mushroomSetup();const t=hand(s,'A','G-real-fishing');discard(s,'A','G-real-fishing');const p1=hand(s,'A','C-panda'),w=hand(s,'A','W-snow');discard(s,'A','C-panda');discard(s,'A','W-snow');s=transformAway(s,to);
 let h=s.players.A.hand.length;s=settle(doAction(s,find(s,a=>a.source===t&&a.slot==='prepared')));assert.equal(s.players.A.hand.length,h-1,'裏向きは対象外');assert.equal(reservations(s,M8).length,1);
 h=s.players.A.hand.length;s=settle(doAction(s,find(s,a=>a.source===p1)));assert.equal(s.players.A.hand.length,h-1+1,'1枚引く');assert.equal(reservations(s,M8).length,0,'1回で消える');
 h=s.players.A.hand.length;s=settle(doAction(s,find(s,a=>a.source===w)));assert.equal(s.players.A.board.world,w);assert.equal(s.players.A.hand.length,h-1,'2回目（セカイ＋捨て札に同名）は引かない');
});
test('キノコ⑧：捨て札に同名がなければ引かず予約は残り、次の自分のターン終了で失効する',()=>{
 let {s,to}=mushroomSetup();const p=hand(s,'A','C-panda');s=transformAway(s,to);const h=s.players.A.hand.length;
 s=settle(doAction(s,find(s,a=>a.source===p)));assert.equal(s.players.A.hand.length,h-1);assert.equal(reservations(s,M8).length,1);
 s=passTo(s,'B');assert.equal(reservations(s,M8).length,1,'相手ターン中も残る');s=passTo(s,'A');assert.equal(reservations(s,M8).length,1,'次の自分のターン中も残る');
 s=passTo(s,'B');assert.equal(reservations(s,M8).length,0,'次の自分のターン終了で失効');
});

// --- M-sakura-06 サクラ⑥ ---
const S6='M-sakura-06';
function sakuraSetup(){const s=fixture();field(s,'A','M-sakura-05');field(s,'B','M-dog-01');const six=hand(s,'A',S6);const domino=trap(s,'A','G-domino-run'),fishing=trap(s,'A','G-real-fishing');const bow=hand(s,'A','I-bowtie');return {s,six,domino,fishing,bow};}
const arrive=(s,six,chosen)=>settle(doAction(s,find(s,a=>a.source===six&&a.variant==='time_skip')),(s,acts)=>activate(S6)(s,acts)??(s.choice?.kind==='resolve_selection'?acts.find(a=>a.value===chosen):null));
test('サクラ⑥：選べるのは自分の準備枠のカードだけで、伏せたカードの名前は相手に見えない',()=>{
 // 選択の直前で止める（相手の準備枠にも伏せ札を置く）
 const t=sakuraSetup();let s=doAction(t.s,find(t.s,a=>a.source===t.six&&a.variant==='time_skip'));trap(s,'B','G-real-fishing');let guard=0;
 while(s.choice?.kind!=='resolve_selection'){assert.ok(guard++<20);const acts=e.legalActions(s);s=e.act(s,e.actor(s),s.revision,(activate(S6)(s,acts)??acts.find(a=>a.kind==='pass')).id);}
 assert.equal(e.actor(s),'A');assert.deepEqual(e.legalActions(s).map(a=>a.value).sort(),[t.domino,t.fishing].sort(),'自分の準備枠だけ');
 s=settle(s,(s,acts)=>acts.find(a=>a.value===t.domino));const bLog=e.view(s,'B').log.join('\n');assert.ok(!bLog.includes('ドミノたおし'),'相手のログに伏せ札の名前が出ない');
 assert.equal(reservations(s,S6).length,1);
});
test('サクラ⑥：選んだ伏せ札が準備枠→発動領域へ移って発動し、効果が適用されたら+5を1回だけ',()=>{
 let {s,six,domino,bow}=sakuraSetup();s=arrive(s,six,domino);assert.equal(reservations(s,S6).length,1);const g0=s.players.A.growth;
 s=settle(doAction(s,find(s,a=>a.source===bow)),activate('G-domino-run'));
 assert.ok(!s.players.A.board.prepared.some(x=>x.id===domino),'準備枠から離れた');assert.equal(s.players.A.growth,g0+5);assert.equal(reservations(s,S6).length,0,'予約は1回で消える');
});
test('サクラ⑥：選ばなかった伏せ札の発動では+5にならず、予約はこのターン終了で失効する',()=>{
 let {s,six,fishing,bow}=sakuraSetup();s=arrive(s,six,fishing);const g0=s.players.A.growth;
 s=settle(doAction(s,find(s,a=>a.source===bow)),activate('G-domino-run'));assert.equal(s.players.A.growth,g0);assert.equal(reservations(s,S6).length,1);
 s=passTo(s,'B');assert.equal(reservations(s,S6).length,0);
});

// --- P-oasis_cactus オアシスのサボテンさん ---
const CACTUS='P-oasis_cactus';
function cactusSetup(){const s=fixture();field(s,'A','M-dog-01');field(s,'B','M-dog-01');const cactus=field(s,'B',CACTUS,'partner');const m1=hand(s,'A','E-misunderstanding'),m2=hand(s,'A','E-misunderstanding');return {s,cactus,m1,m2};}
function bounce(s,ev,decision){s=doAction(s,find(s,a=>a.source===ev));let offered=null;s=settle(s,(s,acts)=>{if(s.choice?.kind!=='replacement')return null;offered=acts.map(a=>a.label);return acts.find(a=>decision==='use'?a.value!=='decline':a.value==='decline');});return {s,offered};}
test('サボテンさん：相手の効果で手札に戻るのを、防ぐか選べる（使わなければ戻る）',()=>{
 let {s,cactus,m1}=cactusSetup();let r=bounce(s,m1,'decline');assert.ok(r.offered?.some(l=>l.includes('オアシスのサボテンさん')),'任意の選択');assert.ok(r.s.players.B.hand.includes(cactus));
 ({s,cactus,m1}=cactusSetup());r=bounce(s,m1,'use');assert.equal(r.s.players.B.board.partner,cactus);
});
test('サボテンさん：1ラウンドに1回。同じターンの2回目は防げず、次のラウンドでは再び防げる',()=>{
 let {s,cactus,m1,m2}=cactusSetup();let r=bounce(s,m1,'use');s=r.s;assert.equal(s.players.B.board.partner,cactus);
 r=bounce(s,m2,'use');assert.equal(r.offered,null,'選択が出ない');assert.ok(r.s.players.B.hand.includes(cactus));
 ({s,cactus,m1}=cactusSetup());const later=hand(s,'A','E-misunderstanding');s=bounce(s,m1,'use').s;s=passTo(s,'B');s=passTo(s,'A');assert.equal(s.round,2);
 r=bounce(s,later,'use');assert.ok(r.offered,'次のラウンドは選べる');assert.equal(r.s.players.B.board.partner,cactus);
});
test('サボテンさん：同じラウンドの相手ターン（応答で戻された時）も、使用済みなら防げない',()=>{
 let {s,cactus,m1,m2}=cactusSetup();const coin=hand(s,'B','I-c_coin2');s=bounce(s,m1,'use').s;s=passTo(s,'B');assert.equal(s.round,1);
 s=doAction(s,find(s,a=>a.source===coin));s=doAction(s,find(s,a=>a.kind==='pass'));assert.equal(e.actor(s),'A');
 const r=bounce(s,m2,'use');assert.equal(r.offered,null,'ターンが変わっても同じラウンドでは選択が出ない');assert.ok(r.s.players.B.hand.includes(cactus));
});
test('サボテンさん：みにつけられている間は防げない（ほかの置換だけが残る）',()=>{
 let {s,cactus,m1}=cactusSetup();const charm=take(s,'B','I-partner1');s.players.B.board.prepared.push({id:charm,target:cactus,targetGeneration:s.cards[cactus].generation});
 const r=bounce(s,m1,'decline');assert.ok(r.offered,'こいびとのおまもりの置換は出る');assert.ok(!r.offered.some(l=>l.includes('オアシスのサボテンさん')),'サボテンさんの置換は出ない');assert.ok(r.s.players.B.hand.includes(cactus));
});

// --- M-coral-07 サンゴ⑦ ---
const C7='M-coral-07';
function coralSetup({world=true}={}){const s=fixture();field(s,'B',C7);const comp=field(s,'B','C-panda','companions');field(s,'B','P-field_cow','partner');if(world)field(s,'B','W-snow','world');
 const dragon=field(s,'A','M-dragon-06');for(let i=0;i<2;i++)trap(s,'A','G-real-fishing');for(let i=0;i<2;i++)hand(s,'A','C-shiba');return {s,comp,dragon};}
const removal=(s,dragon,target)=>settle(doAction(s,find(s,a=>a.source===dragon&&a.target===target)),(s,acts)=>s.choice?.kind==='activation_selection'?acts.find(a=>a.value!=='cancel'):null);
test('サンゴ⑦：なかま・こいびと・セカイがそろう時、相手の効果で捨て札になるメイン以外を置換する',()=>{
 let {s,comp,dragon}=coralSetup();s=removal(s,dragon,comp);assert.ok(s.players.B.board.companions.includes(comp));assert.ok(s.log.some(l=>l.includes('サンゴ⑦の置換')));
});
test('サンゴ⑦：3種類のどれかが欠ければ置換しない／メイン自身は守らない',()=>{
 let {s,comp,dragon}=coralSetup({world:false});s=removal(s,dragon,comp);assert.ok(s.players.B.discard.includes(comp),'セカイなし');
 ({s,dragon}=coralSetup());const main=s.players.B.board.main;s=removal(s,dragon,main);assert.ok(s.players.B.discard.includes(main),'メインは対象外');
});
test('サンゴ⑦：1ラウンドに1回（同じラウンドの次の除去は置換しない）',()=>{
 let {s,comp,dragon}=coralSetup();const kept=[0,1,2].map(()=>trap(s,'B','G-real-fishing'));const castle=hand(s,'A','G-catapult-castle');
 s=removal(s,dragon,comp);assert.ok(s.players.B.board.companions.includes(comp));
 s=settle(doAction(s,find(s,a=>a.source===castle&&a.target===kept[0])),(s,acts)=>s.choice?acts.find(a=>a.value===kept[0])??null:null);
 assert.ok(s.players.B.discard.includes(kept[0]),'2回目は捨て札へ');assert.ok(!s.players.B.board.prepared.some(x=>x.id===kept[0]));
});

// --- M-ghost-05 おばけ⑤ ---
const G5='M-ghost-05';
function ghost5Setup(){const s=fixture();const g=field(s,'A',G5);field(s,'B','M-dog-08');const paid=trap(s,'A','G-real-fishing');return {s,g,paid};}
const activateGhost=(s,g)=>{s=doAction(s,find(s,a=>a.source===g));return doAction(s,find(s,a=>a.kind==='choose'&&a.value!=='cancel'));};
test('おばけ⑤：支払い（準備枠1枚を山札の一番下）は発動時に行い、伏せ札の名前は相手に見えない',()=>{
 let {s,g,paid}=ghost5Setup();s=activateGhost(s,g);assert.equal(s.players.A.deck.at(-1),paid,'解決前に山札の一番下');assert.equal(s.players.A.board.prepared.length,0);
 assert.ok(!e.view(s,'B').log.join('\n').includes('ほんかくさかなつり'));s=settle(s);assert.equal(reservations(s,G5).length,1);
 let t=fixture();const g2=field(t,'A',G5);assert.equal(find(t,a=>a.source===g2),undefined,'準備枠が空なら発動できない');
});
test('おばけ⑤：次に相手からちょうせんされた時、そのちょうせんだけ相手の能力値-2（1回で消える）',()=>{
 let {s,g}=ghost5Setup();s=settle(activateGhost(s,g));s=passTo(s,'B');assert.equal(reservations(s,G5).length,1);
 s=settle(doAction(s,find(s,a=>a.kind==='challenge'&&a.parameter==='power')));const c=lastComparison(s);
 assert.deepEqual(c.values,{A:CATALOG[G5].power,B:CATALOG['M-dog-08'].power-2});assert.equal(reservations(s,G5).length,0);
});
test('おばけ⑤：自分からのちょうせんでは使わず、相手がちょうせんしなければ次の自分のターン開始で失効',()=>{
 let {s,g}=ghost5Setup();s=settle(activateGhost(s,g));s=settle(doAction(s,find(s,a=>a.kind==='challenge'&&a.parameter==='power')));
 assert.deepEqual(lastComparison(s).values,{A:CATALOG[G5].power,B:CATALOG['M-dog-08'].power});assert.equal(reservations(s,G5).length,1,'自分からのちょうせんでは消費しない');
 s=passTo(s,'B');assert.equal(reservations(s,G5).length,1);s=passTo(s,'A');assert.equal(reservations(s,G5).length,0,'次の自分のターン開始で失効');
});

// --- M-ghost-07 おばけ⑦ ---
const G7='M-ghost-07';
function ghost7Setup(){const s=fixture();const g=field(s,'A',G7);field(s,'B','M-dog-01');const dm=discard(s,'A','M-dog-03');discard(s,'A','C-panda');discard(s,'A','G-real-fishing');const person=hand(s,'A','C-shiba');return {s,g,dm,person};}
test('おばけ⑦：支払いに選べるのは捨て札のメインだけ（なければ発動できない）、支払いは山札の一番下',()=>{
 let {s,g,dm}=ghost7Setup();s=doAction(s,find(s,a=>a.source===g));assert.deepEqual(e.legalActions(s).filter(a=>a.value!=='cancel').map(a=>a.value),[dm]);
 s=doAction(s,find(s,a=>a.value===dm));assert.equal(s.players.A.deck.at(-1),dm);s=settle(s);assert.equal(reservations(s,G7).length,1);
 let t=fixture();const g2=field(t,'A',G7);discard(t,'A','C-panda');assert.equal(find(t,a=>a.source===g2),undefined);
});
test('おばけ⑦：次になかまを出した時に山札上2枚から1枚を手札へ（1回だけ）、相手が人物を出しても消費しない',()=>{
 let {s,g,dm,person}=ghost7Setup();s=settle(doAction(s,find(s,a=>a.source===g)),(s,acts)=>acts.find(a=>a.value===dm));hand(s,'B','C-cat_friend');s=passTo(s,'B');
 const bp=find(s,a=>a.kind==='place'&&e.CARDS[cid(s,a.source)].type==='companion');assert.ok(bp,'相手がなかまを出せる');s=settle(doAction(s,bp));assert.equal(s.players.B.board.companions.length,1);assert.equal(reservations(s,G7).length,1,'相手の人物では消費しない');
 s=passTo(s,'A');const two=s.players.A.deck.slice(0,2);let seen=null;
 s=settle(doAction(s,find(s,a=>a.source===person)),(s,acts)=>{if(s.choice?.kind==='search_take'){seen=s.choice.options.map(o=>o.id);return acts.find(a=>a.value===two[1]);}return null;});
 assert.deepEqual(seen,two,'山札上2枚');assert.ok(s.players.A.hand.includes(two[1]));assert.equal(s.players.A.deck.at(-1),two[0],'残りは山札の一番下');assert.equal(reservations(s,G7).length,0);
});
test('おばけ⑦：人物を出さなければ次の自分のターン終了で失効する',()=>{
 let {s,g,dm}=ghost7Setup();s=settle(doAction(s,find(s,a=>a.source===g)),(s,acts)=>acts.find(a=>a.value===dm));
 s=passTo(s,'B');s=passTo(s,'A');assert.equal(reservations(s,G7).length,1);s=passTo(s,'B');assert.equal(reservations(s,G7).length,0);
});

// --- 実際の操作列の保存→途中復帰（2試合、固定シード） ---
const FILL=['C-panda','C-shiba','C-cat_friend','I-c_coin2','G-real-fishing','G-sugoroku-race','W-snow','E-mirror','M-dog-01','M-dog-02','M-dog-03','M-dog-04'];
const deckOf=spec=>{const d=Object.entries(spec).flatMap(([id,n])=>Array(e.CARDS[id].rare?1:Math.min(n,3)).fill(id));for(const f of FILL)while(d.filter(i=>i===f).length<3&&d.length<40)d.push(f);return d;};
const DECKS={ghost:deckOf({'M-ghost-01':1,'M-ghost-02':1,'M-ghost-03':1,'M-ghost-04':1,'M-ghost-05':1,'M-ghost-06':1,'M-ghost-07':1,'M-ghost-08':1,'P-oasis_cactus':1,'M-coral-07':3}),
 plant:deckOf({'M-mushroom-01':3,'M-mushroom-02':3,'M-mushroom-03':3,'M-mushroom-04':3,'M-mushroom-05':2,'M-mushroom-06':2,'M-mushroom-07':2,'M-mushroom-08':1,'M-sakura-05':2,'M-sakura-06':2})};
// CPU（中級）に、対象カードの能力を使える時は使わせる。対戦の操作列は通常の合法手だけ。
const prefer=(s,acts)=>acts.find(a=>a.kind==='programAbility'&&cid(s,a.source)===G5)??acts.find(a=>a.kind==='place'&&a.variant==='transform'&&cid(s,s.players[e.actor(s)].board.main)===M8)??acts.find(a=>a.kind==='trigger'&&[M8,S6].includes(cid(s,a.source)));
function play(seed,deck){let s=e.createGame(seed,{A:deck,B:deck});const live={};let guard=0;
 while(s.phase!=='finished'&&guard++<5000){const a=e.actor(s),p=prefer(s,e.legalActions(s));const id=p?p.id:chooseCpuAction(observeCpu(s,a),{difficulty:'intermediate',seed:seed+(a==='A'?1:2),step:s.revision}).id;s=e.act(s,a,s.revision,id);
  for(const r of s.effects)if(r.kind==='reservation'){const c=cid(s,r.link?.source);if([M8,S6,G5,G7].includes(c))live[c]??=s.revision;}}
 return {s,live};}
const digest=s=>createHash('sha256').update(JSON.stringify({players:s.players,result:s.result,log:s.log,effects:s.effects})).digest('hex');
test('保存→復帰：予約が残っている途中から復帰しても予約が残り、最後まで同じ結果（キノコ⑧・サクラ⑥・おばけ⑤・おばけ⑦）',()=>{
 const covered=new Set();
 for(const [name,seed] of [['plant',22],['ghost',3]]){const {s,live}=play(seed,DECKS[name]);assert.equal(s.phase,'finished');const saved=e.save(s);assert.equal(JSON.parse(saved).version,e.VERSION);
  assert.equal(digest(e.restore(saved)),digest(s));
  for(const [c,rev] of Object.entries(live)){covered.add(c);const pre=e.restore(JSON.stringify({...JSON.parse(saved),commands:s.commands.slice(0,rev)}));
   assert.ok(pre.effects.some(r=>r.kind==='reservation'&&cid(pre,r.link?.source)===c),c+'：復帰後も予約が残る');let r=pre;for(const id of s.commands.slice(rev))r=e.act(r,e.actor(r),r.revision,id);assert.equal(digest(r),digest(s),c);}}
 assert.deepEqual([...covered].sort(),[G5,G7,M8,S6].sort());
});
