// VERSION 4 試遊：恋人18種類の「♥ 結婚したら」能力の単体テスト（写しのモジュールで実行。正式ファイルは変えない）。
// 実行：node --test prototypes/card-game/lover-marriage-v4-20261104/tests/
import test from 'node:test';import assert from 'node:assert/strict';import os from 'node:os';import path from 'node:path';import fs from 'node:fs';
import {buildStage} from '../lib/build-stage.mjs';
import {LOVERS} from '../lib/v4-patches.mjs';
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'lover4-'));buildStage(dir);
const imp=f=>import(path.join(dir,f));
const e=await imp('engine.mjs'),{captureResult}=await imp('ui-results.mjs'),ui=await imp('ui-presentation.mjs');
const {observeCpu}=await imp('cpu-observation.mjs'),{chooseCpuAction}=await imp('cpu-policy.mjs'),{advanceResponses}=await imp('auto-progress.mjs'),{CPU_DECKS}=await imp('cpu-decks.mjs');

function fixture(seat='A'){const s=e.createGame(41);s.choice=null;s.pending=[];s.phase='normal';s.window='normal';s.turn=seat;s.round=6;for(const a of ['A','B']){s.players[a].time=10;s.players[a].growth=50;s.players[a].deck.push(...s.players[a].hand.splice(0));}s.history=[];return s;}
const take=(s,a,c)=>{const x=s.players[a].deck.find(id=>!s.players[a].hand.includes(id));s.players[a].deck.splice(s.players[a].deck.indexOf(x),1);s.cards[x].cardId=c;return x;};
const field=(s,a,c,slot='main')=>{const id=take(s,a,c);s.cards[id].generation++;if(slot==='companions')s.players[a].board.companions.push(id);else s.players[a].board[slot]=id;return id;};
const hand=(s,a,c)=>{const id=take(s,a,c);s.players[a].hand.push(id);return id;};
const discard=(s,a,c)=>{const id=take(s,a,c);s.players[a].discard.push(id);return id;};
const top=(s,a,c)=>{const id=take(s,a,c);s.players[a].deck.unshift(id);return id;};
const equip=(s,a,c,target)=>{const id=take(s,a,c);s.players[a].board.prepared.push({id,target,targetGeneration:s.cards[target].generation,attachedAt:0});return id;};
const acts=s=>e.legalActions(s);
const doIt=(s,a)=>{assert.ok(a,'action not legal');return e.act(s,e.actor(s),s.revision,a.id);};
function settle(s,pick=()=>null,limit=80){let g=0;while(s.phase!=='normal'||s.choice){assert.ok(g++<limit,'settle loop');if(s.phase==='finished')return s;const a=acts(s);const x=pick(s,a)??a.find(y=>y.kind==='skip')??a.find(y=>y.kind==='pass')??a.find(y=>y.kind==='choose'&&y.value!=='cancel'&&y.value!=='decline')??a[0];s=e.act(s,e.actor(s),s.revision,x.id);}return s;}
// A's lover at stage k with A's main; B has a main.
function lover(id,stage=3,{seat='A',main='M-dog-03'}={}){const s=fixture(seat);const m=field(s,seat,main);field(s,seat==='A'?'B':'A','M-dog-01');const p=field(s,seat,id,'partner');s.players[seat].relationship=stage;return {s,m,p};}
const marry=(s,pick)=>settle(doIt(s,acts(s).find(a=>a.kind==='relationship')),pick);
const v4rows=s=>acts(s).filter(a=>a.kind==='trigger'&&isV4(s,a));
const isV4=(s,a)=>{const st=s.pending?.[a.pending??-1]??s.pending?.find(r=>r.source===a.source);return !!(a.program?.v4??st?.program?.v4);};
const newMain=(s,a,c)=>{const old=s.players[a].board.main;if(old){s.players[a].discard.push(old);s.players[a].board.main=null;}return field(s,a,c);};
const pickTrig=src=>(s,a)=>a.find(x=>x.kind==='trigger'&&x.source===src)??null;
const triggerOf=(s,source)=>acts(s).filter(a=>a.kind==='trigger'&&a.source===source);
const takeTrigger=(pred)=>(s,a)=>a.find(x=>x.kind==='trigger'&&pred(x))??null;

test('18種類すべてに「♥ 結婚したら」の本文があり、既存本文は変えていない（タコ・ゆきだるまだけ読みやすい本文案）',async()=>{
 const off=JSON.parse(JSON.stringify((await import('../../full-catalog.mjs')).CATALOG));
 assert.equal(Object.keys(LOVERS).length,18);
 for(const id of Object.keys(LOVERS)){const c=e.CARDS[id];assert.ok(c.married,id);assert.doesNotMatch(c.married,/上の能力/,id);
  if(['P-rock_octopus','P-snowman'].includes(id))assert.notEqual(c.text,off[id].text);else assert.equal(c.text,off[id].text,id);}
 assert.equal(Object.values(e.CARDS).filter(c=>c.married).length,18,'恋人以外には付けない');
});

test('結婚時：+10が先、その後に結婚の能力（ワシ：1枚引く）。交際中は発動しない',()=>{
 let {s}=lover('P-high_eagle',2);s=marry(s);assert.equal(s.players.A.relationship,3);assert.equal(s.players.A.hand.length,0,'交際2→3では引かない');
 s.players.A.relationshipUsed=false;s=marry(s);assert.equal(s.players.A.relationship,4);assert.equal(s.players.A.growth,60);assert.equal(s.players.A.hand.length,1,'結婚した時に1枚');
 const g=s.history.findIndex(x=>x.kind==='growth'&&x.delta===10),ab=s.history.findIndex(x=>x.kind==='ability'&&x.v4);assert.ok(g>=0&&ab>g,'+10 の後に能力');
});

test('アンコウ：結婚した時、山札上4枚から「しんかい」を手札に（任意）',()=>{
 let {s}=lover('P-anglerfish');const deep=top(s,'A','W-deepsea');s=marry(s,(st,a)=>a.find(x=>x.kind==='choose'&&x.value===deep)??null);assert.ok(s.players.A.hand.includes(deep));
});

test('ねこ社長：結婚した時に1枚引き、このターン次の「あそび」の時−1（コネクトフォー 時2→1）',()=>{
 let {s}=lover('P-cat_ceo');const cf=hand(s,'A','G-crane-game-3d');assert.deepEqual(acts(s).filter(a=>a.source===cf).map(a=>a.cost),[2]);
 s=marry(s);assert.equal(s.players.A.hand.length,2);const after=acts(s).filter(a=>a.source===cf).map(a=>a.cost);assert.deepEqual(after,[1],JSON.stringify(after));
});

test('ヤギ：結婚後は、名前の異なるセカイへ変更した時に「1枚引く」も選べる（交際中は時−1だけ）',()=>{
 for(const married of [false,true]){let {s,p}=lover('P-cliff_goat',married?4:2);field(s,'A','W-sea','world');const w=hand(s,'A','W-snow');
  s=doIt(s,acts(s).find(a=>a.source===w&&a.kind==='place'));const rows=triggerOf(s,p);assert.equal(rows.length,married?2:1,'結婚後は「時−1」と「1枚引く」の2つから選べる');}
});

test('サソリ・クモ：結婚した時、捨て札の「あそび／あいてむ」・「みにつける」を手札に戻す',()=>{
 let {s}=lover('P-desert_scorpion');const g=discard(s,'A','G-connect-four');s=marry(s);assert.ok(s.players.A.hand.includes(g));
 ({s}=lover('P-knitting_spider'));const it=discard(s,'A','I-bowtie');s=marry(s);assert.ok(s.players.A.hand.includes(it));
});

test('うし：結婚後、終了時に見たカードを手札に加え、手札1枚を山札の一番下へ置ける',()=>{
 let {s}=lover('P-field_cow',4);s.players.A.startPartner=s.players.A.board.partner;s.players.A.startPartnerGeneration=s.cards[s.players.A.board.partner].generation;
 const x=hand(s,'A','G-real-fishing');const t1=top(s,'A','W-sea');
 s=doIt(s,acts(s).find(a=>a.kind==='pass'));s=settle(s,(st,a)=>takeTrigger(()=>true)(st,a)??a.find(y=>y.kind==='choose'&&y.value==='hand')??a.find(y=>y.kind==='choose'&&y.value===x)??null);
 assert.ok(s.players.A.hand.includes(t1),'見たカードが手札');assert.ok(!s.players.A.hand.includes(x)&&s.players.A.deck.at(-1)===x,'手札1枚を一番下');
});

test('クマ：結婚後は、相手の効果で手札に戻る時、装備1枚を捨てて防げる（交際中は防げない）',()=>{
 for(const married of [false,true]){let {s,p}=lover('P-forest_bear',married?4:2,{seat:'A'});const eq=equip(s,'A','I-bowtie',p);s.turn='B';const mis=hand(s,'B','E-misunderstanding');
  s=doIt(s,acts(s).find(a=>a.source===mis&&['play','programPlay'].includes(a.kind)));s=settle(s,(st,a)=>a.find(y=>y.kind==='choose'&&/置換を使う/.test(y.label??''))??null);
  assert.equal(s.players.A.board.partner===p,married);if(married){assert.equal(s.players.A.growth,50);assert.ok(s.players.A.discard.includes(eq));}else assert.equal(s.players.A.growth,45);}
});

test('ゴリラ：結婚後は手札を山札の下に置かずに発動できる',()=>{
 let {s,p}=lover('P-gentle_gorilla',4,{main:'M-dog-01'});newMain(s,'B','M-beetle-07');
 s=doIt(s,acts(s).find(a=>a.kind==='challenge'&&a.parameter==='power'));const rows=triggerOf(s,p);assert.ok(rows.some(a=>!/支払い/.test(a.label)),JSON.stringify(rows.map(a=>a.label)));
});

test('シカ：結婚した時にも発動でき、結婚中は手札1枚以下のターン開始時にも発動できる',()=>{
 let {s,p}=lover('P-grove_deer');s=doIt(s,acts(s).find(a=>a.kind==='relationship'));assert.ok(v4rows(s).some(a=>a.source===p));
 s=settle(s,pickTrig(p));const h=s.players.A.hand.length;assert.equal(h,1,'結婚した時に3枚見て1枚');
 s.players.A.deck.push(...s.players.A.hand.splice(0));s=settle(doIt(s,acts(s).find(a=>a.kind==='pass')));s=settle(doIt(s,acts(s).find(a=>a.kind==='pass')),pickTrig(p),200);
 // A の次のターン開始：手札は通常ドローで1枚 → 発動の機会がある（settle で選ばれて手札に加わる）
 assert.equal(s.turn,'A');assert.ok(s.history.some(x=>x.kind==='ability'&&x.v4&&x.source===p&&x.serial===s.serial),'開始時に発動');
});

test('サボテン：結婚中、装備なしならちから+1（装備すると消える）。ロボット：結婚中、自分のターンだけちえ+1',()=>{
 let {s,p}=lover('P-oasis_cactus',4);const base=e.stats(s,'A');s.players.A.relationship=3;assert.equal(e.stats(s,'A').power,base.power-1);s.players.A.relationship=4;
 equip(s,'A','I-bowtie',p);assert.equal(e.stats(s,'A').power,base.power-1);
 ({s}=lover('P-robot_neighbor',4));const own=e.stats(s,'A');s.turn='B';const opp=e.stats(s,'A');assert.equal(own.wisdom,opp.wisdom+1);assert.equal(own.power,opp.power);
});

test('タコ：結婚後は時0・なかまなしで付け替えられる（交際中はなかまと時1が要る）',()=>{
 for(const married of [false,true]){let {s,m,p}=lover('P-rock_octopus',married?4:2);equip(s,'A','I-bowtie',m);equip(s,'A','I-partner1',m);
  const a=acts(s).find(x=>x.kind==='programAbility'&&x.source===p);assert.equal(!!a,married);if(a)assert.equal(a.cost,0);}
});

test('にんぎょ：結婚後は1ターンに1回、セカイを出す時を1少なくできる',()=>{
 let {s}=lover('P-sea_mermaid',4);const w=hand(s,'A','W-sea');const costs=acts(s).filter(a=>a.source===w).map(a=>a.cost);assert.deepEqual(costs.sort(),[1,2]);
 ({s}=lover('P-sea_mermaid',3));const w2=hand(s,'A','W-sea');assert.deepEqual(acts(s).filter(a=>a.source===w2).map(a=>a.cost),[2]);
});

test('せいれい：結婚中、R10の自分のターン終了時にそだち+5（R9は何もしない）',()=>{
 for(const [round,gain] of [[9,0],[10,5]]){let {s}=lover('P-snow_spirit',4,{seat:'A'});s.round=round;s=settle(doIt(s,acts(s).find(a=>a.kind==='pass')));
  assert.equal(s.players.A.growth,50+gain,'R'+round);}
});

test('ゆきだるま：結婚中に離れた時だけ、さらに1枚引く。離婚は−10、結婚前は−5（共通ルールのまま）',()=>{
 for(const [stage,extra,loss] of [[2,0,5],[4,1,10]]){let {s,p}=lover('P-snowman',stage);s.turn='B';const mis=hand(s,'B','E-misunderstanding');
  s=doIt(s,acts(s).find(a=>a.source===mis&&['play','programPlay'].includes(a.kind)));s=settle(s,pickTrig(p));
  assert.equal(s.players.A.growth,50-loss);assert.equal(s.players.A.hand.length,1+1+extra,'戻ったこいびと＋1枚＋（結婚中なら）1枚');}
});

test('ひまわり：結婚後はときおくりでも発動。ワニ：結婚後は受けたちょうせんの引き分けでも1枚',()=>{
 let {s,p}=lover('P-sunflower_partner',4,{main:'M-dog-03'});const next=hand(s,'A','M-dog-04');s=doIt(s,acts(s).find(a=>a.source===next&&a.kind==='place'));assert.equal(triggerOf(s,p).length,1,'ときおくりで発動の機会');
 ({s,p}=lover('P-swamp_croc',4,{seat:'A'}));newMain(s,'B','M-dog-03');s.turn='B';
 s=doIt(s,acts(s).find(a=>a.kind==='challenge'&&a.parameter==='power'));s=settle(s,(st,a)=>takeTrigger(x=>x.source===p)(st,a));
 assert.ok(s.history.some(x=>x.kind==='ability'&&x.v4&&x.source===p),'引き分けで発動');
});

test('結婚後の別れ：こいびとの能力と結婚の能力を両方失う（ロボット）。再婚すると1回型はもう一度働く（ワシ）',()=>{
 let {s,p}=lover('P-robot_neighbor',4);const m4=e.stats(s,'A');s.turn='B';const mis=hand(s,'B','E-misunderstanding');s=settle(doIt(s,acts(s).find(a=>a.source===mis&&['play','programPlay'].includes(a.kind))));
 s.turn='A';const after=e.stats(s,'A');assert.equal(after.power,m4.power-1);assert.equal(after.wisdom,m4.wisdom-1);assert.equal(s.players.A.growth,40);
 ({s,p}=lover('P-high_eagle'));s=marry(s);assert.equal(s.players.A.hand.length,1);
 s.turn='B';const mis2=hand(s,'B','E-misunderstanding');s=settle(doIt(s,acts(s).find(a=>a.source===mis2&&['play','programPlay'].includes(a.kind))));assert.ok(s.players.A.hand.includes(p));
 s.turn='A';s.players.A.personUsed=false;s.players.A.relationshipUsed=false;s=settle(doIt(s,acts(s).find(a=>a.source===p&&a.kind==='place')));s.players.A.relationship=3;const h=s.players.A.hand.length;s=marry(s);assert.equal(s.players.A.hand.length,h+1,'再婚でもう一度');
});

test('たまご中（メインなし）は結婚の能力も止まる',()=>{
 let {s,p}=lover('P-robot_neighbor',4);s.players.A.board.main=null;assert.equal(e.stats(s,'A'),null);
 ({s,p}=lover('P-sea_mermaid',4));s.players.A.board.main=null;const w=hand(s,'A','W-sea');assert.ok(acts(s).filter(a=>a.source===w).every(a=>a.cost===2));
});

test('表示：二段の本文、結婚の解放・発動・別れの通知',()=>{
 let {s,p}=lover('P-high_eagle');const html=ui.cardMarkup({...e.CARDS['P-high_eagle'],id:p});assert.match(html,/こいびとのとき/);assert.match(html,/♥ 結婚したら/);assert.match(html,/lover-two/);
 const before=s;const after=marry(s);const g=captureResult(before,after).public;assert.ok(g.rows.some(r=>r.kind==='marriage'&&/使えるようになった/.test(r.text)));assert.ok(g.rows.some(r=>r.kind==='lover4'));
 let x=after;x.turn='B';const mis=hand(x,'B','E-misunderstanding');const y=settle(doIt(x,acts(x).find(a=>a.source===mis&&['play','programPlay'].includes(a.kind))));
 const b=captureResult(x,y).public.rows.find(r=>r.kind==='breakup');assert.match(b.text,/結婚の能力を失った/);
});

// 実際のCPU対戦（相手にすれちがい2枚、恋人デッキの恋人を全種類へ順に入れ替え）：完走・保存復帰で一致・無限ループなし。
function cpuMatch(seed,loverId,difficulty='intermediate'){const S='E-misunderstanding';let n=0;
 const swap=['P-grove_deer','P-high_eagle'].includes(loverId)?null:'P-grove_deer';
 const A=CPU_DECKS.find(d=>d.id==='partner').cards.map(id=>id===swap?loverId:id);
 const B=CPU_DECKS.find(d=>d.id==='challenge').cards.map(id=>id==='E-mirror'&&n<2?(n++,S):id);
 let s=e.createGame(seed,{A,B});const adv=()=>{s=advanceResponses(s).state;};adv();
 for(let i=0;s.phase!=='finished';i++){assert.ok(i<6000,'step limit');const a=e.actor(s),o=observeCpu(s,a),d=chooseCpuAction(o,{difficulty,seed:seed+(a==='A'?0:7),step:i});s=e.act(s,a,s.revision,d.id);adv();}return s;}
test('CPU対戦：18種類それぞれで完走し、保存→復帰で一致する（初級・中級）',()=>{
 let fired=0,ids=Object.keys(LOVERS);ids.forEach((id,i)=>{for(const difficulty of ['beginner','intermediate']){const s=cpuMatch(100+i,id,difficulty);assert.equal(s.phase,'finished');
  const back=e.restore(e.save(s));assert.deepEqual(back.players,s.players);assert.equal(e.save(back),e.save(s));assert.equal(JSON.parse(e.save(s)).version,'hotseat-7-lover4');
  fired+=s.history.filter(x=>x.kind==='ability'&&x.v4).length;for(const a of ['A','B'])assert.ok(s.players[a].hand.length<40);}});
 assert.ok(fired>0,'結婚の能力が実際に発動した');
});
