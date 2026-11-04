// VERSION 5 rule checks (PLAN-V5.md): おいわいのつる timing variants and the CPU smart4 decisions. Based on smoke-v4.mjs.
// VERSION 4 rule checks (PLAN-V4.md): the 7 new cards, their links with IX–XII, and U12 (existing replacement effects on a
// countered time card). Same method as smoke-time.mjs: positions are made by editing a fresh game state (test only), then the
// engine's own legalActions/act run them. Build: build/T-4v.
// Usage: node lib/smoke-v4.mjs > evidence/smoke-v4.txt
import {dirname,join} from 'node:path';import {fileURLToPath,pathToFileURL} from 'node:url';
import {BASE_DECKS,slotsK} from './decks-life.mjs';
const HERE=dirname(fileURLToPath(import.meta.url)),BUILD=join(HERE,'..','build');
const e=await import(pathToFileURL(join(BUILD,'T-5v','engine.mjs')).href);
let fails=0;const ok=(name,cond,info='')=>{console.log(`${cond?'PASS':'FAIL'} ${name}${info?' — '+info:''}`);if(!cond)fails++;};
const T=n=>'X-T-'+n,N=n=>'X-N-'+n;
// Test deck: balance with 2 of each time card and 2 of each new card in the experiment's slots.
const base=BASE_DECKS.balance.cards,fill=[...['IX','X','XI','XII'].flatMap(n=>[T(n),T(n)]),...['hayajimai','nagaiki','tsuruR','tsuruS','photo','machibuse','omiyage'].flatMap(n=>[N(n),N(n)])];
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


// ---- おいわいのつる（ラウンド終了：R）／（ラウンド開始：S） ----
const place=(s,a,cardId)=>{const id=give(s,a,cardId);s.players[a].board.companions.push(id);s.players[a].hand=s.players[a].hand.filter(x=>x!==id);return id;};
// Run until the start of the next round (A's normal phase) or the end of the game, resolving mandatory triggers.
function toNextRound(s){const r=s.round;for(let n=0;n<400&&s.phase!=='finished'&&!(s.round>r&&s.turn==='A'&&s.phase==='normal');n++)s=settle(step(s));return s;}
function toEndOfA(s){for(let n=0;n<200&&s.turn==='A'&&s.phase!=='finished';n++)s=settle(step(s));return s;}
{let s=await at(10);place(s,'A',N('tsuruR'));growth(s,50,60);s=toEndOfA(s);ok('R：先攻のターン終了時には発動しない',s.players.A.growth===50,`A=${s.players.A.growth}`);
 s.life.final=12;s=toNextRound(s);ok('R：R10 のラウンドの終わり（後攻の終了時）に、負けている A が +5',s.players.A.growth===55,`A=${s.players.A.growth} round=${s.round}`);}
{let s=await at(10);place(s,'A',N('tsuruR'));place(s,'A',N('tsuruR'));growth(s,50,60);s.life.final=12;s=toNextRound(s);ok('R：同じ側に2枚あっても1ラウンドに +5 は1回',s.players.A.growth===55,`A=${s.players.A.growth}`);}
{let s=await at(10);place(s,'A',N('tsuruR'));place(s,'B',N('tsuruR'));growth(s,50,60);s.life.final=12;s=toNextRound(s);ok('R：両者が持っていても、負けている側（A）だけ +5',s.players.A.growth===55&&s.players.B.growth===60,`A=${s.players.A.growth} B=${s.players.B.growth}`);}
{let s=await at(10);place(s,'A',N('tsuruR'));place(s,'B',N('tsuruR'));growth(s,60,60);s.life.final=12;s=toNextRound(s);ok('R：同点ならどちらも増えない',s.players.A.growth===60&&s.players.B.growth===60);}
{let s=await at(9);place(s,'A',N('tsuruR'));growth(s,50,60);s=toNextRound(s);ok('R：R9 のラウンドの終わりでは発動しない',s.players.A.growth===50);}
{let s=await at(10);place(s,'A',N('tsuruR'));growth(s,50,60);s.life.final=10;for(let n=0;n<400&&s.phase!=='finished';n++)s=settle(step(s));
 ok('R：終了ラウンド R10 でも、最終比較の前に +5（R10最終比較の結果に反映）',s.phase==='finished'&&s.result.growth.A===55,`A=${s.result?.growth?.A} ${s.result?.reason}`);}
{let s=await at(10);place(s,'A',N('tsuruR'));growth(s,40,70);s.life.final=12;for(let n=0;n<1500&&s.phase!=='finished';n++){if(s.phase==='normal'&&s.turn==='A'&&!s.chain.length)growth(s,s.players.A.growth,Math.max(s.players.B.growth,s.players.A.growth+10));s=settle(step(s));}
 ok('R：R12 まで延長すると R10・R11・R12 の3回（+15）',s.result?.growth?.A===55,`A=${s.result?.growth?.A}`);}
{let s=await at(10);place(s,'B',N('tsuruS'));growth(s,60,50);s.life.final=12;s=toNextRound(s);ok('S：R11 の始め（先攻の開始時）に、負けている B が +5',s.players.B.growth===55,`B=${s.players.B.growth}`);}
{let s=await at(9);place(s,'B',N('tsuruS'));growth(s,60,50);s=toNextRound(s);ok('S：R10 の始めにも発動（R10以降の各ラウンドの始め）',s.players.B.growth===55,`B=${s.players.B.growth}`);}
{let s=await at(8);place(s,'B',N('tsuruS'));growth(s,60,50);s=toNextRound(s);ok('S：R9 の始めには発動しない',s.players.B.growth===50);}
{let s=await at(9);place(s,'A',N('tsuruS'));place(s,'B',N('tsuruS'));growth(s,60,60);s=toNextRound(s);ok('S：同点ならどちらも増えない',s.players.A.growth===60&&s.players.B.growth===60);}
// ---- CPU smart4：ながいきのひけつ ----
const {scoreCpuAction}=await import(pathToFileURL(join(BUILD,'T-5v','cpu-policy.mjs')).href);
const seat=(gr,hand=[])=>({growth:gr,time:6,handCount:5,hand,relationship:null,deckCount:20,discard:[],stats:{power:3,wisdom:3},board:{main:{cardId:'M-turtle-03',type:'main'},partner:null,world:null,companions:[],prepared:[]}});
const obs=(round,me,op,final=10,hand=[])=>({seat:'A',round,turn:'A',phase:'normal',deck:[],reactive:[],players:{A:seat(me,hand),B:seat(op)},life:{final,cap:{A:100,B:100},hold:{},holding:{A:false,B:false}},chain:[],actions:[]});
const naga={kind:'play',card:{name:'ながいきのひけつ',cardId:'X-N-nagaiki',type:'event',cost:2},cost:2},xii={name:'XII',cardId:'X-T-XII'};
const sv=o=>scoreCpuAction(naga,o,()=>0);
ok('smart4：R4・負けている・XII を持つ → 温存（使わない）',sv(obs(4,30,45,10,[xii]))<0,sv(obs(4,30,45,10,[xii])).toFixed(1));
ok('smart4：R4・負けている・XI/XII なし → 温存（後で使っても +5 は残り、延長なら +15）',sv(obs(4,30,45))<0,sv(obs(4,30,45)).toFixed(1));
ok('smart4：+5 で100に届く（100維持の開始）→ 序盤でも今使う',sv(obs(6,95,60))>0,sv(obs(6,95,60)).toFixed(1));
ok('smart4：R9・終了ラウンド11・負けている → +15 で使う',sv(obs(9,50,60,11))>20,sv(obs(9,50,60,11)).toFixed(1));
ok('smart4：終了ラウンドのラウンド（R10・終了10）→ 最後なので使う',sv(obs(10,50,60,10,[xii]))>0);
console.log(fails?`FAILED ${fails}`:'ALL PASS');if(fails)process.exit(1);
