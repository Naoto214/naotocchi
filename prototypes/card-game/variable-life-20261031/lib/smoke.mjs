// Small rule checks for the experiment builds (PLAN.md §5). Positions are made by editing a fresh game state (test only),
// then the engine's own legalActions/act run them. Edited positions cannot be saved/restored (a save replays commands from the
// deal), so save→restore is checked on every real CPU match instead (lib/run.mjs `replay`, PLAN.md §5). Prints one line per check and exits 1 on any failure.
// Usage: node lib/smoke.mjs > evidence/smoke.txt
import {dirname,join} from 'node:path';import {fileURLToPath,pathToFileURL} from 'node:url';
import {deckFor} from './decks-life.mjs';
const HERE=dirname(fileURLToPath(import.meta.url)),BUILD=join(HERE,'..','build');
const load=v=>import(pathToFileURL(join(BUILD,v,'engine.mjs')).href);
let fails=0;const ok=(name,cond,info='')=>{console.log(`${cond?'PASS':'FAIL'} ${name}${info?' — '+info:''}`);if(!cond)fails++;};
const DECK=v=>deckFor('balance',v).cards;
// Put a copy of `cardId` (already in the seat's deck list) into the seat's hand.
function give(s,a,cardId){const p=s.players[a];const id=[...p.deck,...p.discard].find(x=>s.cards[x].cardId===cardId);if(!id)throw Error('no '+cardId);p.deck=p.deck.filter(x=>x!==id);p.discard=p.discard.filter(x=>x!==id);p.hand.push(id);return id;}
// Fresh game at the start of `turn`'s turn in `round` (phase normal), with `time` set.
async function at(v,round,turn='A'){const e=await load(v);let s=e.createGame(7,{A:DECK(v),B:DECK(v)});
 // Walk with passes only until the wanted round/turn (keeps the state consistent: commands are real).
 while(!(s.round===round&&s.turn===turn&&s.phase==='normal'&&!s.choice)){s=step(e,s);if(s.phase==='finished')throw Error('finished early');}
 return {e,s};}
function step(e,s,prefer=x=>['pass','skip'].includes(x.kind)){const acts=e.legalActions(s);const a=acts.find(prefer)??acts.find(x=>['pass','skip'].includes(x.kind))??acts[0];return e.act(s,e.actor(s),s.revision,a.id);}
const plays=(e,s,cardId)=>e.legalActions(s).filter(x=>['programPlay','play'].includes(x.kind)&&s.cards[x.source]?.cardId===cardId);
function resolve(e,s){let n=0;while(s.phase!=='normal'&&s.phase!=='finished'&&n++<200)s=step(e,s);return s;}
function toEnd(e,s){let n=0;while(s.phase!=='finished'&&n++<5000)s=step(e,s);return s;}
function playCard(e,s,cardId){const a=plays(e,s,cardId)[0];if(!a)throw Error('not playable '+cardId);return resolve(e,e.act(s,e.actor(s),s.revision,a.id));}

// 1. 人生延長（A1：最終ラウンドのみ）
{const {e,s:s0}=await at('L-A1',9,'A');let s=structuredClone(s0);give(s,'A','X-life-extend');
 ok('A1: R9 では延長カードを使えない',plays(e,s,'X-life-extend').length===0);}
{const {e,s:s0}=await at('L-A1',10,'A');let s=structuredClone(s0);give(s,'A','X-life-extend');give(s,'A','X-life-extend');s.players.A.time=10;
 ok('A1: R10（最終ラウンド）では使える',plays(e,s,'X-life-extend').length>0);
 s=playCard(e,s,'X-life-extend');ok('A1: R10で使うと最終ラウンドがR11',s.life.final===11,`final=${s.life.final}`);
 ok('A1: 同じR10にもう1枚は使えない（1ラウンド1回）',plays(e,s,'X-life-extend').length===0);
 const end=toEnd(e,s);ok('A1: R11後攻の終了で最終比較',end.round===11&&/R11最終比較/.test(end.result.reason),`${end.round} ${end.result.reason}`);
}
// 2. R10後攻の終了直前（最終比較の前）に延長できる：後攻B自身のR10ターン
{const {e,s:s0}=await at('L-A1',10,'B');let s=structuredClone(s0);give(s,'B','X-life-extend');s.players.B.time=10;
 s=playCard(e,s,'X-life-extend');s=step(e,s); // B ends the turn: no final comparison because R10 is no longer final
 s=resolve(e,s);ok('A1: R10後攻が延長→R10で終わらずR11へ',s.phase!=='finished'&&s.round===11,`round=${s.round} phase=${s.phase}`);}
// 3. R11でさらに延長→R12、R12では延長不可、R12で終了
{const {e,s:s0}=await at('L-A1',10,'A');let s=structuredClone(s0);for(let i=0;i<2;i++)give(s,'A','X-life-extend');s.players.A.time=10;
 s=playCard(e,s,'X-life-extend');while(!(s.round===11&&s.turn==='A'&&s.phase==='normal'))s=step(e,s);
 ok('A1: R11の時は11',s.players.A.time===11,`time=${s.players.A.time}`);
 s=playCard(e,s,'X-life-extend');ok('A1: R11で2回目の延長→R12',s.life.final===12);
 while(!(s.round===12&&s.turn==='A'&&s.phase==='normal'))s=step(e,s);
 ok('A1: R12の時は12（validate 通過）',s.players.A.time===12&&e.validate(s));
 give(s,'A','X-life-extend');ok('A1: 最大R12：これ以上は延長できない',plays(e,s,'X-life-extend').length===0);
 const end=toEnd(e,s);ok('A1: R12後攻の終了で最終比較',end.round===12&&/R12最終比較/.test(end.result.reason),end.result.reason);
}
// 4. 100維持（現行どおり）：R9先攻中に到達→R9後攻の終了で勝ち
{const {e,s:s0}=await at('L-A0',5,'A');let s=structuredClone(s0);s.players.A.growth=95;
 // A gains 5 by an engine growth path: use the internal rule through a direct state edit equivalent (reach with reached clock).
 s.players.A.growth=100;s.players.A.reached=s.serial+1;
 let t=s;while(t.phase!=='finished'&&!(t.round===5&&t.turn==='B'&&t.phase==='normal'))t=step(e,t);t=toEnd(e,t);
 ok('A0: 100維持で早期勝利（R5）',t.result.reason==='100維持'&&t.result.winner==='A'&&t.round===5,`${t.result.reason} R${t.round}`);}
// 5. 上限解放（A2 共通）：Aが100維持中にBが解放→Aの維持は途切れ、上限・維持値110
{const {e,s:s0}=await at('L-A2',5,'B');let s=structuredClone(s0);s.players.A.growth=100;s.players.A.reached=s.serial;give(s,'B','X-cap-raise');s.players.B.time=5;
 s=playCard(e,s,'X-cap-raise');ok('A2: 解放で上限・維持値が両者110',s.life.cap.A===110&&s.life.cap.B===110&&s.life.hold.A===110,JSON.stringify(s.life.cap));
 ok('A2: 現在のそだちは変わらない（A=100）',s.players.A.growth===100);
 ok('A2: 100で維持中だったAの維持は途切れる',s.players.A.reached===null);
 let t=s;while(t.phase!=='finished'&&!(t.round===6&&t.turn==='A'))t=step(e,t);
 ok('A2: B終了時にAは勝たない（100維持は成立しない）',t.phase!=='finished');}
// 6. 110維持：上限110でAが110に届き、相手ターンの終了まで維持→「110維持」
{const {e,s:s0}=await at('L-A2',6,'A');let s=structuredClone(s0);s.life.cap={A:110,B:110};s.life.hold={A:110,B:110};s.players.A.growth=110;s.players.A.reached=s.serial+1;
 ok('A2: そだち110は上限110で正当（validate）',e.validate(s));
 const t=toEnd(e,s);ok('A2: 110維持で早期勝利',t.result.reason==='110維持'&&t.result.winner==='A',t.result.reason);}
// 7. 120維持
{const {e,s:s0}=await at('L-A2',7,'A');let s=structuredClone(s0);s.life.cap={A:120,B:120};s.life.hold={A:120,B:120};s.players.A.growth=120;s.players.A.reached=s.serial+1;
 const t=toEnd(e,s);ok('A2: 120維持で早期勝利',t.result.reason==='120維持'&&t.result.winner==='A',t.result.reason);
 let u=structuredClone(s0);u.players.A.growth=105;let bad=false;try{e.validate(u);}catch{bad=true;}ok('A2: 上限100のまま105は不正（validate）',bad);}
// 8. 自分だけ解放（A2s）
{const {e,s:s0}=await at('L-A2s',4,'A');let s=structuredClone(s0);give(s,'A','X-cap-raise');s.players.A.time=4;s=playCard(e,s,'X-cap-raise');
 ok('A2s: 使った側だけ110',s.life.cap.A===110&&s.life.cap.B===100,JSON.stringify(s.life.cap));}
// 9. 延長で R10 も維持勝利の判定ラウンドになる（A1）
{const {e,s:s0}=await at('L-A1',10,'A');let s=structuredClone(s0);give(s,'B','X-life-extend');s.players.A.growth=100;s.players.A.reached=s.serial+1;
 s=structuredClone(s);s.life.final=11;const t=toEnd(e,s);ok('A1: 延長後のR10では100維持の早期勝利がある',t.result.reason==='100維持'&&t.round===10,`${t.result.reason} R${t.round}`);}
// 10. A4：1枚で延長＋上限解放
{const {e,s:s0}=await at('L-A4',10,'A');let s=structuredClone(s0);give(s,'A','X-life-both');s.players.A.time=10;s=playCard(e,s,'X-life-both');
 ok('A4: 最終ラウンドR11・上限110',s.life.final===11&&s.life.cap.A===110&&s.life.cap.B===110);}
// 11. しかける版（A1t）：最終ラウンドの自分のターン終了時に発動
{const {e,s:s0}=await at('L-A1t',10,'B');let s=structuredClone(s0);give(s,'B','X-life-extend');s.players.B.time=10;
 const set=e.legalActions(s).find(x=>x.kind==='place'&&x.trap&&s.cards[x.source].cardId==='X-life-extend');ok('A1t: しかけられる',!!set);
 s=resolve(e,e.act(s,'B',s.revision,set.id));
 // B ends the turn; at the end window the trap trigger is offered to B.
 let fired=false;for(let n=0;n<200&&s.phase!=='finished'&&s.round===10;n++){const acts=e.legalActions(s);const tr=acts.find(x=>x.kind==='trigger'&&s.cards[x.source]?.cardId==='X-life-extend');if(tr){s=e.act(s,e.actor(s),s.revision,tr.id);fired=true;}else s=step(e,s);}
 ok('A1t: 最終ラウンドの自分のターン終了時に発動→R11へ',fired&&s.life.final===11&&s.round===11,`fired=${fired} final=${s.life.final} round=${s.round}`);}
console.log(fails?`${fails} FAILED`:'ALL PASS');process.exit(fails?1:0);
