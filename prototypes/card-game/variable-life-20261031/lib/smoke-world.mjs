// Rule checks for せかい「XI」「XII」 (PLAN-WORLD.md). Same method as smoke.mjs: positions are made by editing a fresh game
// state (test only), then the engine's own legalActions/act run them. Save→restore is checked on every real CPU match (run.mjs).
// Usage: node lib/smoke-world.mjs > evidence/smoke-world.txt
import {dirname,join} from 'node:path';import {fileURLToPath,pathToFileURL} from 'node:url';
import {deckFor} from './decks-life.mjs';
const HERE=dirname(fileURLToPath(import.meta.url)),BUILD=process.env.LIFE_BUILD??join(HERE,'..','build');
const load=v=>import(pathToFileURL(join(BUILD,v,'engine.mjs')).href);
let fails=0;const ok=(name,cond,info='')=>{console.log(`${cond?'PASS':'FAIL'} ${name}${info?' — '+info:''}`);if(!cond)fails++;};
function give(s,a,cardId){const p=s.players[a];const held=p.hand.find(x=>s.cards[x].cardId===cardId);if(held)return held;const id=[...p.deck,...p.discard].find(x=>s.cards[x].cardId===cardId);if(!id)throw Error('no '+cardId);p.deck=p.deck.filter(x=>x!==id);p.discard=p.discard.filter(x=>x!==id);p.hand.push(id);return id;}
function step(e,s){const acts=e.legalActions(s);const a=acts.find(x=>['pass','skip'].includes(x.kind))??acts[0];return e.act(s,e.actor(s),s.revision,a.id);}
function resolve(e,s){let n=0;while(s.phase!=='normal'&&s.phase!=='finished'&&n++<200)s=step(e,s);return s;}
function toEnd(e,s){let n=0;while(s.phase!=='finished'&&n++<5000)s=step(e,s);return s;}
async function at(v,round,turn='A'){const e=await load(v);let s=e.createGame(7,{A:deckFor('balance',v).cards,B:deckFor('balance',v).cards});
 while(!(s.round===round&&s.turn===turn&&s.phase==='normal'&&!s.choice))s=step(e,s);return {e,s:structuredClone(s)};}
const worlds=(e,s,id)=>e.legalActions(s).filter(x=>x.kind==='place'&&x.slot==='world'&&s.cards[x.source].cardId===id);
function place(e,s,id){const a=worlds(e,s,id)[0];if(!a)throw Error('cannot place '+id);s=e.act(s,e.actor(s),s.revision,a.id);return resolve(e,s);}

// 1. B：XI を R3 に出す → 終了ラウンド11（両者共通）。普通のセカイとして場に残る。
{const {e,s:s0}=await at('W-B',3,'A');let s=s0;give(s,'A','X-XI-B');s.players.A.time=3;
 ok('B: XI は通常のセカイ配置として選べる（時2）',worlds(e,s,'X-XI-B').some(a=>a.cost===2));
 s=place(e,s,'X-XI-B');ok('B: XI を出すと終了ラウンド11',s.life.final===11);ok('B: XI はセカイ枠に残る',s.cards[s.players.A.board.world].cardId==='X-XI-B');
 const end=toEnd(e,s);ok('B: R11後攻の終了で最終比較',end.round===11&&/R11最終比較/.test(end.result.reason),end.result.reason);}
// 2. B：XII を先に → 12。後から XI を出しても12のまま（短くならない）。
{const {e,s:s0}=await at('W-B',4,'A');let s=s0;give(s,'A','X-XII-B');give(s,'A','X-XI-B');s.players.A.time=4;
 s=place(e,s,'X-XII-B');ok('B: XII を先に出すと12',s.life.final===12);s=place(e,s,'X-XI-B');ok('B: その後 XI を出しても12のまま（短縮しない）',s.life.final===12);
 ok('B: XI は前のセカイ（XII）を捨て札へ置き換える',s.players.A.discard.some(id=>s.cards[id].cardId==='X-XII-B'));}
// 3. A：XII は終了ラウンド11以上になるまで出せない。
{const {e,s:s0}=await at('W-A',5,'A');let s=s0;give(s,'A','X-XII-A');give(s,'A','X-XI-A');s.players.A.time=5;
 ok('A: 終了ラウンド10では XII を出せない',worlds(e,s,'X-XII-A').length===0);
 s=place(e,s,'X-XI-A');ok('A: XI で11',s.life.final===11);ok('A: その後は XII を出せる',worlds(e,s,'X-XII-A').length>0);
 s=place(e,s,'X-XII-A');ok('A: XII で12（同じターンに2枚続けても可：セカイ変更の回数制限なし）',s.life.final===12);}
// 4. C：どちらも +1。XII を先に出すと11、XI で12。12 の後は変わらない。
{const {e,s:s0}=await at('W-C',2,'A');let s=s0;give(s,'A','X-XII-C');s.players.A.time=2;s=place(e,s,'X-XII-C');ok('C: XII を先に出すと11（名前と数字が一致しない）',s.life.final===11);
 // 相手の「おもいがけないたび」で手札に戻された場合と同じ状態にして、もう一度出す。
 const id=s.players.A.board.world;s.players.A.board.world=null;s.players.A.hand.push(id);s.cards[id].generation++;s.players.A.time=2;
 s=place(e,s,'X-XII-C');ok('C: 手札に戻った XII をもう一度出すと12（同じカードで2回のびる）',s.life.final===12);}
// 5. B：手札に戻された XI をもう一度出しても、すでに11なので変わらない。セカイが場を離れても終了ラウンドは戻らない。
{const {e,s:s0}=await at('W-B',3,'B');let s=s0;give(s,'B','X-XI-B');s.players.B.time=3;s=place(e,s,'X-XI-B');
 const id=s.players.B.board.world;s.players.B.board.world=null;s.players.B.discard.push(id);ok('B: XI が場を離れても終了ラウンドは11のまま',s.life.final===11);}
// 6. R10（最終ラウンド）に出しても延びる。後攻 B の R10 に出せば、R10 では終わらない。
{const {e,s:s0}=await at('W-B',10,'B');let s=s0;give(s,'B','X-XI-B');s.players.B.time=10;s=place(e,s,'X-XI-B');s=step(e,s);s=resolve(e,s);
 ok('B: 後攻が R10 に XI → R11 へ',s.phase!=='finished'&&s.round===11&&s.players.A.time===11,`round=${s.round} time=${s.players.A.time}`);}
// 7. 延長後の R10 では 100維持の早期勝利を判定する。
{const {e,s:s0}=await at('W-B',10,'A');let s=s0;s.life.final=11;s.players.A.growth=100;s.players.A.reached=s.serial+1;const t=toEnd(e,s);
 ok('B: 延長後は R10 でも100維持の早期勝利がある',t.result.reason==='100維持'&&t.round===10,`${t.result.reason} R${t.round}`);}
// 8. 新カードの無い通常のセカイ（いなか）は従来どおり。終了ラウンドは変わらない。
{const {e,s:s0}=await at('W-B',3,'A');let s=s0;give(s,'A','W-countryside');s.players.A.time=3;s=place(e,s,'W-countryside');ok('通常のセカイを出しても終了ラウンドは10',s.life.final===10);}
// 9. 診断 BL：R8 より前は XI を出せない。R8 からは出せる。
{const {e,s:s0}=await at('W-BL',7,'A');let s=s0;give(s,'A','X-XI-BL');s.players.A.time=7;ok('BL: R7 では XI を出せない',worlds(e,s,'X-XI-BL').length===0);}
{const {e,s:s0}=await at('W-BL',8,'A');let s=s0;give(s,'A','X-XI-BL');s.players.A.time=8;s=place(e,s,'X-XI-BL');ok('BL: R8 では出せて、終了ラウンド11',s.life.final===11);}
console.log(fails?`${fails} FAILED`:'ALL PASS');process.exit(fails?1:0);
