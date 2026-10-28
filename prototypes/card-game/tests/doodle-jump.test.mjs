// ぴょんぴょんジャンプ 改善案B（PR #448・#451）：1段階だけのときおくりで+5、CPUの空振り防止、旧保存（hotseat-2）の再生互換。
import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import {createHash} from 'node:crypto';
import * as e from '../engine.mjs';
import {CATALOG} from '../full-catalog.mjs';
import {observeCpu} from '../cpu-observation.mjs';import {chooseCpuAction} from '../cpu-policy.mjs';
import {restoreMatch} from '../cpu-session.mjs';
const DJ='G-doodle-jump';
const NEW_TEXT='このターン、自分が次にときおくりを行った時、1枚引く。そのときおくりで段階が1つだけ上がった場合、さらに自分のそだち+5。';
function fixture(version){const s=version?e.createGame(71,undefined,version):e.createGame(71);s.choice=null;s.pending=[];s.phase='normal';s.window='normal';s.players.A.time=10;s.players.B.time=10;return s;}
function take(s,a,c){const x=s.players[a].deck.shift();s.cards[x].cardId=c;return x;}
function field(s,a,c,slot){const id=take(s,a,c);s.cards[id].generation++;if(slot==='companions')s.players[a].board.companions.push(id);else s.players[a].board[slot]=id;return id;}
function hand(s,a,c){const id=take(s,a,c);s.players[a].hand.push(id);return id;}
function find(s,pred){return e.legalActions(s).find(pred);}
function doAction(s,a){assert.ok(a,'action not legal');return e.act(s,e.actor(s),s.revision,a.id);}
function settle(s){let guard=0;while(s.phase!=='normal'&&s.phase!=='finished'){assert.ok(guard++<60,'settle loop');const acts=e.legalActions(s);const a=acts.find(x=>x.kind==='skip')??acts.find(x=>x.kind==='pass')??acts.find(x=>x.kind==='choose')??acts[0];s=e.act(s,e.actor(s),s.revision,a.id);}return s;}
const playDJ=s=>settle(doAction(s,find(s,a=>a.kind==='programPlay'&&s.cards[a.source]?.cardId===DJ)));
const skipTo=(s,id)=>settle(doAction(s,find(s,a=>a.kind==='place'&&a.variant==='time_skip'&&a.source===id)));
const djReservations=(s,a='A')=>s.effects.filter(r=>r.kind==='reservation'&&r.actor===a&&s.cards[r.link.source]?.cardId===DJ);
function setup(version,{main='M-dog-01',to=['M-dog-02']}={}){const s=fixture(version);field(s,'A',main,'main');hand(s,'A',DJ);const targets=to.map(c=>hand(s,'A',c));return {s,targets};}

test('正式本文は改善案B（時1・ドロー1・+5・このターンは維持）',()=>{
 const c=CATALOG[DJ];assert.equal(c.text,NEW_TEXT);assert.equal(c.cost,1);assert.equal(c.type,'play');assert.equal(c.method,'すぐつかう');assert.equal(c.rare,false);
});

test('1段階だけのときおくり：1枚引いてそだち+5、予約は1回で消える',()=>{
 let {s,targets:[two]}=setup();s=playDJ(s);assert.equal(djReservations(s).length,1);
 const handBefore=s.players.A.hand.length,growth=s.players.A.growth;s=skipTo(s,two);
 assert.equal(s.players.A.hand.length,handBefore-1+1,'ときおくりで1枚出して1枚引く');assert.equal(s.players.A.growth,growth+5);assert.equal(djReservations(s).length,0);
});

test('2段階以上のときおくり：ドローだけ（+5なし）',()=>{
 for(const to of ['M-dog-03','M-dog-04']){let {s,targets:[t]}=setup(undefined,{to:[to]});s=playDJ(s);
  const handBefore=s.players.A.hand.length,growth=s.players.A.growth;s=skipTo(s,t);
  assert.equal(s.players.A.hand.length,handBefore,to);assert.equal(s.players.A.growth,growth,to);assert.equal(djReservations(s).length,0,to);}
});

test('二重に発動しない：同じターンの2回目のときおくりでは何も起きない',()=>{
 let {s,targets:[two,three]}=setup(undefined,{to:['M-dog-02','M-dog-03']});s=playDJ(s);s=skipTo(s,two);
 const handBefore=s.players.A.hand.length,growth=s.players.A.growth;s=skipTo(s,three);
 assert.equal(s.players.A.hand.length,handBefore-1);assert.equal(s.players.A.growth,growth);
});

test('ときおくりしなければ発動せず、ターン終了で失効する',()=>{
 let {s}=setup();s=playDJ(s);const handBefore=s.players.A.hand.length,growth=s.players.A.growth;
 s=doAction(s,find(s,a=>a.kind==='pass'));s=settle(s);
 assert.notEqual(s.turn,'A');assert.equal(djReservations(s).length,0);assert.equal(s.players.A.growth,growth);assert.equal(s.players.A.hand.length,handBefore);
});

test('へんしん（別の種族へ）は「ときおくり」ではないので発動しない',()=>{
 let {s,targets:[other]}=setup(undefined,{to:['M-beetle-02']});s=playDJ(s);const handBefore=s.players.A.hand.length,growth=s.players.A.growth;
 s=settle(doAction(s,find(s,a=>a.kind==='place'&&a.variant==='transform'&&a.source===other)));
 assert.equal(s.players.A.hand.length,handBefore-1);assert.equal(s.players.A.growth,growth);assert.equal(djReservations(s).length,1,'予約は残る');
});

test('予約は他のカードのプレイ・応答・連鎖では消費されない',()=>{
 let {s,targets:[two]}=setup();hand(s,'A','I-c_coin2');s=playDJ(s);
 s=settle(doAction(s,find(s,a=>s.cards[a.source]?.cardId==='I-c_coin2')));assert.equal(djReservations(s).length,1);
 const growth=s.players.A.growth;s=skipTo(s,two);assert.ok(s.players.A.growth>=growth+5);assert.equal(djReservations(s).length,0);
});

test('他のときおくり関連カード（しばいぬ）は変わらない',()=>{
 let {s,targets:[two]}=setup();field(s,'A','C-shiba','companions');s=playDJ(s);s=doAction(s,find(s,a=>a.kind==='place'&&a.variant==='time_skip'&&a.source===two));
 assert.ok(s.phase==='trigger'&&s.pending.some(r=>s.cards[r.source].cardId==='C-shiba'),'しばいぬの誘発');
});

test('新規対戦は hotseat-4、旧版（hotseat-2・hotseat-3）を指定した対戦は旧効果のまま',()=>{
 assert.equal(e.VERSION,'hotseat-4');assert.deepEqual([...e.RULE_VERSIONS],['hotseat-2','hotseat-3','hotseat-4']);assert.ok(e.RULE_VERSIONS.includes(e.VERSION));
 assert.equal(e.createGame(1).version,e.VERSION);
 for(const version of ['hotseat-2','hotseat-3']){let {s,targets:[two,three]}=setup(version,{to:['M-dog-02','M-dog-03']});s=playDJ(s);
  const g0=s.players.A.growth,h0=s.players.A.hand.length;s=skipTo(s,two);
  assert.equal(s.players.A.growth,g0,version+' 旧効果：1回目は+5なし');assert.equal(s.players.A.hand.length,h0,version+' 旧効果：1回目は1枚引く');
  s=skipTo(s,three);assert.equal(s.players.A.growth,g0+5,version+' 旧効果：2回目に+5');}
});

const saves=JSON.parse(readFileSync(new URL('./doodle-jump-hotseat2-saves.json',import.meta.url)));
const digest=s=>createHash('sha256').update(JSON.stringify({players:s.players,result:s.result,log:s.log})).digest('hex');
test('旧保存（hotseat-2、修正前エンジンで作成）は旧効果のまま完全に再生される',()=>{
 assert.equal(saves.rows.length,3);
 for(const r of saves.rows){assert.equal(r.save.version,'hotseat-2');const s=e.restore(JSON.stringify(r.save));
  assert.equal(s.version,'hotseat-2',r.case);assert.equal(s.revision,r.finalRevision,r.case);assert.deepEqual(s.result,r.result,r.case);assert.equal(digest(s),r.stateSha256,r.case);
  assert.equal(e.save(s),JSON.stringify(r.save),r.case);}
});
test('旧保存を新しい版として読ませると結果が変わる（版を区別する必要の確認）',()=>{
 const changed=saves.rows.filter(r=>r.case!=='multi-step-draw').map(r=>{try{return digest(e.restore(JSON.stringify({...r.save,version:e.VERSION})))!==r.stateSha256;}catch{return true;}});
 assert.deepEqual(changed,[true,true]);
});
test('旧保存の途中から復帰して続けても、旧効果で同じ結果になる',()=>{
 for(const r of saves.rows){const cut=r.timeSkipRevision-3,prefix={...r.save,commands:r.save.commands.slice(0,cut)};let s=e.restore(JSON.stringify(prefix));
  for(const id of r.save.commands.slice(cut))s=e.act(s,e.actor(s),s.revision,id);assert.equal(digest(s),r.stateSha256,r.case);}
});
test('旧保存はCPU対戦・記録の読込経路（restoreMatch）でも同じ版で復帰する',()=>{
 for(const r of saves.rows){const m=restoreMatch(JSON.stringify(r.save));assert.equal(m.finished,true);assert.equal(m.save(),JSON.stringify(r.save));}
});

// --- CPU ---
const cpuPick=(s,difficulty='intermediate')=>{const o=observeCpu(s,e.actor(s)),d=chooseCpuAction(o,{difficulty});return o.actions.find(a=>a.id===d.id);};
const isDJ=a=>a&&['play','programPlay'].includes(a.kind)&&a.card?.cardId===DJ;
test('CPU：ときおくりできない時はぴょんぴょんジャンプを使わない（初級・中級）',()=>{
 for(const difficulty of ['beginner','intermediate']){const {s}=setup(undefined,{to:['M-beetle-01']});s.players.A.hand=s.players.A.hand.filter(id=>s.cards[id].cardId!=='M-beetle-01');
  s.players.A.deck.push(...Object.keys(s.cards).filter(id=>s.cards[id].cardId==='M-beetle-01'&&!s.players.A.hand.includes(id)&&!s.players.A.deck.includes(id)));
  assert.equal(isDJ(cpuPick(s,difficulty)),false,difficulty);}
});
test('CPU：ときおくりの分の時が残らない時は使わない',()=>{
 const {s}=setup(undefined,{to:['M-dog-02']});s.players.A.time=1;assert.equal(isDJ(cpuPick(s)),false);
});
test('CPU：使った後も1段階のときおくりができる時は、ときおくりより先に使う',()=>{
 const {s}=setup(undefined,{to:['M-dog-02']});s.players.A.time=2;s.players.A.personUsed=true;assert.equal(isDJ(cpuPick(s)),true);
});
test('CPU：ときおくりのコスト軽減（カブトムシ④）を考慮する',()=>{
 const {s}=setup(undefined,{main:'M-beetle-04',to:['M-beetle-05']});s.players.A.time=1;s.players.A.personUsed=true;assert.equal(isDJ(cpuPick(s)),true);
});
test('CPU：相手ターン・応答中は使わない',()=>{
 let {s}=setup(undefined,{to:['M-dog-02']});hand(s,'A','I-c_coin2');s=doAction(s,find(s,a=>s.cards[a.source]?.cardId==='I-c_coin2'));
 while(s.phase==='response'&&e.actor(s)==='A'){const a=cpuPick(s);assert.equal(isDJ(a),false);s=e.act(s,'A',s.revision,a.id);}
});
test('CPU：予約中は1段階だけのときおくりに+5の価値を見込む',()=>{
 let {s}=setup(undefined,{to:['M-dog-02','M-dog-03']});s=playDJ(s);const o=observeCpu(s,'A');
 const one=o.actions.find(a=>a.kind==='place'&&a.variant==='time_skip'&&a.card.cardId==='M-dog-02'),two=o.actions.find(a=>a.kind==='place'&&a.variant==='time_skip'&&a.card.cardId==='M-dog-03');
 assert.equal(one.timeSkipBonus,5);assert.equal(two.timeSkipBonus,0);
});

// --- 正式カタログの保護 ---
test('カタログ：変わったのはぴょんぴょんジャンプの本文と、同じ設計正本（85）の出典hashだけ',()=>{
 // 478（ルナランダー・サブマリン3Dの書き方だけの明確化）より前の固定値なので、その2枚は改訂前の本文に戻して照合する。
 const before478={'G-lunar-lander':'自分の残り時がちょうど2なら、1枚引き、自分のそだち+5。','G-submarine-3d':'発動時に0・1・2から数を1つ選び、時コストをその数だけ増やす。山札の上から、3に選んだ数の2倍を足した枚数を見る。その中から1枚までを手札に加え、残りを好きな順で山札の一番下に置く。'};
 const norm=c=>{const x={...c};delete x.source_sha256;if(x.id==='G-doodle-jump')delete x.text;if(before478[x.id])x.text=before478[x.id];return x;};
 const dig=createHash('sha256').update(JSON.stringify(Object.keys(CATALOG).sort().map(k=>norm(CATALOG[k])))).digest('hex');
 assert.equal(Object.keys(CATALOG).length,452);
 assert.equal(dig,'8b5081a639cb6ac36308cb1251a585fb8a95c34b9abaeb65790568415c4ceec2','main 518037d6（PR #449 統合後）と同じ（本文1件と出典hashを除く）');
});

// --- 新しい版の保存・途中復帰（実際の対戦の操作列） ---
function cpuGame(seed,version,{deck,difficulty='intermediate',stopAt=Infinity}={}){
 let s=e.createGame(seed,{A:deck,B:deck},version);let guard=0;const wasted={A:0,B:0},played={A:0,B:0};
 while(s.phase!=='finished'&&s.revision<stopAt&&guard++<5000){const a=e.actor(s),o=observeCpu(s,a),d=chooseCpuAction(o,{difficulty,seed:seed+(a==='A'?1:2),step:s.revision}),x=o.actions.find(q=>q.id===d.id);
  if(isDJ(x)){played[a]++;if(!x.timeSkipAfter?.length)wasted[a]++;}s=e.act(s,a,s.revision,e.legalActions(s)[o.actions.indexOf(x)].id);}
 return {s,wasted,played};}
const x=spec=>Object.entries(spec).flatMap(([id,n])=>Array(n).fill(id));
const DECK=x({'M-dog-01':3,'M-dog-02':3,'M-dog-03':3,'M-dog-04':3,'M-dog-05':2,'M-dog-06':1,'M-beetle-01':3,'M-beetle-02':3,'M-beetle-03':2,'G-doodle-jump':3,'E-mirror':3,'C-shiba':3,'W-snow':2,'I-c_coin2':3,'G-sugoroku-race':3});
test('新しい版の保存：最後まで再生が一致し、予約が残る途中から復帰しても同じ結果になる',()=>{
 let found=0;for(let seed=1;seed<40&&found<2;seed++){const {s}=cpuGame(seed,undefined,{deck:DECK});const saved=e.save(s);assert.equal(JSON.parse(saved).version,e.VERSION);
  const back=e.restore(saved);assert.equal(e.save(back),saved);assert.equal(digest(back),digest(s));
  // 予約が残っている時点（使用後・ときおくり前）を探して、そこから復帰
  let t=e.createGame(seed,{A:DECK,B:DECK});let cut=null;for(const id of s.commands){t=e.act(t,e.actor(t),t.revision,id);if(cut===null&&djReservations(t,t.turn).length){cut=t.revision;break;}}
  if(cut===null)continue;found++;
  const pre={...JSON.parse(saved),commands:s.commands.slice(0,cut)};let r=e.restore(JSON.stringify(pre));assert.equal(djReservations(r,r.turn).length,1,'復帰後も予約が残る');
  for(const id of s.commands.slice(cut))r=e.act(r,e.actor(r),r.revision,id);assert.equal(digest(r),digest(s));}
 assert.equal(found,2,'予約が残る途中局面を2試合で確認');
});
test('CPU同士の対戦（初級・中級）：ぴょんぴょんジャンプを空振りで使わない',()=>{
 for(const difficulty of ['beginner','intermediate']){let wasted=0,played=0;
  for(const seed of [3,5,8,13]){const r=cpuGame(seed,undefined,{deck:DECK,difficulty});wasted+=r.wasted.A+r.wasted.B;played+=r.played.A+r.played.B;assert.equal(r.s.phase,'finished');}
  assert.equal(wasted,0,difficulty);assert.ok(played>0,difficulty+'：使う場面はある');}
});
