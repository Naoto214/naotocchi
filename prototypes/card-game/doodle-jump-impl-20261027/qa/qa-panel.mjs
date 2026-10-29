// 本人QA用パネル（試遊版だけに入る。正式ランタイム・Pagesには含めない）。固定局面は tests/doodle-jump.test.mjs と同じ作り方。
import * as e from './engine.mjs';import {CATALOG} from './full-catalog.mjs';import {CARD_ART} from './ui-art.mjs';
import {observeCpu} from './cpu-observation.mjs';import {chooseCpuAction} from './cpu-policy.mjs';import {DeckLibrary} from './my-decks.mjs';
const DJ='G-doodle-jump',OLD='このターン、自分が次にときおくりを行った時に1枚引き、その次にときおくりを行った時に自分のそだち+5。';
const SAVES=__SAVES__;
const $=id=>document.getElementById(id),log=$('dj-log');
const esc=t=>String(t).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'})[c]);
const line=(text,ok)=>{const li=document.createElement('li');li.innerHTML=esc(text)+(ok===undefined?'':ok?' <span class="dj-ok">OK</span>':' <span class="dj-ng">NG</span>');log.append(li);};
{const c=CATALOG[DJ];$('dj-card').innerHTML=`<img src="${esc(CARD_ART[DJ].small)}" alt="${esc(c.name)}"><div><p><strong>${esc(c.name)}</strong>（あそび・時${c.cost}・すぐつかう）</p><p>新：${esc(c.text)}</p><p class="dj-old">旧：${esc(OLD)}</p><p class="dj-note">新規対戦の版：${esc(e.VERSION)}／旧保存の版：hotseat-2</p></div>`;}
function fixture(version){const s=version?e.createGame(71,undefined,version):e.createGame(71);s.choice=null;s.pending=[];s.phase='normal';s.window='normal';s.players.A.time=10;s.players.B.time=10;return s;}
function take(s,c){const x=s.players.A.deck.shift();s.cards[x].cardId=c;return x;}
function setup(version,main,to){const s=fixture(version);const m=take(s,main);s.cards[m].generation++;s.players.A.board.main=m;s.players.A.hand.push(take(s,DJ));const t=to.map(c=>{const id=take(s,c);s.players.A.hand.push(id);return id;});s.players.A.personUsed=true;return {s,t};}
function settle(s){let g=0;while(s.phase!=='normal'&&s.phase!=='finished'&&g++<60){const a=e.legalActions(s);const x=a.find(q=>q.kind==='skip')??a.find(q=>q.kind==='pass')??a.find(q=>q.kind==='choose')??a[0];s=e.act(s,e.actor(s),s.revision,x.id);}return s;}
const doAct=(s,pred)=>settle(e.act(s,e.actor(s),s.revision,e.legalActions(s).find(pred).id));
const play=s=>doAct(s,a=>a.kind==='programPlay'&&s.cards[a.source]?.cardId===DJ);
const skip=(s,id)=>doAct(s,a=>a.kind==='place'&&a.variant==='time_skip'&&a.source===id);
const state=(s,label)=>`${label}：手札${s.players.A.hand.length}枚・そだち${s.players.A.growth}`;
const name=id=>CATALOG[id].name;
function cpu(s){const o=observeCpu(s,'A'),d=chooseCpuAction(o),a=o.actions.find(x=>x.id===d.id);return a.card?.cardId===DJ?'ぴょんぴょんジャンプを使う':a.kind==='place'&&a.variant==='time_skip'?'先にときおくりする':a.kind==='pass'?'何もしない（ターン終了）':a.card?a.card.name+'を使う':a.kind;}
const RUN={
 single(){let {s,t:[two]}=setup(null,'M-dog-01',['M-dog-02']);s=play(s);line(state(s,'使用後'));const g=s.players.A.growth,h=s.players.A.hand.length;s=skip(s,two);line(state(s,`${name('M-dog-01')}→${name('M-dog-02')}（1段階）`),s.players.A.growth===g+5&&s.players.A.hand.length===h);},
 multi(){let {s,t:[three]}=setup(null,'M-dog-01',['M-dog-03']);s=play(s);line(state(s,'使用後'));const g=s.players.A.growth,h=s.players.A.hand.length;s=skip(s,three);line(state(s,`${name('M-dog-01')}→${name('M-dog-03')}（2段階）：1枚だけ`),s.players.A.growth===g&&s.players.A.hand.length===h);},
 none(){let {s}=setup(null,'M-dog-01',['M-dog-02']);s=play(s);const g=s.players.A.growth;s=settle(e.act(s,'A',s.revision,e.legalActions(s).find(a=>a.kind==='pass').id));const left=s.effects.some(r=>r.kind==='reservation'&&r.actor==='A');line(`ターン終了：予約${left?'残る':'失効'}・そだち${s.players.A.growth}`,!left&&s.players.A.growth===g);},
 twice(){let {s,t:[two,three]}=setup(null,'M-dog-01',['M-dog-02','M-dog-03']);s=play(s);s=skip(s,two);line(state(s,'1回目（1段階）'));const g=s.players.A.growth,h=s.players.A.hand.length;s=skip(s,three);line(state(s,'2回目：何も起きない'),s.players.A.growth===g&&s.players.A.hand.length===h-1);},
 legacy(){let {s,t:[two,three]}=setup('hotseat-2','M-dog-01',['M-dog-02','M-dog-03']);s=play(s);const g=s.players.A.growth;s=skip(s,two);line(state(s,'hotseat-2 1回目：1枚・+5なし'),s.players.A.growth===g);s=skip(s,three);line(state(s,'hotseat-2 2回目：+5'),s.players.A.growth===g+5);},
 'cpu-cannot'(){const {s}=setup(null,'M-dog-01',['M-beetle-01']);const r=cpu(s);line('ときおくりできない局面のCPU：'+r,!r.startsWith('ぴょん'));},
 'cpu-short'(){const {s}=setup(null,'M-dog-01',['M-dog-02']);s.players.A.time=1;const r=cpu(s);line('時1（使うとときおくりの時が残らない）のCPU：'+r,!r.startsWith('ぴょん'));},
 'cpu-can'(){const {s}=setup(null,'M-dog-01',['M-dog-02']);s.players.A.time=2;const r=cpu(s);line('時2（使った後に1段階のときおくりができる）のCPU：'+r,r.startsWith('ぴょん'));},
 'cpu-discount'(){const {s}=setup(null,'M-beetle-04','M-beetle-05'.split(','));s.players.A.time=1;const r=cpu(s);line('カブトムシ④（ときおくり−1）・時1のCPU：'+r,r.startsWith('ぴょん'));},
 saves(){for(const r of SAVES.rows){const s=e.restore(JSON.stringify(r.save));line(`${r.case}：版 ${s.version}・${s.revision}手・そだち A${s.players.A.growth}／B${s.players.B.growth}`,s.version==='hotseat-2'&&s.revision===r.finalRevision&&JSON.stringify(s.result)===JSON.stringify(r.result)&&e.save(s)===JSON.stringify(r.save));}},
 deck(){const x=spec=>Object.entries(spec).flatMap(([id,n])=>Array(n).fill(id));
  const cards=x({'M-dog-01':3,'M-dog-02':3,'M-dog-03':3,'M-dog-04':3,'M-dog-05':2,'M-dog-06':1,'M-beetle-01':3,'M-beetle-02':3,'M-beetle-03':2,'G-doodle-jump':3,'E-mirror':3,'C-shiba':3,'W-snow':2,'I-c_coin2':3,'G-sugoroku-race':3});
  try{const lib=new DeckLibrary(localStorage);const d=lib.create('ぴょんぴょんジャンプ確認',cards);lib.select('A',d.id);lib.save();line('マイデッキに「ぴょんぴょんジャンプ確認」を追加しました（自分の席Aに選択）。画面を再読み込みしてから対戦の準備へ進んでください。',true);}
  catch(err){line('追加できませんでした：'+err.message,false);}},
};
for(const b of document.querySelectorAll('[data-dj]'))b.addEventListener('click',()=>{log.replaceChildren();try{RUN[b.dataset.dj]();}catch(err){line('エラー：'+err.message,false);}});
