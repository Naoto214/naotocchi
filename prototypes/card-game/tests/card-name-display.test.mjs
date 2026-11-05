// カード名の表示（中央揃え・自然な改行）と、すれちがい説明・旧保存の表示の回帰テスト。
// 表示専用：正式カード名・本文・効果は変えない。ブラウザでの実測は evidence 側の監査で行う。
import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import * as e from '../engine.mjs';
import {CARDS} from '../engine.mjs';
import {CATALOG} from '../full-catalog.mjs';
import {cardMarkup,detailMarkup} from '../ui-presentation.mjs';
import {TITLE_BREAKS,titleLayout,baseTitleSize} from '../card-title-lines.mjs';
import {HotseatSession} from '../ui-session.mjs';
import {visibleCards} from '../ui-context.mjs';
import {marriedText,LOVER_MARRIED} from '../lover-married.mjs';
import {CHAPTERS,relatedChapter} from '../rulebook-content.mjs';

const nonMain=Object.values(CARDS).filter(c=>c.type!=='main');
const titleOf=html=>html.match(/<strong class="card-title">([\s\S]*?)<\/strong>/)[1];
const segs=html=>[...titleOf(html).matchAll(/<span class="title-seg">([^<]*)<\/span>/g)].map(m=>m[1]);
const unescape=s=>s.replaceAll('&amp;','&');

test('全452枚：正式カード名は変えず、改行文字を持たない。改行表は実在する名前だけ',()=>{
 assert.equal(Object.keys(CARDS).length,452);
 for(const c of Object.values(CARDS)){assert.equal(c.name,CATALOG[c.id].name,c.id);assert.doesNotMatch(c.name,/[\n|]/,c.id);}
 const names=new Set(nonMain.map(c=>c.name));
 for(const [name,lines] of TITLE_BREAKS){assert.ok(names.has(name),name);assert.equal(lines.length,2,name);assert.equal(lines.join(''),name);}
});

test('メイン以外の名前：表示の文字列は正式名のまま、区切りは最大1か所（最大2行）',()=>{
 for(const c of nonMain)for(const opts of [{},{compact:true},{detail:true}]){
  const html=cardMarkup(c,opts),s=segs(html).map(unescape);
  assert.ok(s.length===1||s.length===2,c.id);
  assert.equal(s.join(''),c.name,c.id);
  assert.equal(unescape(titleOf(html).replace(/<[^>]*>/g,'')),c.name,c.id);
  assert.equal((titleOf(html).match(/<wbr>/g)??[]).length,s.length-1,c.id);
 }
});

test('文字サイズ：1行に収まる名前は従来どおり。縮小は必要な場合だけで、2行は1〜2文字を孤立させない',()=>{
 for(const c of nonMain){const t=titleLayout(c.name),base=baseTitleSize(c.name);
  for(const v of [t.full,t.compact]){
   assert.ok(v.lines===1||v.lines===2,c.id);assert.ok(v.size<=base,c.id);assert.ok(v.size>=base*.6,c.id+' too small');
   if(v.lines===2)assert.ok(t.segments.every(s=>[...s].length>=3),c.id+' orphan');
  }
  if([...c.name].length<=6)assert.deepEqual([t.compact.size,t.full.size],[base,base],c.id);
  if([...c.name].length<=10&&!/[A-Za-z0-9]/.test(c.name))assert.deepEqual([t.full.lines,t.full.size],[1,base],c.id+' full keeps one line');
 }
});

test('実機で報告された名前：自然な位置で改行、オアシスは詳細で1行',()=>{
 const full=n=>{const t=titleLayout(n);return t.full.lines===2?t.segments:[n];};
 assert.deepEqual(full('どこにもつながらないかいだん'),['どこにもつながらない','かいだん']);
 assert.deepEqual(full('とくべつなたびのおもいで'),['とくべつなたびの','おもいで']);
 assert.deepEqual(full('あみものがすきなクモさん'),['あみものがすきな','クモさん']);
 assert.deepEqual(full('オアシスのサボテンさん'),['オアシスのサボテンさん']);
 assert.equal(titleLayout('どこにもつながらないかいだん').full.size,5.8,'14文字の従来サイズを維持');
 assert.equal(titleLayout('とくべつなたびのおもいで').full.size,6.8);
});

test('カードの画像・本文・時コストのマークアップは名前以外変わらない',()=>{
 for(const c of nonMain){const html=cardMarkup(c,{detail:true});
  assert.match(html,new RegExp(`aria-label="通常時コスト ${c.cost}"`),c.id);
  if(!marriedText(c.id))assert.ok(html.includes(`<p>${c.text.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;')}</p>`),c.id);
 }
});

// ---- すれちがい：交際中・結婚後のどちらにも使える（正式エンジンの挙動）----
function fixture(version){const s=e.createGame(41,undefined,version);s.choice=null;s.pending=[];s.phase='normal';s.window='normal';s.turn='B';s.round=6;for(const a of ['A','B']){s.players[a].time=10;s.players[a].growth=50;s.players[a].deck.push(...s.players[a].hand.splice(0));}s.history=[];return s;}
const take=(s,a,c)=>{const x=s.players[a].deck.find(id=>!s.players[a].hand.includes(id));s.players[a].deck.splice(s.players[a].deck.indexOf(x),1);s.cards[x].cardId=c;return x;};
const field=(s,a,c,slot)=>{const id=take(s,a,c);s.cards[id].generation++;s.players[a].board[slot]=id;return id;};
function settle(s){let g=0;while(s.phase!=='normal'||s.choice){assert.ok(g++<80);const a=e.legalActions(s);const x=(s.choice?.kind==='replacement'?a.find(y=>y.value==='decline'):null)??a.find(y=>y.kind==='skip')??a.find(y=>y.kind==='pass')??a.find(y=>y.kind==='choose'&&y.value!=='cancel'&&y.value!=='decline')??a[0];s=e.act(s,e.actor(s),s.revision,x.id);}return s;}
function misunderstanding(stage,lover='P-oasis_cactus',version){
 let s=fixture(version);field(s,'A','M-dog-03','main');field(s,'B','M-dog-01','main');const p=field(s,'A',lover,'partner');s.players.A.relationship=stage;
 const before=e.stats(s,'A');const mis=take(s,'B','E-misunderstanding');s.players.B.hand.push(mis);
 const play=e.legalActions(s).find(a=>a.source===mis&&['play','programPlay'].includes(a.kind));assert.ok(play,'stage '+stage+' すれちがいを使える');
 s=settle(e.act(s,'B',s.revision,play.id));return {s,p,before};
}
test('すれちがい：交際0〜3のこいびとにも使え、手札に戻ってそだち−5',()=>{
 for(const stage of [0,1,2,3]){const {s,p}=misunderstanding(stage);
  assert.ok(s.players.A.hand.includes(p),'持ち主の手札へ');assert.equal(s.players.A.board.partner,null);assert.equal(s.players.A.relationship,null);
  assert.equal(s.players.A.growth,45,'stage '+stage);assert.equal(s.history.find(x=>x.kind==='breakup').penalty,5);}
});
test('すれちがい：結婚後のこいびとにも使え、そだち−10で「♥ 結婚したら」も失う（hotseat-8）',()=>{
 const {s,p,before}=misunderstanding(4);
 assert.ok(s.players.A.hand.includes(p));assert.equal(s.players.A.growth,40);assert.equal(s.history.find(x=>x.kind==='breakup').married,true);
 // サボテンさんの結婚の能力（装備なしでメインのちから+1）が消える。
 const after=e.stats(s,'A');assert.equal(after.power,before.power-1);
 assert.equal(e.VERSION,'hotseat-8');
});
test('すれちがいの正式本文は変えていない。ルールブック第9章・よくある質問に説明があり、関連ルールは第9章',()=>{
 assert.equal(CARDS['E-misunderstanding'].text,'相手のこいびと1枚を対象として発動できる。対象を持ち主の手札に戻す。');
 assert.equal(CARDS['E-misunderstanding'].text,CATALOG['E-misunderstanding'].text);
 const ch9=CHAPTERS.find(c=>c.id===9).details.join('\n'),ch15=CHAPTERS.find(c=>c.id===15).details.join('\n');
 assert.match(ch9,/「すれちがい」は、交際中・結婚後のどちらのこいびとカードにも使えます。結婚前に別れると、そだち−5。結婚後に別れると、そだち−10。結婚後の別れでは、結婚後追加能力/);
 assert.match(ch15,/結婚したこいびとにも「すれちがい」は使える/);
 assert.equal(relatedChapter(CARDS['E-misunderstanding']),9);
 assert.equal(relatedChapter({...CARDS['E-misunderstanding'],id:'x1',cardId:'E-misunderstanding'}),9);
 assert.equal(relatedChapter(CARDS['E-first_date']??{type:'event'}),11);
});

// ---- 旧保存（hotseat-7 以前）では「♥ 結婚したら」を表示しない ----
function sessionWithLover(version){const s=fixture(version);s.turn='A';field(s,'A','M-dog-03','main');field(s,'A','P-oasis_cactus','partner');s.players.A.relationship=4;const ui=new HotseatSession();ui.start(s);ui.reveal();return ui;}
const loverCards=v=>visibleCards(v).filter(c=>!c.hidden&&LOVER_MARRIED[c.cardId]);
test('hotseat-8 の対戦：こいびとカードに「♥ 結婚したら」を表示する',()=>{
 const v=sessionWithLover('hotseat-8').projection,c=loverCards(v)[0];assert.ok(c);assert.ok(!c.legacyRules);
 assert.match(cardMarkup(c,{detail:true}),/♥ 結婚したら/);assert.match(detailMarkup(c,{v,viewer:'A',readOnly:true}),/<h3>♥ 結婚したら<\/h3>/);
});
test('hotseat-7 の対戦：「♥ 結婚したら」を出さず、前のルールで続いていることを詳細で示す',()=>{
 const v=sessionWithLover('hotseat-7').projection,c=loverCards(v)[0];assert.ok(c);assert.equal(c.legacyRules,true);
 const face=cardMarkup(c,{detail:true}),detail=detailMarkup(c,{v,viewer:'A',readOnly:true});
 assert.doesNotMatch(face,/結婚したら|lover-married/);assert.match(face,new RegExp(c.text.slice(0,12)));
 assert.doesNotMatch(detail,/<h3>♥ 結婚したら<\/h3>/);assert.match(detail,/前のルール/);assert.ok(!detail.includes(marriedText(c.cardId)));
});
test('旧保存の実データ（hotseat-7、20件）：再生結果は変えず、見えるこいびとは全て旧ルール表示',()=>{
 const F=JSON.parse(fs.readFileSync(new URL('./fixtures/hotseat7-saves.json',import.meta.url),'utf8'));let lovers=0;
 for(const g of F.games){const ui=new HotseatSession();ui.restore(g.save);assert.equal(ui.save(),g.save,g.lover);
  for(const seat of [null,'A','B']){ui.viewer=seat;const v=ui.projection;for(const c of loverCards(v)){lovers++;assert.equal(c.legacyRules,true);assert.doesNotMatch(cardMarkup(c,{detail:true}),/結婚したら/);}}}
 assert.ok(lovers>0);
});
test('カードコレクション（図鑑）は対戦の版によらず正式な最新カードを表示する',()=>{
 for(const id of Object.keys(LOVER_MARRIED)){assert.match(cardMarkup(CARDS[id],{detail:true}),/♥ 結婚したら/,id);assert.match(detailMarkup(CARDS[id],{catalog:true}),/<h3>♥ 結婚したら<\/h3>/,id);}
});
