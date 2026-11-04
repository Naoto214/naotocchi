// VERSION 4 rule checks (PLAN-V4.md): the 7 new cards, their links with IX–XII, and U12 (existing replacement effects on a
// countered time card). Same method as smoke-time.mjs: positions are made by editing a fresh game state (test only), then the
// engine's own legalActions/act run them. Build: build/T-4v.
// Usage: node lib/smoke-v4.mjs > evidence/smoke-v4.txt
import {dirname,join} from 'node:path';import {fileURLToPath,pathToFileURL} from 'node:url';
import {BASE_DECKS,slotsK} from './decks-life.mjs';
const HERE=dirname(fileURLToPath(import.meta.url)),BUILD=join(HERE,'..','build');
const e=await import(pathToFileURL(join(BUILD,'T-4v','engine.mjs')).href);
let fails=0;const ok=(name,cond,info='')=>{console.log(`${cond?'PASS':'FAIL'} ${name}${info?' — '+info:''}`);if(!cond)fails++;};
const T=n=>'X-T-'+n,N=n=>'X-N-'+n;
// Test deck: balance with 2 of each time card and 2 of each new card in the experiment's slots.
const base=BASE_DECKS.balance.cards,fill=[...['IX','X','XI','XII'].flatMap(n=>[T(n),T(n)]),...['hayajimai','nagaiki','tsuru','photo','machibuse','omiyage','chotto'].flatMap(n=>[N(n),N(n)])];
const deck=[...base];slotsK(base,fill.length).forEach((x,k)=>{deck[x.index]=fill[k];});
function give(s,a,cardId){const p=s.players[a];const held=p.hand.find(x=>s.cards[x].cardId===cardId);if(held)return held;const id=[...p.deck,...p.discard].find(x=>s.cards[x].cardId===cardId&&!p.hand.includes(x));if(!id)throw Error('no '+cardId);p.deck=p.deck.filter(x=>x!==id);p.discard=p.discard.filter(x=>x!==id);p.hand.push(id);return id;}
function fromDeck(s,a,cardId){const p=s.players[a];let id=p.deck.find(x=>s.cards[x].cardId===cardId)??p.hand.find(x=>s.cards[x].cardId===cardId);if(!id){id=p.deck.find(x=>/^(E-mirror|G-ski-jump|G-baseball-batting|G-mini-golf-physics|E-new-encounter|C-|P-|W-)/.test(s.cards[x].cardId))??p.deck.find(x=>!/^X-|^M-|^I-/.test(s.cards[x].cardId));s.cards[id].cardId=cardId;}p.deck=p.deck.filter(x=>x!==id);p.hand=p.hand.filter(x=>x!==id);return id;}
const pick=s=>{const acts=e.legalActions(s);return acts.find(x=>['pass','skip'].includes(x.kind))??acts[0];};
const step=s=>e.act(s,e.actor(s),s.revision,pick(s).id);
function settle(s){for(let n=0;n<50;n++){if(s.phase==='trigger'){const t=e.legalActions(s).find(x=>x.kind==='trigger'&&x.mandatory!==false);if(t){s=e.act(s,e.actor(s),s.revision,t.id);continue;}}return s;}return s;}
function passAll(s){for(let n=0;n<80&&!(s.phase==='normal'&&!s.chain.length)&&s.phase!=='finished';n++)s=settle(step(s));return s;}
async function at(round,turn='A'){let s=e.createGame(7,{A:deck,B:deck});while(!(s.round===round&&s.turn===turn&&s.phase==='normal'&&!s.choice))s=step(s);s=structuredClone(s);s.players.A.time=s.players.B.time=12;return s;}
const acts=(s,cardId,kinds=['play','programPlay'])=>e.legalActions(s).filter(x=>kinds.includes(x.kind)&&s.cards[x.source]?.cardId===cardId);
const timeOffers=(s,name,counter=false)=>e.legalActions(s).filter(x=>x.kind==='place'&&x.slot==='world'&&s.cards[x.source].cardId===T(name)&&!!x.counter===counter);
function playTime(s,name,counter=false,filter=()=>true){const a=timeOffers(s,name,counter).filter(filter)[0];if(!a)throw Error('cannot play '+name);return settle(e.act(s,e.actor(s),s.revision,a.id));}
function use(s,cardId,choose=()=>true){const a=acts(s,cardId).filter(choose)[0];if(!a)throw Error('cannot use '+cardId);return passAll(settle(e.act(s,e.actor(s),s.revision,a.id)));}
function setTrap(s,cardId){const a=e.legalActions(s).find(x=>x.kind==='place'&&x.slot==='prepared'&&s.cards[x.source]?.cardId===cardId);if(!a)throw Error('cannot set '+cardId);return passAll(settle(e.act(s,e.actor(s),s.revision,a.id)));}
const growth=(s,A,B)=>{s.players.A.growth=A;s.players.B.growth=B;s.players.A.reached=s.players.B.reached=null;};
const loc=(s,a,id)=>{const p=s.players[a];return p.board.world===id?'world':p.discard.includes(id)?'discard':p.deck.at(-1)===id?'deckBottom':p.deck.includes(id)?'deck':p.hand.includes(id)?'hand':'other';};

// ---- はやじまい ----
{let s=await at(8);give(s,'A',T('IX'));give(s,'A',N('hayajimai'));growth(s,40,55);
 ok('はやじまい：終了ラウンドがまだ10（残り2）では出せない',acts(s,N('hayajimai')).length===0);
 s=passAll(playTime(s,'IX'));ok('R8 に IX → 終了ラウンド9（残り1）',s.life.final===9);
 s=use(s,N('hayajimai'));ok('負けていて終了ラウンド9：そだち+15',s.players.A.growth===55,`A=${s.players.A.growth}`);
 give(s,'A',N('hayajimai'));growth(s,40,55);ok('はやじまい：1ターンに1回（2枚目は出せない）',acts(s,N('hayajimai')).length===0);}
{let s=await at(8);s.life.final=9;give(s,'A',N('hayajimai'));growth(s,60,55);ok('はやじまい：勝っている時は出せない',acts(s,N('hayajimai')).length===0);}
{let s=await at(9);give(s,'A',N('hayajimai'));growth(s,40,55);s=use(s,N('hayajimai'));ok('R9・終了ラウンド10：+10',s.players.A.growth===50);}
{let s=await at(10);s.life.final=11;give(s,'A',N('hayajimai'));growth(s,40,55);s=use(s,N('hayajimai'));ok('R10・終了ラウンド11：+5',s.players.A.growth===45);}
// ---- ながいきのひけつ（本人の最新決定：両者が使える。終了ラウンド11以上かつ劣勢なら+15、劣勢は解決直前に判定）----
{let s=await at(9);give(s,'A',N('nagaiki'));growth(s,40,55);s=use(s,N('nagaiki'));ok('終了ラウンド10：+5 だけ',s.players.A.growth===45);}
{let s=await at(9);s.life.final=11;give(s,'A',N('nagaiki'));growth(s,40,55);s=use(s,N('nagaiki'));ok('R9・終了ラウンド11・負けている：+15（現在R9でも対象）',s.players.A.growth===55);}
{let s=await at(9);s.life.final=12;give(s,'A',N('nagaiki'));growth(s,55,40);s=use(s,N('nagaiki'));ok('終了ラウンド12でも勝っていれば +5',s.players.A.growth===60);}
{let s=await at(9);s.life.final=11;give(s,'A',N('nagaiki'));growth(s,50,55);s=use(s,N('nagaiki'));ok('劣勢は解決直前に判定（50対55 → +15。+5 の前に判定）',s.players.A.growth===65,`A=${s.players.A.growth}`);}
{let s=await at(9);s.life.final=11;give(s,'A',N('nagaiki'));growth(s,55,55);s=use(s,N('nagaiki'));ok('同点は劣勢ではない：+5',s.players.A.growth===60);}
{let s=await at(9,'B');give(s,'B',T('XI'));s=passAll(playTime(s,'XI'));while(!(s.turn==='A'&&s.phase==='normal'))s=passAll(settle(step(s)));give(s,'A',N('nagaiki'));growth(s,40,55);s=use(s,N('nagaiki'));
 ok('相手（B）の XI で延びても、A が使えば +15（どちらが延ばしたかは問わない）',s.life.final===11&&s.players.A.growth===55,`final=${s.life.final} A=${s.players.A.growth}`);}
// ---- おいわいのつる ----
{let s=await at(10);const id=give(s,'A',N('tsuru'));const pl=e.legalActions(s).find(x=>x.kind==='place'&&x.slot==='companions'&&x.source===id);s=passAll(settle(e.act(s,'A',s.revision,pl.id)));growth(s,50,60);
 while(!(s.phase==='trigger'||s.turn==='B'))s=step(s);const t=e.legalActions(s).find(x=>x.kind==='trigger'&&s.cards[x.source]?.cardId===N('tsuru'));ok('R10・負けている：ターン終了時に発動できる',!!t);
 if(t){s=passAll(settle(e.act(s,e.actor(s),s.revision,t.id)));ok('おいわいのつる：+5',s.players.A.growth===55,`A=${s.players.A.growth}`);}}
{let s=await at(9);const id=give(s,'A',N('tsuru'));const pl=e.legalActions(s).find(x=>x.kind==='place'&&x.slot==='companions'&&x.source===id);s=passAll(settle(e.act(s,'A',s.revision,pl.id)));growth(s,50,60);
 let seen=false;for(let n=0;n<40&&s.turn==='A';n++){if(e.legalActions(s).some(x=>x.kind==='trigger'&&s.cards[x.source]?.cardId===N('tsuru')))seen=true;s=step(s);}ok('R9 では発動しない',!seen);}
// ---- おもいでのしゃしん ----
{let s=await at(10);give(s,'A',N('photo'));ok('終了ラウンドのラウンド（R10）でだけ出せる',acts(s,N('photo')).length>0);
 const b=s.players.A.board;b.companions=[fromDeck(s,'A','C-owl')];b.partner=fromDeck(s,'A','P-grove_deer');b.world=fromDeck(s,'A','W-countryside');growth(s,40,40);s=use(s,N('photo'));
 ok('なかま・こいびと・セカイの3枚：+15',s.players.A.growth===55,`A=${s.players.A.growth}`);}
{let s=await at(10);give(s,'A',N('photo'));const b=s.players.A.board;b.companions=[fromDeck(s,'A','C-owl')];b.world=fromDeck(s,'A',T('X'));growth(s,40,40);s=use(s,N('photo'));
 ok('時のカードのセカイは数えない（なかま1枚で+5）',s.players.A.growth===45,`A=${s.players.A.growth}`);}
{let s=await at(9);give(s,'A',N('photo'));ok('終了ラウンドでないラウンド（R9）は出せない',acts(s,N('photo')).length===0);s.life.final=9;ok('IX で終了ラウンド9なら R9 に出せる',acts(s,N('photo')).length>0);}
// ---- まちぶせどけい ----
{let s=await at(8);give(s,'A',N('machibuse'));give(s,'A',T('XII'));s=setTrap(s,N('machibuse'));
 while(!(s.turn==='B'&&s.phase==='normal'))s=passAll(settle(step(s)));give(s,'B',T('IX'));s.players.B.time=8;s=playTime(s,'IX');while(e.actor(s)!=='A')s=step(s);
 s.players.A.time=0;const amb=timeOffers(s,'XII',true).find(x=>x.ambush);ok('伏せたまちぶせどけい：時0でもカウンターできる（時2−2）',!!amb&&amb.cost===0&&!timeOffers(s,'XII',true).some(x=>!x.ambush&&x.cost<=0),amb?.label);
 const hand=s.players.A.hand.length;s=passAll(playTime(s,'XII',true,x=>x.ambush));
 ok('まちぶせどけいは捨て札、1枚引く、XII が成立',s.players.A.discard.some(x=>s.cards[x].cardId===N('machibuse'))&&s.players.A.hand.length===hand&&s.life.final===12,`hand ${hand}→${s.players.A.hand.length} final=${s.life.final}`);}
{let s=await at(8);give(s,'A',T('XII'));while(!(s.turn==='B'&&s.phase==='normal'))s=passAll(settle(step(s)));give(s,'B',T('IX'));s.players.B.time=8;s=playTime(s,'IX');while(e.actor(s)!=='A')s=step(s);
 ok('まちぶせどけいがなければ通常のカウンターだけ',timeOffers(s,'XII',true).length===1&&!timeOffers(s,'XII',true)[0].ambush);}
// ---- いなかのおみやげ ----
{let s=await at(6);const w=fromDeck(s,'A','W-countryside'),t=fromDeck(s,'A',T('IX'));s.players.A.discard.push(w,t);give(s,'A',N('omiyage'));
 ok('対象は時のカード以外のセカイだけ',acts(s,N('omiyage')).every(x=>x.target!==t)&&acts(s,N('omiyage')).some(x=>x.target===w));
 const h=s.players.A.hand.length;s=use(s,N('omiyage'),x=>x.target===w);ok('いなかを手札に戻す（時のカードを出していないターンは引かない）',s.players.A.hand.includes(w)&&s.players.A.hand.length===h,`hand ${h}→${s.players.A.hand.length}`);}
{let s=await at(6);const w=fromDeck(s,'A','W-countryside');s.players.A.board.world=w;give(s,'A',T('XII'));give(s,'A',N('omiyage'));s=passAll(playTime(s,'XII'));
 ok('時のカードで置き換えたいなかは捨て札',s.players.A.discard.includes(w));const h=s.players.A.hand.length;s=use(s,N('omiyage'),x=>x.target===w);
 ok('時のカードを出したターン：いなかを戻して1枚引く',s.players.A.hand.includes(w)&&s.players.A.hand.length===h+1,`hand ${h}→${s.players.A.hand.length}`);ok('終了ラウンドは12のまま',s.life.final===12);}
// ---- ちょっとまった ----
{let s=await at(7);give(s,'A',N('chotto'));s=setTrap(s,N('chotto'));while(!(s.turn==='B'&&s.phase==='normal'))s=passAll(settle(step(s)));growth(s,60,100);s.players.B.reached=s.serial+2;
 let t=null;for(let n=0;n<60&&!t&&s.turn==='B';n++){t=e.legalActions(s).find(x=>x.kind==='trigger'&&s.cards[x.source]?.cardId===N('chotto'));if(!t)s=step(s);}
 ok('相手のターン終了時、相手が100・終了ラウンドが先：発動できる',!!t);if(t){s=settle(e.act(s,e.actor(s),s.revision,t.id));s=passAll(s);ok('相手のそだち−5、100維持が止まる',s.players.B.growth===95&&s.players.B.reached===null,`B=${s.players.B.growth}`);}}
{let s=await at(10);s.life.final=10;give(s,'A',N('chotto'));s=setTrap(s,N('chotto'));while(!(s.turn==='B'&&s.phase==='normal'))s=passAll(settle(step(s)));growth(s,60,100);
 let seen=false;for(let n=0;n<60&&s.phase!=='finished'&&s.turn==='B';n++){if(e.legalActions(s).some(x=>x.kind==='trigger'&&s.cards[x.source]?.cardId===N('chotto')))seen=true;s=step(s);}ok('終了ラウンドのラウンドでは発動しない',!seen);}
// ---- U12：カウンターされた時のカードと既存の置換効果 ----
// A の IX に B が XII でカウンター。XII の効果で A の IX が場を離れる時、A の置換を使えるか。どの場合も IX の効果は不成立（終了ラウンド12）。
async function u12(mainId,setup=()=>{},chooseIdx=0){let s=await at(8);const m=fromDeck(s,'A','M-salmon-01');s.cards[m].cardId=mainId;s.players.A.board.main=m;setup(s);
 give(s,'A',T('IX'));give(s,'B',T('XII'));s=playTime(s,'IX');const ix=s.players.A.board.world;while(e.actor(s)!=='B')s=step(s);s=playTime(s,'XII',true);
 let choice=null;for(let n=0;n<80&&!(s.phase==='normal'&&!s.chain.length);n++){if(s.choice?.kind==='replacement'){choice={actor:s.choice.actor,labels:s.choice.options.map(o=>o.label)};const o=s.choice.options[Math.min(chooseIdx,s.choice.options.length-1)];s=e.act(s,s.choice.actor,s.revision,e.legalActions(s).find(x=>x.value===o.id||x.id.endsWith(':'+o.id))?.id??e.legalActions(s)[chooseIdx].id);continue;}s=settle(step(s));}
 return {s,ix,choice};}
{const {s,ix,choice}=await u12('M-starfish-07');ok('U12 ヒトデ⑦：置換の選択が A に出る',choice?.actor==='A',JSON.stringify(choice?.labels));ok('U12 ヒトデ⑦：IX は山札の一番下へ',loc(s,'A',ix)==='deckBottom',loc(s,'A',ix));ok('U12 ヒトデ⑦：IX の効果は不成立（終了ラウンド12）',s.life.final===12);}
{const {s,ix,choice}=await u12('M-coral-07',s=>{s.players.A.board.companions=[fromDeck(s,'A','C-owl')];s.players.A.board.partner=fromDeck(s,'A','P-grove_deer');});
 ok('U12 サンゴ⑦：IX は場に残る',loc(s,'A',ix)==='world'&&!!choice,loc(s,'A',ix));ok('U12 サンゴ⑦：場に残っても IX の効果は不成立（終了ラウンド12）',s.life.final===12);}
{const {s,ix,choice}=await u12('M-dandelion-04',s=>{give(s,'A',T('X'));});ok('U12 タンポポ④：手札のセカイを捨てる選択が出る',!!choice&&choice.labels.length>=2,JSON.stringify(choice?.labels));
 ok('U12 タンポポ④（使う）：IX は場に残り、支払いに選んだ手札のセカイが捨て札',loc(s,'A',ix)==='world'&&s.players.A.discard.some(x=>/^X-T-/.test(s.cards[x].cardId)&&x!==ix),loc(s,'A',ix));ok('U12 タンポポ④：IX の効果は不成立（終了ラウンド12）',s.life.final===12);}
{const {s,ix}=await u12('M-dandelion-04',s=>{give(s,'A',T('X'));},99);ok('U12 タンポポ④（使わない）：IX は捨て札',loc(s,'A',ix)==='discard',loc(s,'A',ix));}
{const {s,ix,choice}=await u12('M-salmon-01');ok('U12 置換カードがなければ選択なしで捨て札（VERSION 1 と同じ結果）',!choice&&loc(s,'A',ix)==='discard'&&s.life.final===12);}
console.log(fails?`FAILED ${fails}`:'ALL PASS');if(fails)process.exit(1);
