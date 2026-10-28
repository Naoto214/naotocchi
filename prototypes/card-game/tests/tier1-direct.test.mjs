// PR #460 の Tier 1（直接テストのない高リスク6枚）：誘発・連鎖・対象・コスト・裏向き・期限・保存再生を、正式本文と正式裁定どおりに確かめる。
// 本文・裁定：57（キノコ⑧）・67（サクラ⑥）・74（サボテン）・54（サンゴ⑦）・59（おばけ⑤⑦）。カード効果は変えない（テストのみ）。
import test from 'node:test';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
import * as e from '../engine.mjs';

// --- 固定局面（盤面を直接組む。カード効果は engine.act だけが処理する） ---
function fixture(seed=71){const s=e.createGame(seed);s.choice=null;s.pending=[];s.phase='normal';s.window='normal';s.players.A.time=10;s.players.B.time=10;return s;}
function take(s,a,c){const x=s.players[a].deck.shift();s.cards[x].cardId=c;return x;}
function field(s,a,c,slot){const id=take(s,a,c);s.cards[id].generation++;if(slot==='companions')s.players[a].board.companions.push(id);else s.players[a].board[slot]=id;return id;}
function hand(s,a,c){const id=take(s,a,c);s.players[a].hand.push(id);return id;}
function discard(s,a,c){const id=take(s,a,c);s.players[a].discard.push(id);return id;}
function equip(s,a,c,target){const id=take(s,a,c);s.cards[id].generation++;s.players[a].board.prepared.push({id,target,targetGeneration:s.cards[target].generation,attachedAt:0});return id;}
function trap(s,a,c){const id=take(s,a,c);s.cards[id].generation++;s.players[a].board.prepared.push({id,faceDown:true,setSerial:0});return id;}
const find=(s,p)=>e.legalActions(s).find(p);
function act(s,p,msg){const a=find(s,p);assert.ok(a,msg??'action not legal');return e.act(s,e.actor(s),s.revision,a.id);}
function settle(s){let g=0;while(s.phase!=='normal'&&s.phase!=='finished'){assert.ok(g++<80,'settle loop');const L=e.legalActions(s);const a=L.find(x=>x.kind==='pass')??L.find(x=>x.kind==='skip')??L.find(x=>x.kind==='choose')??L[0];s=e.act(s,e.actor(s),s.revision,a.id);}return s;}
const endTurn=s=>settle(act(s,a=>a.kind==='pass'));
const reservations=(s,cardId)=>s.effects.filter(r=>r.kind==='reservation'&&s.cards[r.link?.source]?.cardId===cardId);
const lastComparison=s=>s.history.filter(h=>h.kind==='comparison').at(-1);

// --- 実際の対戦（createGame＋操作列だけで作るので、保存→復帰で同じ局面を再生できる） ---
// 山札の並びは seed だけで決まる（カードの中身に依らない）。その並びを逆算し、指定したカードが最初に引かれるデッキを作る。
const FILL=['G-real-fishing','G-curling-ice','G-downhill-snow','G-ski-jump','G-takoyaki-grill','G-tower-defense','I-ribbon','I-scarf','I-travel1','I-partner1','I-bond1','G-frogger-road','G-haunted-house-3d','G-bomber-maze','G-missile-command'];
function drawOrder(seed){const s=e.createGame(seed),out={};for(const a of ['A','B']){const at={},seen={};s.decks[a].forEach((c,i)=>{seen[c]=(seen[c]??0)+1;at[`${a}:${c}:${seen[c]}`]=i;});out[a]=[...s.players[a].hand,...s.players[a].deck].map(id=>at[id]);}return out;}
function stackedDecks(seed,tops){const order=drawOrder(seed),decks={};for(const a of ['A','B']){const want=[...(tops[a]??[])],counts={};for(const c of want)counts[c]=(counts[c]??0)+1;for(let f=0;want.length<40;f++){const c=FILL[f%FILL.length];if((counts[c]??0)<3){counts[c]=(counts[c]??0)+1;want.push(c);}}const list=Array(40);order[a].forEach((orig,k)=>{list[orig]=want[k];});decks[a]=list;}return decks;}
const isFill=(s,id)=>FILL.includes(s.cards[id]?.cardId);
// たまごの間の山札下送りは埋め札を選び、それ以外は見送り／パスで進める。
function advance(s){let g=0;while(s.phase!=='normal'&&s.phase!=='finished'){assert.ok(g++<80,'advance loop');const L=e.legalActions(s);const a=s.choice?.kind==='egg_bottom'?L.find(x=>isFill(s,x.value)):L.find(x=>x.kind==='pass')??L.find(x=>x.kind==='skip')??L.find(x=>x.kind==='choose');assert.ok(a,'no progress action');s=e.act(s,e.actor(s),s.revision,a.id);}return s;}
function passTurns(s,n){for(let i=0;i<n;i++)s=advance(act(advance(s),a=>a.kind==='pass'));return s;}
const cardOf=(s,a,cardId,zone='hand')=>s.players[a][zone].find(id=>s.cards[id].cardId===cardId);
const digest=s=>createHash('sha256').update(JSON.stringify({...s,log:undefined})).digest('hex');
// 保存（seed・デッキ・操作列）から最後まで再生して一致し、途中 cut から復帰して残りを流しても一致する。
function assertReplay(s,cut,check){const saved=e.save(s);const back=e.restore(saved);assert.equal(e.save(back),saved);assert.equal(digest(back),digest(s));
 const pre=JSON.stringify({...JSON.parse(saved),commands:s.commands.slice(0,cut)});let r=e.restore(pre);check(r);for(const id of s.commands.slice(cut))r=e.act(r,e.actor(r),r.revision,id);assert.equal(digest(r),digest(s));}

// ===== M-mushroom-08 キノコ⑧ =====
const M8='M-mushroom-08';
function mushroom(){const s=fixture();const main=field(s,'A',M8,'main');const into=hand(s,'A','M-dog-08');return {s,main,into};}
test('キノコ⑧：へんしんで捨て札へ置かれた時だけ誘発し、予約は次の自分のターン終了まで',()=>{
 let {s,main,into}=mushroom();s=act(s,a=>a.variant==='transform'&&a.source===into);
 assert.equal(s.phase,'trigger');assert.ok(s.players.A.discard.includes(main),'メイン枠から捨て札へ');
 s=settle(act(s,a=>a.kind==='trigger'&&a.source===main));assert.equal(reservations(s,M8).length,1);
 s=endTurn(s);assert.equal(s.turn,'B');assert.equal(reservations(s,M8).length,1,'相手のターンも続く');
 s=endTurn(s);assert.equal(s.turn,'A');assert.equal(reservations(s,M8).length,1,'次の自分のターン中も続く');
 s=endTurn(s);assert.equal(reservations(s,M8).length,0,'次の自分のターン終了で失効');
});
test('キノコ⑧：表向きで出たメイン以外のカードと同名が捨て札にある時、1回だけ1枚引く（同名なし・2回目は引かない）',()=>{
 let {s,main,into}=mushroom();const otter=hand(s,'A','C-otter');s=settle(act(act(s,a=>a.variant==='transform'&&a.source===into),a=>a.kind==='trigger'&&a.source===main));
 // 同名が捨て札にない：引かず、予約は残る
 let top=s.players.A.deck[0];s=settle(act(s,a=>a.source===otter));assert.ok(!s.players.A.hand.includes(top));assert.equal(reservations(s,M8).length,1);
 s=endTurn(endTurn(s));s.players.A.time=10;discard(s,'A','C-shiba');const shiba=hand(s,'A','C-shiba');
 top=s.players.A.deck[0];s=settle(act(s,a=>a.source===shiba));assert.ok(s.players.A.hand.includes(top),'山札の一番上を1枚引く');assert.equal(reservations(s,M8).length,0,'1回だけ');
});
test('キノコ⑧：伏せてしかけた札は「表向きで出た」に当たらない',()=>{
 let {s,main,into}=mushroom();discard(s,'A','G-real-fishing');const set=hand(s,'A','G-real-fishing');
 s=settle(act(act(s,a=>a.variant==='transform'&&a.source===into),a=>a.kind==='trigger'&&a.source===main));
 const top=s.players.A.deck[0];s=settle(act(s,a=>a.source===set&&a.slot==='prepared'));
 assert.ok(s.players.A.board.prepared.some(x=>x.id===set&&x.faceDown));assert.ok(!s.players.A.hand.includes(top));assert.equal(reservations(s,M8).length,1);
});

// ===== M-sakura-06 サクラ⑥ =====
const SK='M-sakura-06';
function sakuraSelect(pick){let s=fixture();field(s,'A','M-sakura-05','main');const domino=trap(s,'A','G-domino-run'),grill=trap(s,'A','G-takoyaki-grill');const six=hand(s,'A',SK),coin=hand(s,'A','I-c_coin2');
 s=act(s,a=>a.source===six&&a.variant==='time_skip');s=act(s,a=>a.kind==='trigger');
 assert.ok(!e.legalActions(s).some(a=>a.kind==='choose'),'選択は解決時（発動時には選ばない）');
 let g=0;while(s.choice?.kind!=='resolve_selection'){assert.ok(g++<10);s=act(s,a=>a.kind==='pass');}
 assert.deepEqual(e.legalActions(s).map(a=>a.value).sort(),[domino,grill].sort(),'伏せ札も選べる');
 s=settle(act(s,a=>a.value===(pick==='domino'?domino:grill)));return {s,domino,grill,coin};}
test('サクラ⑥：選んだ伏せ札（しかける）が準備枠から発動し、効果が適用されたら+5を1回',()=>{
 let {s,coin}=sakuraSelect('domino');assert.equal(reservations(s,SK).length,1);const g=s.players.A.growth;
 s=act(s,a=>a.source===coin);s=settle(act(s,a=>a.kind==='trigger'&&s.cards[a.source]?.cardId==='G-domino-run'));
 assert.equal(s.players.A.growth,g+5);assert.equal(reservations(s,SK).length,0,'1予約の+5は1回');
});
test('サクラ⑥：選ばなかった札の発動では得ず、選んだ札がこのターンの終了時に発動すれば得る',()=>{
 let {s,coin,grill}=sakuraSelect('grill');let g=s.players.A.growth;
 s=act(s,a=>a.source===coin);s=settle(act(s,a=>a.kind==='trigger'&&s.cards[a.source]?.cardId==='G-domino-run'));
 assert.equal(s.players.A.growth,g,'選んでいない札');assert.equal(reservations(s,SK).length,1);
 const bow=equip(s,'A','I-bowtie',s.players.A.board.main);// たこやきの対象（87 接続・88 X06：自身は対象にできない）
 g=s.players.A.growth;s=act(s,a=>a.kind==='pass');let n=0;while(s.turn==='A'){assert.ok(n++<20);s=act(s,a=>a.kind==='trigger'&&a.source===grill&&a.target===bow||a.kind==='pass');}
 assert.equal(s.players.A.growth,g+5,'ターン終了時の発動も「このターン」に含まれる');assert.equal(reservations(s,SK).length,0);
});
test('サクラ⑥：選んだ札がこのターンに発動しなければ、予約はターン終了で失効する',()=>{
 let {s}=sakuraSelect('domino');const g=s.players.A.growth;s=endTurn(s);
 assert.equal(s.turn,'B');assert.equal(reservations(s,SK).length,0);assert.equal(s.players.A.growth,g);
});

// ===== P-oasis_cactus オアシスのサボテンさん =====
const OA='P-oasis_cactus';
function cactus({equipped=false}={}){let s=fixture();field(s,'A','M-dog-03','main');const cac=field(s,'A',OA,'partner');s.players.A.relationship=1;if(equipped)equip(s,'A','I-partner1',cac);
 field(s,'B','M-dog-03','main');const bounce=[hand(s,'B','E-misunderstanding'),hand(s,'B','E-misunderstanding')];s=endTurn(s);s.players.B.time=10;return {s,cac,bounce};}
const bounceTo=(s,src)=>{s=act(s,a=>a.source===src);let g=0;while(s.phase!=='normal'&&s.choice?.kind!=='replacement'){assert.ok(g++<10);s=act(s,a=>a.kind==='pass');}return s;};
test('サボテン：相手の効果で手札へ戻るのを防ぐかを選べる（任意）。防いだら交際も続く',()=>{
 let {s,cac,bounce}=cactus();s=bounceTo(s,bounce[0]);
 assert.equal(s.choice?.kind,'replacement');assert.equal(s.choice.actor,'A');assert.equal(e.legalActions(s).length,2,'使う／使わない');
 s=settle(act(s,a=>/置換を使う/.test(a.label)));assert.equal(s.players.A.board.partner,cac);assert.equal(s.players.A.relationship,1);
});
test('サボテン：1ラウンドに1回。同じラウンドの2回目は防げない（使わない選択も手札へ戻る）',()=>{
 let {s,cac,bounce}=cactus();s=settle(act(bounceTo(s,bounce[0]),a=>/置換を使う/.test(a.label)));
 const g=s.players.A.growth;s=bounceTo(s,bounce[1]);assert.notEqual(s.choice?.kind,'replacement','同じラウンドは選択肢が出ない');s=settle(s);
 assert.equal(s.players.A.board.partner,null);assert.ok(s.players.A.hand.includes(cac));assert.equal(s.players.A.growth,g-10,'交際終了の-10');
 let t=cactus();t.s=bounceTo(t.s,t.bounce[0]);t.s=settle(act(t.s,a=>/置換を使わない/.test(a.label)));assert.ok(t.s.players.A.hand.includes(t.cac),'使わなければ戻る');
});
test('サボテン：使用回数はターンではなくラウンド単位（自分のターンに使えば、同じラウンドの相手のターンには防げない。次のラウンドは防げる）',()=>{
 let s=fixture();field(s,'A','M-dog-03','main');const cac=field(s,'A',OA,'partner');s.players.A.relationship=1;const coin=hand(s,'A','I-c_coin2');
 field(s,'B','M-dog-03','main');const [m1,m2,m3]=[0,1,2].map(()=>hand(s,'B','E-misunderstanding'));
 s=act(s,a=>a.source===coin);s=act(s,a=>a.kind==='pass');s=bounceTo(s,m1);assert.equal(s.choice?.kind,'replacement','自分のターンに相手が応答で使った効果');
 s=settle(act(s,a=>/置換を使う/.test(a.label)));assert.equal(s.players.A.board.partner,cac);
 s=endTurn(s);assert.equal(s.turn,'B');assert.equal(s.round,1);s.players.B.time=10;s=bounceTo(s,m2);assert.notEqual(s.choice?.kind,'replacement','同じラウンドの相手のターン');s=settle(s);assert.ok(s.players.A.hand.includes(cac));
 // 次のラウンド：もう一度出し直して、再び防げる
 s=endTurn(s);assert.equal(s.round,2);s.players.A.time=10;s=settle(act(s,a=>a.source===cac));assert.equal(s.players.A.board.partner,cac);
 s=endTurn(s);s.players.B.time=10;s=bounceTo(s,m3);assert.equal(s.choice?.kind,'replacement','新しいラウンド');
});
test('サボテン：このカードにカードがみにつけられている間は防がない',()=>{
 let {s,cac,bounce}=cactus({equipped:true});s=bounceTo(s,bounce[0]);
 const offered=s.choice?.kind==='replacement'?e.legalActions(s).map(a=>a.label):[];assert.ok(!offered.some(l=>/サボテン/.test(l)),'サボテンの置換は出ない');
 s=settle(s.choice?.kind==='replacement'?act(s,a=>/使わない/.test(a.label)):s);assert.ok(s.players.A.hand.includes(cac));
});

// ===== M-coral-07 サンゴ⑦ =====
function coral({world=true}={}){let s=fixture();const main=field(s,'A','M-coral-07','main');const comp=field(s,'A','C-shiba','companions');field(s,'A','P-grove_deer','partner');s.players.A.relationship=1;if(world)field(s,'A','W-deepsea','world');
 const bow=equip(s,'A','I-bowtie',main),rib=equip(s,'A','I-ribbon',comp);field(s,'B','M-dog-03','main');field(s,'B','W-snow','world');const arrows=[hand(s,'B','G-archery-3d'),hand(s,'B','G-archery-3d')];s=endTurn(s);s.players.B.time=10;return {s,main,comp,bow,rib,arrows};}
const onField=(s,id)=>s.players.A.board.prepared.some(x=>x.id===id);
test('サンゴ⑦：3種類そろう間、相手の効果で捨て札になるメイン以外の1枚を強制で場に残す。1ラウンドに1回',()=>{
 let {s,bow,rib,arrows}=coral();s=settle(act(s,a=>a.source===arrows[0]&&a.target===bow));
 assert.ok(onField(s,bow)&&!s.players.A.discard.includes(bow),'1回目は捨て札にならない（選択なしで適用）');
 s=settle(act(s,a=>a.source===arrows[1]&&a.target===rib));assert.ok(!onField(s,rib)&&s.players.A.discard.includes(rib),'同じラウンドの2回目は捨て札');
});
test('サンゴ⑦：回数はラウンド単位（自分のターンに相手の応答で使えば、同じラウンドの相手のターンには残さない）',()=>{
 let s=fixture();const main=field(s,'A','M-coral-07','main');const comp=field(s,'A','C-shiba','companions');field(s,'A','P-grove_deer','partner');s.players.A.relationship=1;field(s,'A','W-deepsea','world');
 const bow=equip(s,'A','I-bowtie',main),rib=equip(s,'A','I-ribbon',comp),coin=hand(s,'A','I-c_coin2');field(s,'B','M-dog-03','main');field(s,'B','W-snow','world');const [a1,a2]=[0,1].map(()=>hand(s,'B','G-archery-3d'));
 s=act(act(s,a=>a.source===coin),a=>a.kind==='pass');s=settle(act(s,a=>a.source===a1&&a.target===bow));assert.equal(s.turn,'A');assert.ok(onField(s,bow),'自分のターン中の相手の効果');
 s=endTurn(s);assert.equal(s.round,1);s.players.B.time=10;s=settle(act(s,a=>a.source===a2&&a.target===rib));assert.ok(s.players.A.discard.includes(rib),'同じラウンドの相手のターン');
});
test('サンゴ⑦：セカイがなく3種類がそろわなければ置換しない',()=>{
 let {s,bow,arrows}=coral({world:false});s=settle(act(s,a=>a.source===arrows[0]&&a.target===bow));assert.ok(!onField(s,bow)&&s.players.A.discard.includes(bow));
});

// ===== M-ghost-05 おばけ⑤ =====
const G5='M-ghost-05';
function ghost5(){const s=fixture();const main=field(s,'A',G5,'main');field(s,'B','M-dog-05','main');return {s,main};}
const activate=(s,main,pay)=>settle(act(act(s,a=>a.kind==='programAbility'&&a.source===main),a=>a.kind==='choose'&&a.value===pay||a.kind==='choose'&&/支払い/.test(a.label)&&pay===undefined));
test('おばけ⑤：準備枠のカードがなければ発動できない（コストを払えない）。払ったカードは山札の一番下',()=>{
 let {s,main}=ghost5();assert.equal(find(s,a=>a.kind==='programAbility'&&a.source===main),undefined);
 const bow=equip(s,'A','I-bowtie',main);s=activate(s,main);
 assert.equal(s.players.A.deck.at(-1),bow);assert.equal(s.players.A.board.prepared.length,0);assert.equal(reservations(s,G5).length,1);
 assert.equal(find(s,a=>a.kind==='programAbility'&&a.source===main),undefined,'この名前の能力は1ターンに1回');
});
test('おばけ⑤：自分からのちょうせんでは使わず、次に相手からちょうせんされた間だけ相手の能力値-2（1回のみ）',()=>{
 let {s,main}=ghost5();equip(s,'A','I-bowtie',main);s=activate(s,main);
 s=settle(act(s,a=>a.kind==='challenge'&&/ちから/.test(a.label)));assert.deepEqual(lastComparison(s).values,{A:7,B:9},'自分から：-2なし');assert.equal(reservations(s,G5).length,1);
 s=endTurn(s);s=settle(act(s,a=>a.kind==='challenge'&&/ちから/.test(a.label)));
 assert.deepEqual(lastComparison(s).values,{A:7,B:7},'相手から：相手のちから9→7');assert.equal(reservations(s,G5).length,0);
 assert.equal(e.view(s,'B').players.B.stats.power,9,'ちょうせんが終われば戻る');
 s=endTurn(endTurn(s));s=settle(act(s,a=>a.kind==='challenge'&&/ちから/.test(a.label)));assert.deepEqual(lastComparison(s).values,{A:7,B:9},'2回目はない');
});
test('おばけ⑤：相手がちょうせんしないまま次の自分のターン開始時を迎えると失効する',()=>{
 let {s,main}=ghost5();equip(s,'A','I-bowtie',main);s=activate(s,main);s=endTurn(endTurn(s));
 assert.equal(s.turn,'A');assert.equal(reservations(s,G5).length,0);
 s=endTurn(s);s=settle(act(s,a=>a.kind==='challenge'&&/ちから/.test(a.label)));assert.deepEqual(lastComparison(s).values,{A:7,B:9});
});

// ===== M-ghost-07 おばけ⑦ =====
const G7='M-ghost-07';
test('おばけ⑦：捨て札のメインだけをコストにでき、それを山札の一番下へ置く',()=>{
 let s=fixture();const main=field(s,'A',G7,'main');discard(s,'A','C-shiba');
 assert.equal(find(s,a=>a.kind==='programAbility'&&a.source===main),undefined,'メイン以外しかない');
 const dm=discard(s,'A','M-dog-02');s=act(s,a=>a.kind==='programAbility'&&a.source===main);
 assert.deepEqual(e.legalActions(s).filter(a=>/支払い/.test(a.label)).map(a=>a.value),[dm],'候補は捨て札のメインだけ');
 s=settle(act(s,a=>/支払い/.test(a.label)));assert.equal(s.players.A.deck.at(-1),dm);assert.ok(!s.players.A.discard.includes(dm));assert.equal(reservations(s,G7).length,1);
});
test('おばけ⑦：次になかま／こいびとを出した時、山札上2枚から1枚を手札、残りを一番下。1回だけで、期限は次の自分のターン終了',()=>{
 let s=fixture();const main=field(s,'A',G7,'main');discard(s,'A','M-dog-02');const otter=hand(s,'A','C-otter');
 s=settle(act(act(s,a=>a.kind==='programAbility'&&a.source===main),a=>/支払い/.test(a.label)));
 const [x,y]=s.players.A.deck.slice(0,2);s=act(s,a=>a.source===otter);
 let n=0;while(s.choice?.kind!=='search_take'){assert.ok(n++<10);s=act(s,a=>a.kind==='pass'||a.kind==='skip');}
 const opts=e.legalActions(s).map(a=>a.value);assert.deepEqual(opts.sort(),[x,y].sort(),'2枚から必ず1枚（加えない選択はない）');
 s=settle(act(s,a=>a.value===y));assert.ok(s.players.A.hand.includes(y));assert.equal(s.players.A.deck.at(-1),x);assert.equal(reservations(s,G7).length,0);
 let t=fixture();const m2=field(t,'A',G7,'main');discard(t,'A','M-dog-02');t=settle(act(act(t,a=>a.kind==='programAbility'&&a.source===m2),a=>/支払い/.test(a.label)));
 t=endTurn(endTurn(t));assert.equal(reservations(t,G7).length,1,'次の自分のターン中は残る');t=endTurn(t);assert.equal(reservations(t,G7).length,0,'その終了で失効');
});

// ===== 保存再生（実際の操作列）：予約・1ラウンドに1回の使用状況が、保存の途中から復帰しても続く =====
// 同じ仕組み（place予約 nextEnd＝キノコ⑧・おばけ⑦、置換の1ラウンド1回＝サボテン・サンゴ⑦）は代表1枚で確かめる。
test('保存再生：おばけ⑤の予約（次の自分のターン開始時まで）が復帰後も残り、相手のちょうせんで-2になる',()=>{
 let s=e.createGame(5,stackedDecks(5,{A:['M-ghost-05','I-bowtie'],B:['M-dog-05']}));
 s=passTurns(s,8);assert.equal(s.round,5);assert.equal(s.turn,'A');
 s=advance(act(s,a=>a.variant==='birth'&&s.cards[a.source].cardId===G5));s=passTurns(s,1);
 s=advance(act(s,a=>a.variant==='birth'&&s.cards[a.source].cardId==='M-dog-05'));s=passTurns(s,1);
 s=passTurns(s,2);assert.equal(s.round,7);const main=s.players.A.board.main;
 s=advance(act(s,a=>s.cards[a.source]?.cardId==='I-bowtie'&&a.target===main));
 s=advance(act(act(s,a=>a.kind==='programAbility'&&a.source===main),a=>/支払い/.test(a.label)));const cut=s.commands.length;assert.equal(reservations(s,G5).length,1);
 s=passTurns(s,1);s=advance(act(s,a=>a.kind==='challenge'&&/ちから/.test(a.label)));assert.deepEqual(lastComparison(s).values,{A:7,B:7});
 assertReplay(s,cut,r=>{assert.equal(reservations(r,G5).length,1,'復帰後も予約が残る');assert.equal(r.players.A.deck.at(-1),cardOf(s,'A','I-bowtie','deck'));});
});
test('保存再生：おばけ⑦の予約（なかま登場で探索）が相手のターンをまたいで復帰後も残る',()=>{
 let s=e.createGame(9,stackedDecks(9,{A:['M-dog-02','M-ghost-07','C-otter']}));
 s=passTurns(s,2);s=advance(act(s,a=>a.variant==='birth'&&s.cards[a.source].cardId==='M-dog-02'));s=passTurns(s,10);assert.equal(s.round,7);assert.equal(s.turn,'A');
 s=advance(act(s,a=>a.variant==='transform'&&s.cards[a.source].cardId===G7));assert.ok(s.players.A.discard.some(id=>s.cards[id].cardId==='M-dog-02'));
 const main=s.players.A.board.main;s=advance(act(act(s,a=>a.kind==='programAbility'&&a.source===main),a=>/支払い/.test(a.label)));
 s=passTurns(s,2);const cut=s.commands.length;assert.equal(reservations(s,G7).length,1);
 const top=s.players.A.deck.slice(0,2);s=act(s,a=>a.source===cardOf(s,'A','C-otter'));
 let n=0;while(s.choice?.kind!=='search_take'){assert.ok(n++<10);s=act(s,a=>a.kind==='pass'||a.kind==='skip');}
 s=advance(act(s,a=>a.value===top[0]));assert.ok(s.players.A.hand.includes(top[0]));assert.equal(s.players.A.deck.at(-1),top[1]);
 assertReplay(s,cut,r=>assert.equal(reservations(r,G7).length,1,'復帰後も予約が残る'));
});
test('保存再生：サクラ⑥で選んだ伏せ札の予約が復帰後も同じ札を指し、+5が1回',()=>{
 let s=e.createGame(13,stackedDecks(13,{A:['M-sakura-05','M-sakura-06','G-domino-run','I-c_coin2']}));
 s=passTurns(s,8);s=advance(act(s,a=>a.variant==='birth'&&s.cards[a.source].cardId==='M-sakura-05'));s=passTurns(s,2);assert.equal(s.round,6);assert.equal(s.turn,'A');
 const domino=cardOf(s,'A','G-domino-run');s=advance(act(s,a=>a.source===domino&&a.slot==='prepared'));
 s=act(act(s,a=>a.variant==='time_skip'&&s.cards[a.source].cardId===SK),a=>a.kind==='trigger');
 let n=0;while(s.choice?.kind!=='resolve_selection'){assert.ok(n++<10);s=act(s,a=>a.kind==='pass');}
 s=advance(act(s,a=>a.value===domino));const cut=s.commands.length;const g=s.players.A.growth;
 s=act(s,a=>s.cards[a.source]?.cardId==='I-c_coin2');s=advance(act(s,a=>a.kind==='trigger'&&a.source===domino));
 assert.ok(s.players.A.growth>=g+5);assert.equal(reservations(s,SK).length,0);
 assertReplay(s,cut,r=>{const [res]=reservations(r,SK);assert.ok(res,'復帰後も予約が残る');assert.equal(res.link.target,domino);});
});
test('保存再生：サボテンの「1ラウンドに1回」の使用が復帰後も残り、同じラウンドの2回目は防げない',()=>{
 let s=e.createGame(21,stackedDecks(21,{A:['M-dog-01',OA],B:['M-dog-01','E-misunderstanding','E-misunderstanding']}));
 s=advance(act(advance(s),a=>a.variant==='birth'&&s.cards[a.source].cardId==='M-dog-01'));s=advance(act(s,a=>a.source===cardOf(s,'A',OA)));
 s=passTurns(s,1);s=advance(act(s,a=>a.variant==='birth'&&s.cards[a.source].cardId==='M-dog-01'));s=passTurns(s,6);assert.equal(s.round,4);assert.equal(s.turn,'B');
 const cac=s.players.A.board.partner;assert.equal(s.cards[cac].cardId,OA);
 const mis=s.players.B.hand.filter(id=>s.cards[id].cardId==='E-misunderstanding');
 s=bounceTo(s,mis[0]);assert.equal(s.choice?.kind,'replacement');s=advance(act(s,a=>/置換を使う/.test(a.label)));assert.equal(s.players.A.board.partner,cac);const cut=s.commands.length;
 s=bounceTo(s,mis[1]);assert.notEqual(s.choice?.kind,'replacement');s=advance(s);assert.ok(s.players.A.hand.includes(cac));
 assertReplay(s,cut,r=>assert.equal(r.players.A.board.partner,cac));
});
