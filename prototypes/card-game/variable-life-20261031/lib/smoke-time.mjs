// Rule checks for the time cards IX–XII and the special counter (PLAN-TIME.md). Same method as smoke.mjs / smoke-world.mjs:
// positions are made by editing a fresh game state (test only), then the engine's own legalActions/act run them.
// Usage: node lib/smoke-time.mjs > evidence/smoke-time.txt
import {dirname,join} from 'node:path';import {fileURLToPath,pathToFileURL} from 'node:url';
import {deckFor} from './decks-life.mjs';
const HERE=dirname(fileURLToPath(import.meta.url)),BUILD=join(HERE,'..','build');
const load=v=>import(pathToFileURL(join(BUILD,v,'engine.mjs')).href);
let fails=0;const ok=(name,cond,info='')=>{console.log(`${cond?'PASS':'FAIL'} ${name}${info?' — '+info:''}`);if(!cond)fails++;};
function give(s,a,cardId){const p=s.players[a];const held=p.hand.find(x=>s.cards[x].cardId===cardId);if(held)return held;const id=[...p.deck,...p.discard].find(x=>s.cards[x].cardId===cardId);if(!id)throw Error('no '+cardId);p.deck=p.deck.filter(x=>x!==id);p.discard=p.discard.filter(x=>x!==id);p.hand.push(id);return id;}
const pick=(e,s)=>{const acts=e.legalActions(s);return acts.find(x=>['pass','skip'].includes(x.kind))??acts[0];};
function step(e,s){return e.act(s,e.actor(s),s.revision,pick(e,s).id);}
function toEnd(e,s){let n=0;while(s.phase!=='finished'&&n++<5000)s=step(e,s);return s;}
// Run forced triggers (the time card's own ability) until someone has a real choice in a response window or the chain is gone.
function settle(e,s){for(let n=0;n<50;n++){const acts=e.legalActions(s);if(s.phase==='trigger'){s=e.act(s,e.actor(s),s.revision,acts.find(x=>x.kind==='trigger').id);continue;}return s;}return s;}
const card=id=>'X-T-'+id;
async function at(v,round,turn='A'){const e=await load(v);const d=deckFor('balance',v).cards;let s=e.createGame(7,{A:d,B:d});
 while(!(s.round===round&&s.turn===turn&&s.phase==='normal'&&!s.choice))s=step(e,s);return {e,s:structuredClone(s)};}
const offers=(e,s,name,counter=false)=>e.legalActions(s).filter(x=>x.kind==='place'&&x.slot==='world'&&s.cards[x.source].cardId===card(name)&&!!x.counter===counter);
function play(e,s,name,counter=false){const a=offers(e,s,name,counter)[0];if(!a)throw Error('cannot play '+name);return settle(e,e.act(s,e.actor(s),s.revision,a.id));}
// Everyone passes until the chain is resolved and the turn player is back in the normal phase (or the game ended).
function passAll(e,s){for(let n=0;n<60&&!(s.phase==='normal'&&!s.chain.length)&&s.phase!=='finished';n++)s=settle(e,step(e,s));return s;}
const where=(s,a,id)=>{const p=s.players[a];return p.board.world&&s.cards[p.board.world].cardId===card(id)?'world':p.discard.some(x=>s.cards[x].cardId===card(id))?'discard':p.hand.some(x=>s.cards[x].cardId===card(id))?'hand':'other';};

// 1. 通常の使用：R5 に XI → 終了ラウンド11。セカイ枠に残る。
{const {e,s:s0}=await at('T-2s',5,'A');let s=s0;give(s,'A',card('XI'));s.players.A.time=5;
 ok('通常のセカイとして出せる（時2）',offers(e,s,'XI').some(a=>a.cost===2));s=passAll(e,play(e,s,'XI'));ok('XI で終了ラウンド11',s.life.final===11);ok('XI はセカイ枠に残る',where(s,'A','XI')==='world');}
// 2. 現在ラウンドより前には変えられない（R10 では IX を出せない。X は出せる）。
{const {e,s:s0}=await at('T-2s',10,'A');let s=s0;give(s,'A',card('IX'));give(s,'A',card('X'));s.players.A.time=10;
 ok('R10 では IX を出せない（画面に操作が出ない）',offers(e,s,'IX').length===0);ok('R10 では X を出せる',offers(e,s,'X').length>0);}
// 3. IX → XII → X → XI：最後の XI だけが成立し、終了ラウンド11。途中では終了ラウンドは変わらない。
{const {e,s:s0}=await at('T-2s',8,'A');let s=s0;for(const id of ['IX','X'])give(s,'A',card(id));for(const id of ['XII','XI'])give(s,'B',card(id));s.players.A.time=8;s.players.B.time=8;
 s=play(e,s,'IX');ok('A が IX を出す（能力は連鎖上で待機）',s.chain.length===1&&s.life.final===10,`chain=${s.chain.length} final=${s.life.final}`);
 ok('A は自分の IX にはカウンターできない',e.actor(s)!=='A'||offers(e,s,'X',true).length===0);
 s=step(e,s);ok('B に XII のカウンターが出る',e.actor(s)==='B'&&offers(e,s,'XII',true).length>0);
 s=play(e,s,'XII',true);ok('B の XII はセカイ枠へ（時2を払う）',where(s,'B','XII')==='world'&&s.players.B.time===6,`B time=${s.players.B.time}`);ok('途中では終了ラウンドは変わらない（10のまま）',s.life.final===10);
 while(e.actor(s)!=='A')s=step(e,s);ok('A に X のカウンターが出る',offers(e,s,'X',true).length>0);s=play(e,s,'X',true);ok('A の X は A のセカイ枠へ（IX は置き換えで捨て札）',where(s,'A','X')==='world'&&where(s,'A','IX')==='discard');
 while(e.actor(s)!=='B')s=step(e,s);s=play(e,s,'XI',true);ok('連鎖に4枚の時のカード',s.chain.length===4,`chain=${s.chain.length}`);
 s=passAll(e,s);ok('最後の XI だけが成立：終了ラウンド11',s.life.final===11,`final=${s.life.final}`);
 ok('XI だけが場に残る（B のセカイ）',where(s,'B','XI')==='world'&&where(s,'A','X')==='discard'&&where(s,'B','XII')==='discard'&&where(s,'A','IX')==='discard',`A:${where(s,'A','X')} B:${where(s,'B','XII')}`);
 ok('A のセカイ枠は空（X が捨て札へ）',!s.players.A.board.world);
 const ev=s.life.events.at(-1);ok('記録：4枚の勝負・3枚がカウンターされた',ev.battle===4&&ev.superseded.length===3);
 ok('A の通常の行動機会に戻る',s.phase==='normal'&&s.turn==='A');}
// 4. 先攻が R9 に IX → 後攻の R9 の番はそのまま → R9 後攻の終了で最終比較。
{const {e,s:s0}=await at('T-2s',9,'A');let s=s0;give(s,'A',card('IX'));s.players.A.time=9;s=passAll(e,play(e,s,'IX'));ok('先攻の IX で終了ラウンド9',s.life.final===9);
 s=step(e,s);while(s.phase!=='finished'&&s.turn==='A')s=step(e,s);ok('後攻の通常の番がある',s.phase!=='finished'&&s.turn==='B'&&s.round===9);
 const t=toEnd(e,s);ok('R9 後攻の終了で最終比較',t.round===9&&/R9最終比較/.test(t.result.reason),t.result.reason);}
// 5. 後攻が R10 に X（終了ラウンド12→10）：先攻には対応の機会だけ。カウンターしなければ R10 で終了。
{const {e,s:s0}=await at('T-2s',10,'B');let s=s0;s.life.final=12;give(s,'B',card('X'));s.players.B.time=10;s=passAll(e,play(e,s,'X'));ok('後攻の X で終了ラウンド10',s.life.final===10);
 const t=toEnd(e,s);ok('先攻の番を足さずに R10 後攻の終了で最終比較',t.round===10&&/R10最終比較/.test(t.result.reason),t.result.reason);}
// 6. 後攻が R10 に X、先攻が XII でカウンター → 12 になり R11 へ続く。
{const {e,s:s0}=await at('T-2s',10,'B');let s=s0;s.life.final=11;give(s,'B',card('X'));give(s,'A',card('XII'));s.players.B.time=10;s.players.A.time=4;
 s=play(e,s,'X');while(e.actor(s)!=='A')s=step(e,s);ok('先攻に XII のカウンター（相手の番の対応機会）',offers(e,s,'XII',true).length>0);s=passAll(e,play(e,s,'XII',true));
 ok('カウンター成立：終了ラウンド12',s.life.final===12);s=step(e,s);s=passAll(e,s);while(s.phase!=='finished'&&s.round===10)s=step(e,s);ok('R11 へ続く',s.phase!=='finished'&&s.round===11);}
// 7. 終了ラウンドが変わった後に時のカードが場を離れても、終了ラウンドは戻らない。
{const {e,s:s0}=await at('T-2s',6,'A');let s=s0;give(s,'A',card('XII'));s.players.A.time=6;s=passAll(e,play(e,s,'XII'));const id=s.players.A.board.world;s.players.A.board.world=null;s.players.A.discard.push(id);ok('場を離れても12のまま',s.life.final===12);}
// 8. 特殊カウンターなし（比較用）：カウンターの操作は出ない。
{const {e,s:s0}=await at('T-2n',8,'A');let s=s0;give(s,'A',card('IX'));give(s,'B',card('XII'));s.players.A.time=8;s.players.B.time=8;s=play(e,s,'IX');s=step(e,s);
 ok('カウンターなしの条件では B にカウンターが出ない',offers(e,s,'XII',true).length===0);}
// 9. 時3の条件：コスト3。
{const {e,s:s0}=await at('T-3s',5,'A');let s=s0;give(s,'A',card('XI'));s.players.A.time=5;ok('時3の条件では XI は時3',offers(e,s,'XI').some(a=>a.cost===3));}
// 10. 時が足りなければカウンターできない。
{const {e,s:s0}=await at('T-2s',8,'A');let s=s0;give(s,'A',card('IX'));give(s,'B',card('XII'));s.players.A.time=8;s.players.B.time=1;s=play(e,s,'IX');s=step(e,s);
 ok('時1ではカウンターできない（時2が必要）',offers(e,s,'XII',true).length===0);}
console.log(fails?`${fails} FAILED`:'ALL PASS');process.exit(fails?1:0);
