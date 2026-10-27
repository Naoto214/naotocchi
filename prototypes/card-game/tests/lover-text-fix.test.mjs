// PR #446 follow-up: こいびと本文と実装の一致（クモ・サソリ）と、旧保存（hotseat-2）の再生互換。
import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import {createHash} from 'node:crypto';
import * as e from '../engine.mjs';
import {CATALOG} from '../full-catalog.mjs';
import {CpuSession,restoreMatch} from '../cpu-session.mjs';import {chooseCpuAction} from '../cpu-policy.mjs';import {cpuDeck} from '../cpu-decks.mjs';

function fixture(){const s=e.createGame(71);s.choice=null;s.pending=[];s.phase='normal';s.window='normal';s.players.A.time=10;s.players.B.time=10;return s;}
function take(s,a,c){const x=s.players[a].deck.shift();s.cards[x].cardId=c;return x;}
function field(s,a,c,slot){const id=take(s,a,c);s.cards[id].generation++;if(slot==='companions')s.players[a].board.companions.push(id);else s.players[a].board[slot]=id;return id;}
function hand(s,a,c){const id=take(s,a,c);s.players[a].hand.push(id);return id;}
function doAction(s,kind,predicate=()=>true){const a=e.legalActions(s).find(a=>a.kind===kind&&predicate(a));assert.ok(a,kind);return e.act(s,e.actor(s),s.revision,a.id);}
function passAll(s){while(s.phase==='response'||s.phase==='choice')s=doAction(s,s.phase==='choice'?'choose':'pass');return s;}
const pendingCards=s=>s.phase==='trigger'?s.pending.map(r=>[s.cards[r.source].cardId,r.event?.kind]):[];
const has=(s,cardId)=>pendingCards(s).some(([id])=>id===cardId);

function spiderAt(stage){const s=fixture();field(s,'A','M-beetle-03','main');const spider=field(s,'A','P-knitting_spider','partner');s.players.A.relationship=stage;return {s,spider};}

test('クモ：交際0→1・1→2・2→3では発動できる',()=>{
 for(const stage of [0,1,2]){let {s}=spiderAt(stage);s=doAction(s,'relationship');assert.equal(s.players.A.relationship,stage+1);
  assert.deepEqual(pendingCards(s),[['P-knitting_spider','progress']],`${stage}→${stage+1}`);
  const time=s.players.A.time;s=doAction(s,'trigger');s=passAll(s);assert.equal(s.phase,'normal');assert.equal(s.players.A.time,time);
  assert.ok(s.effects.some(x=>x.kind==='discount'&&x.actor==='A'&&x.action==='equipOrTrap'&&x.n===1),'みにつける・しかける用の時1軽減');}
});

test('クモ：3→結婚では発動しない（結婚のそだち+10はそのまま）',()=>{
 let {s}=spiderAt(3);const growth=s.players.A.growth;s=doAction(s,'relationship');
 assert.equal(s.players.A.relationship,4);assert.equal(s.players.A.growth,growth+10);
 assert.equal(has(s,'P-knitting_spider'),false,'結婚した時はクモの誘発に入らない');
 assert.equal(s.phase,'response');assert.equal(s.effects.some(x=>x.kind==='discount'&&x.action==='equipOrTrap'),false);
});

test('クモ：1ラウンドに1回は交際進行の間で維持される',()=>{
 let {s}=spiderAt(0);s=doAction(s,'relationship');s=doAction(s,'trigger');s=passAll(s);
 s.players.A.relationshipUsed=false;s=doAction(s,'relationship');assert.equal(s.players.A.relationship,2);assert.equal(has(s,'P-knitting_spider'),false);
});

test('結婚した時に発動する他カード（にんぎょ）は維持される',()=>{
 let s=fixture();field(s,'A','M-beetle-03','main');field(s,'A','P-sea_mermaid','partner');s.players.A.relationship=3;const world=take(s,'A','W-deepsea');s.players.A.discard.push(world);
 s=doAction(s,'relationship');assert.deepEqual(pendingCards(s),[['P-sea_mermaid','marriage']]);
 s=doAction(s,'trigger');s=passAll(s);assert.ok(s.players.A.hand.includes(world));
});

function scorpionTurn(itemFaceUp){let s=fixture();field(s,'A','M-beetle-03','main');field(s,'A','P-desert_scorpion','partner');
 const game=hand(s,'A','G-hit-blow');s=doAction(s,'play',a=>a.source===game);s=passAll(s);
 if(itemFaceUp){const bow=hand(s,'A','I-bowtie');s=doAction(s,'place',a=>a.source===bow&&!a.trap);}
 else{const paper=hand(s,'A','I-poop1');s=doAction(s,'place',a=>a.source===paper&&a.trap);}
 s=passAll(s);s=doAction(s,'pass');s=passAll(s);return s;}

test('サソリ：表向きのあそび＋伏せてしかけたあいてむだけでは発動しない',()=>{
 const s=scorpionTurn(false);assert.equal(has(s,'P-desert_scorpion'),false);
 assert.ok(s.players.A.board.prepared.some(x=>x.faceDown&&s.cards[x.id].cardId==='I-poop1'),'伏せ札はそのまま');
});

test('サソリ：表向きのあそび＋表向きのあいてむでは発動できる',()=>{
 let s=scorpionTurn(true);assert.ok(has(s,'P-desert_scorpion'));const n=s.players.A.hand.length;s=doAction(s,'trigger',a=>s.cards[a.source].cardId==='P-desert_scorpion');s=passAll(s);
 assert.equal(s.players.A.hand.length,n+1);
});

test('伏せ札の非公開表示は変わらない',()=>{
 const s=scorpionTurn(false),v=e.view(s,'B');assert.equal(JSON.stringify(v).includes('トイレットペーパー'),false);
});

test('タコ：今の装備先は移し先に出ず、タコ自身は適正な装備先なら選べる（処理は変更なし）',()=>{
 let s=fixture();const m=field(s,'A','M-beetle-03','main'),o=field(s,'A','P-rock_octopus','partner');field(s,'A','C-cat_friend','companions');
 const letter=hand(s,'A','I-partner1'),paper=hand(s,'A','I-poop1');
 s=doAction(s,'place',a=>a.source===letter&&a.target===m);s=passAll(s);s=doAction(s,'place',a=>a.source===paper&&a.trap);s=passAll(s);
 const time=s.players.A.time;s=doAction(s,'programAbility',a=>a.source===o);assert.equal(s.choice.kind,'activation_selection');
 s=doAction(s,'choose',a=>a.value===letter);
 const destinations=e.legalActions(s).filter(a=>a.kind==='choose'&&a.value!=='cancel').map(a=>a.value);
 assert.deepEqual(destinations,[o],'今の装備先（メイン）と、らぶれたーを適正にみにつけられないなかまは出ない');
 s=doAction(s,'choose',a=>a.value===o);s=passAll(s);
 assert.equal(s.players.A.board.prepared.find(x=>x.id===letter).target,o);assert.equal(s.players.A.time,time-1);
 assert.ok(s.players.A.board.prepared.some(x=>x.id===paper&&x.faceDown),'伏せ札は移さない');
});

// PR #452 で新規対戦の版は hotseat-4（こいびと修正＋ぴょんぴょんジャンプ改善案B）になった。こいびと修正は hotseat-3 以降に含まれる。
test('新しい対戦は最新の版（hotseat-4）、保存しても版は保たれる。hotseat-3 の保存も読める',()=>{
 const s=e.createGame(5);assert.equal(s.version,'hotseat-4');assert.equal(e.VERSION,'hotseat-4');assert.equal(JSON.parse(e.save(s)).version,'hotseat-4');
 assert.ok(e.RULE_VERSIONS.includes('hotseat-3'));const t=e.createGame(5,undefined,'hotseat-3');assert.equal(JSON.parse(e.save(t)).version,'hotseat-3');
});

const saves=JSON.parse(readFileSync(new URL('./lover-fix-hotseat2-saves.json',import.meta.url)));
const digest=s=>createHash('sha256').update(JSON.stringify({players:s.players,result:s.result,log:s.log})).digest('hex');
test('旧保存（hotseat-2）は修正前の動作のまま、最後まで同じ結果に復帰する',()=>{
 assert.equal(saves.rows.length,2);
 for(const r of saves.rows){assert.equal(r.save.version,'hotseat-2');const s=e.restore(JSON.stringify(r.save));
  assert.equal(s.version,'hotseat-2',r.case);assert.equal(s.revision,r.finalRevision,r.case);assert.deepEqual(s.result,r.result,r.case);assert.equal(digest(s),r.stateSha256,r.case);
  assert.equal(e.save(s),JSON.stringify(r.save),'再保存しても hotseat-2 のまま同じ内容');}
});

test('旧保存の操作列を新ルール（hotseat-3・hotseat-4）で再生すると食い違う＝版の分離が必要',()=>{
 for(const r of saves.rows)for(const version of ['hotseat-3','hotseat-4']){const changed={...r.save,version};assert.throws(()=>e.restore(JSON.stringify(changed)),/今は選べない行動です/,r.case);}
});

test('旧保存は修正前の分岐を実際に通っている',()=>{
 const [spider,scorpion]=saves.rows;
 let s=e.createGame(spider.save.seed,spider.save.decks,'hotseat-2');for(const id of spider.save.commands.slice(0,spider.triggerRevision))s=e.act(s,e.actor(s),s.revision,id);
 assert.deepEqual(pendingCards(s)[0],['P-knitting_spider','marriage']);
 s=e.createGame(scorpion.save.seed,scorpion.save.decks,'hotseat-2');for(const id of scorpion.save.commands.slice(0,scorpion.triggerRevision))s=e.act(s,e.actor(s),s.revision,id);
 assert.equal(pendingCards(s)[0][0],'P-desert_scorpion');
 assert.ok(s.history.filter(h=>h.serial===s.serial&&h.kind==='play'&&h.type==='item'&&h.actor===s.pending[0].actor).every(h=>!h.faceUp));
});

test('クモ・サソリ・タコの本文',()=>{
 assert.equal(CATALOG['P-knitting_spider'].text,'1ラウンドに1回。自分の交際段階が進んだ時、発動できる。このラウンド、自分が次に「みにつける」か「しかける」でアクションカードをプレイするための時を1少なくする。');
 assert.equal(CATALOG['P-desert_scorpion'].text,'1ターンに1回。自分のターン終了時、このターン自分が「あそび」と「あいてむ」のカードをそれぞれ1枚以上表向きでプレイしていた場合、発動できる。1枚引く。');
 assert.equal(CATALOG['P-rock_octopus'].text,'1ターンに1回。自分のターンに、自分になかまがあり、準備枠にカードが2枚以上ある場合、時1を払い、自分の準備枠でみにつけられているカード1枚と、それを適正にみにつけられる、今の装備先とは別の自分のキャラクター1枚を対象として発動できる。その装備を後者へつけ替える。');
});

function playOut(s,limit=3000){for(let i=0;i<limit&&!s.finished;i++){assert.equal(s.automationStop,null);if(s.cpuPending)s.stepCpu(s.projection.revision);else{const o=s.decisionInput(),a=chooseCpuAction(o,{seed:4460,step:o.revision});s.commit(a.id,o.revision,o.seat);}}return s;}
test('旧保存（hotseat-2）のCPU途中保存も復帰し、最後まで進む',()=>{
 for(const r of saves.rows){const game={...r.save,commands:r.save.commands.slice(0,r.triggerRevision-20)};
  const raw=JSON.stringify({version:'cpu-match-1',policy:'heuristic-1',humanSeat:'A',difficulty:'intermediate',policySeed:7,step:0,guard:{turn:null,count:0,seen:{}},diagnostic:null,game});
  const s=restoreMatch(raw);assert.equal(s.mode,'cpu');s.reveal();playOut(s);assert.equal(s.finished,true,r.case);assert.equal(JSON.parse(s.engineSave).version,'hotseat-2',r.case);}
});
test('旧保存（hotseat-2）の決着済み対戦は戦績用にそのまま復帰する',()=>{
 for(const r of saves.rows){const s=restoreMatch(JSON.stringify(r.save));assert.equal(s.finished,true);assert.equal(s.save(),JSON.stringify(r.save));}
});
test('クモ入りCPUデッキ（item）同士の新しい対戦は最新の版（hotseat-4）で最後まで進む',()=>{
 const d=cpuDeck('item').cards;assert.equal(d.filter(id=>id==='P-knitting_spider').length,2);
 for(const humanSeat of ['A','B']){const s=new CpuSession({humanSeat,policySeed:446});s.start(e.createGame(20261027,{A:d,B:d}));playOut(s);assert.equal(s.finished,true);assert.equal(JSON.parse(s.engineSave).version,'hotseat-4');
  const back=restoreMatch(s.save());assert.equal(back.engineSave,s.engineSave);}
});
