// 478：ルナランダー・サブマリン3Dの本文明確化（書き方だけ。効果・数値・判定時点・対戦の版は不変）。
import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import {createHash} from 'node:crypto';
import * as e from '../engine.mjs';
import {CATALOG} from '../full-catalog.mjs';
import {RULES} from '../rules.mjs';
const LL='G-lunar-lander',SUB='G-submarine-3d';
const LL_TEXT='解決時に自分の残り時がちょうど2なら、1枚引き、自分のそだち+5。';
const SUB_TEXT='発動時に0・1・2から数を1つ選び、時コストをその数だけ増やす。山札の上から、選んだ数が0なら3枚、1なら5枚、2なら7枚を見る。その中から1枚までを手札に加え、残りを好きな順で山札の一番下に置く。';
const SUB_BEFORE='発動時に0・1・2から数を1つ選び、時コストをその数だけ増やす。山札の上から、3に選んだ数の2倍を足した枚数を見る。その中から1枚までを手札に加え、残りを好きな順で山札の一番下に置く。';
function fixture(){const s=e.createGame(71);s.choice=null;s.pending=[];s.phase='normal';s.window='normal';s.players.A.time=10;s.players.B.time=10;return s;}
function take(s,a,c){const x=s.players[a].deck.shift();s.cards[x].cardId=c;return x;}
function field(s,a,c,slot){const id=take(s,a,c);s.cards[id].generation++;s.players[a].board[slot]=id;return id;}
function hand(s,a,c){const id=take(s,a,c);s.players[a].hand.push(id);return id;}
const find=(s,p)=>e.legalActions(s).find(p);
function act(s,p,msg){const a=find(s,p);assert.ok(a,msg??'action not legal');return e.act(s,e.actor(s),s.revision,a.id);}
function resolveAll(s){let g=0;while(s.phase==='response'){assert.ok(g++<20);s=act(s,a=>a.kind==='pass');}return s;}

// --- 本文と、本文以外が変わっていないこと ---
test('正式本文：ルナランダーは「解決時に」を明記、サブマリン3Dは0／1／2→3／5／7枚の書き方',()=>{
 assert.equal(CATALOG[LL].text,LL_TEXT);assert.equal(CATALOG[SUB].text,SUB_TEXT);
 for(const [id,cost] of [[LL,1],[SUB,2]]){const c=CATALOG[id];assert.equal(c.cost,cost);assert.equal(c.type,'play');assert.equal(c.method,'すぐつかう');assert.equal(c.rare,false);}
});
test('カタログ：2枚の本文と出典hash以外は main eb97817d と同一（452枚）',()=>{
 const norm=c=>{const x={...c};delete x.source_sha256;if([LL,SUB].includes(x.id))delete x.text;return x;};
 const dig=createHash('sha256').update(JSON.stringify(Object.keys(CATALOG).sort().map(k=>norm(CATALOG[k])))).digest('hex');
 assert.equal(Object.keys(CATALOG).length,452);assert.equal(dig,'29c7bc7bf4aabf76a846a396b8ec029b7d8daa92a71b516dea52ba386244c141');
});
test('ルールプログラムは不変：ルナランダーは解決時の残り時2、サブマリンは3＋2×選んだ数（旧本文の式＝新本文の枚数）',()=>{
 assert.match(JSON.stringify(RULES[LL]),/"time2"/);assert.match(JSON.stringify(RULES[SUB]),/"submarine"/);assert.match(JSON.stringify(RULES[SUB]),/"variants":\[0,1,2\]/);
 const fromNewText=Object.fromEntries([...SUB_TEXT.matchAll(/(\d)なら(\d)枚/g)].map(m=>[Number(m[1]),Number(m[2])]));
 assert.deepEqual(fromNewText,{0:3,1:5,2:7});for(const n of [0,1,2])assert.equal(3+2*n,fromNewText[n],'旧本文「3に選んだ数の2倍を足した枚数」と同じ');
 assert.ok(SUB_BEFORE.includes('3に選んだ数の2倍を足した枚数'));
});

// --- ルナランダー：残り時は支払いと反応を経た解決時に見る（85 §3、86 P16・X18） ---
function lunar(time){const s=fixture();field(s,'A','M-dog-03','main');const ll=hand(s,'A',LL),coin=hand(s,'A','I-c_coin2');s.players.A.time=time;return {s,ll,coin};}
test('ルナランダー：残り時3で使う→支払い後の解決時に2なので、1枚引いてそだち+5',()=>{
 let {s,ll}=lunar(3);const g=s.players.A.growth;s=act(s,a=>a.source===ll);assert.equal(s.players.A.time,2);const top=s.players.A.deck[0];
 s=resolveAll(s);assert.equal(s.players.A.growth,g+5);assert.ok(s.players.A.hand.includes(top));
});
test('ルナランダー：使う前に残り時2でも、支払い後の解決時は1なので効果なし（使うことはできる）',()=>{
 let {s,ll}=lunar(2);const g=s.players.A.growth,h=s.players.A.hand.length;assert.ok(find(s,a=>a.source===ll),'ちょうど2でなくても発動できる');
 s=resolveAll(act(s,a=>a.source===ll));assert.equal(s.players.A.time,1);assert.equal(s.players.A.growth,g);assert.equal(s.players.A.hand.length,h-1);
});
test('ルナランダー：反応でさらに時1を払うと、解決時は残り時1で効果なし（P16）',()=>{
 let {s,ll,coin}=lunar(3);const g=s.players.A.growth;s=act(s,a=>a.source===ll);assert.equal(s.players.A.time,2);
 s=act(s,a=>a.source===coin);assert.equal(s.players.A.time,1);s=resolveAll(s);
 assert.equal(s.players.A.growth,g,'ラッキーコインは公開がメイン以外ならドロー、ルナランダーは不成立');assert.match(s.log.at(-1)+s.log.join(),/ルナランダーを解決/);
});

// --- サブマリン3D：選んだ数0／1／2 → 時2／3／4、見る枚数3／5／7（83 §3、84 P07・X11） ---
function submarine(){const s=fixture();field(s,'A','M-dog-03','main');const sub=hand(s,'A',SUB);return {s,sub};}
test('サブマリン3D：選べる数は0・1・2だけで、時コストはその数だけ増える（2／3／4）',()=>{
 const {s,sub}=submarine();const opts=e.legalActions(s).filter(a=>a.source===sub);
 assert.deepEqual(opts.map(a=>[a.variant,a.cost]),[[0,2],[1,3],[2,4]]);
});
test('サブマリン3D：見る枚数は 0→3枚、1→5枚、2→7枚。1枚までを手札、残りは選んだ順で山札の一番下',()=>{
 for(const [n,look] of [[0,3],[1,5],[2,7]]){let {s,sub}=submarine();const before=s.players.A.time;s=act(s,a=>a.source===sub&&a.variant===n);assert.equal(s.players.A.time,before-(2+n));
  const top=s.players.A.deck.slice(0,look),rest=s.players.A.deck.slice(look);s=resolveAll(s);assert.equal(s.choice?.kind,'search_take');
  const takes=e.legalActions(s).filter(a=>/手札へ/.test(a.label)&&!/加えず/.test(a.label));assert.deepEqual(takes.map(a=>a.value),top,`${n}→${look}枚`);
  assert.ok(e.legalActions(s).some(a=>/加えず/.test(a.label)),'0枚でもよい（1枚まで）');
  s=act(s,a=>a.value===top[0]);assert.ok(s.players.A.hand.includes(top[0]));
  const order=[...top.slice(1)].reverse();for(const id of order){assert.equal(s.choice?.kind,'search_order');s=act(s,a=>a.value===id);}
  assert.notEqual(s.choice?.kind,'search_order');assert.deepEqual(s.players.A.deck,[...rest,...order],'見なかった札はそのまま、見た残りは指定順で一番下');}
});
test('サブマリン3D：山札が足りなければある分だけ見る（数2で山札4枚→4枚）',()=>{
 let {s,sub}=submarine();const extra=s.players.A.deck.splice(4);s.players.A.discard.push(...extra);
 s=resolveAll(act(s,a=>a.source===sub&&a.variant===2));const takes=e.legalActions(s).filter(a=>/手札へ/.test(a.label)&&!/加えず/.test(a.label));assert.equal(takes.length,4);
});

// --- 旧保存の互換：main（本文変更前）のエンジンで作った保存を、そのままの版で再生する ---
const legacy=JSON.parse(readFileSync(new URL('./lunar-submarine-saves.json',import.meta.url)));
const boardDigest=s=>createHash('sha256').update(JSON.stringify({players:s.players,result:s.result,log:s.log})).digest('hex');
const stateDigest=s=>createHash('sha256').update(JSON.stringify({...s,history:s.history.map(h=>h.kind==='activation'?{...h,text:null}:h)})).digest('hex');
test('旧保存：本文変更前に作った hotseat-2・3・4 の保存6件が、版を変えずに同じ盤面・結果で再生される（新しい版は作らない）',()=>{
 assert.equal(e.VERSION,'hotseat-4');assert.deepEqual(e.RULE_VERSIONS,['hotseat-2','hotseat-3','hotseat-4']);
 assert.notEqual(legacy.lunar_text,CATALOG[LL].text);assert.equal(legacy.submarine_text,SUB_BEFORE);
 assert.deepEqual([...new Set(legacy.saves.map(x=>x.save.version))],['hotseat-2','hotseat-3','hotseat-4']);
 for(const x of legacy.saves){const text=JSON.stringify(x.save);const s=e.restore(text);
  assert.equal(e.save(s),text,`${x.save.version}/${x.seed}：保存を書き換えない`);assert.equal(s.version,x.save.version);
  assert.deepEqual(s.result,x.result);assert.deepEqual({A:s.players.A.growth,B:s.players.B.growth},x.growth);
  assert.equal(boardDigest(s),x.board_result_log_sha256,`${x.save.version}/${x.seed}：盤面・結果・記録`);
  assert.equal(stateDigest(s),x.state_sha256_without_activation_text,`${x.save.version}/${x.seed}：発動記録の本文の写し以外の全状態`);
  const played=s.history.filter(h=>h.kind==='play').map(h=>h.cardId);assert.ok(played.includes(LL)&&played.includes(SUB),'2枚とも使われた対戦');}
});
test('旧保存：違いは発動記録（history）にある本文の写しだけで、新しい本文になる（ルール・CPU・戦績は読まない）',()=>{
 const x=legacy.saves.find(v=>v.save.version==='hotseat-4');const s=e.restore(JSON.stringify(x.save));
 const texts=new Set(s.history.filter(h=>h.kind==='activation'&&[LL,SUB].includes(s.cards[h.source].cardId)).map(h=>h.text));
 assert.deepEqual([...texts].sort(),[LL_TEXT,SUB_TEXT].sort());
});
