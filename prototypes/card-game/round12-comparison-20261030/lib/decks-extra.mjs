// Experiment decks for the follow-up (PLAN-EXTRA.md). Every list is an official CPU deck (cpu-decks.mjs, read-only)
// with explicit, documented replacements only; replaced copies keep their list positions.
//  * ⑧ decks: no official CPU deck contains a ⑧ main, so ⑧ could not be measured in MAIN.
//  * すれちがい decks: identical definitions to ../../breakup-penalty-20261029/lib/decks.mjs (PR #481), so the
//    breakup/divorce opponents are the same ones already used to study the breakup penalty.
import {CPU_DECKS} from '../../cpu-decks.mjs';
const base=id=>{const d=CPU_DECKS.find(x=>x.id===id);if(!d)throw Error('unknown CPU deck '+id);return [...d.cards];};
function swap(list,from,to,n){let left=n;const out=list.map(id=>id===from&&left>0?(left--,to):id);if(left)throw Error(`not enough ${from}`);return out;}
const S='E-misunderstanding';
const official=Object.fromEntries(CPU_DECKS.map(d=>[d.id,{label:d.name+'（公式CPU）',cards:[...d.cards]}]));
export const DECKS={
 ...official,
 // いぬ①〜⑥・カブトムシ①③⑥⑦ の公式デッキに、いぬ⑦⑧・カブトムシ⑧ を足す（そだち系の小札3枚と交換）
 'main+8':{label:'メイン成長＋⑧：すごろく2→いぬ⑦・いぬ⑧、庭に小さな花を植えた1→カブトムシ⑧',
  cards:swap(swap(swap(base('main'),'G-sugoroku-race','M-dog-07',1),'G-sugoroku-race','M-dog-08',1),'E-midlife-flower','M-beetle-08',1),
  replaced:'G-sugoroku-race×2→M-dog-07,M-dog-08; E-midlife-flower×1→M-beetle-08'},
 // さけ①〜⑤ の公式デッキに、さけ⑥⑦⑧ を足す（ちょうせん補助3枚と交換）
 'balance+8':{label:'バランス＋⑧：スキージャンプ2→さけ⑥・さけ⑦、やきゅう1→さけ⑧',
  cards:swap(swap(swap(base('balance'),'G-ski-jump','M-salmon-06',1),'G-ski-jump','M-salmon-07',1),'G-baseball-batting','M-salmon-08',1),
  replaced:'G-ski-jump×2→M-salmon-06,M-salmon-07; G-baseball-batting×1→M-salmon-08'},
 // Lighter ⑧ variant for the CPU-deck question (EIGHT.md): only two ⑧ cards, the two すごろく go; いぬ⑥→⑧ is a time 2 ときおくり.
 'main+8lite':{label:'メイン成長＋⑧（2枚）：すごろく2→いぬ⑧・カブトムシ⑧',
  cards:swap(swap(base('main'),'G-sugoroku-race','M-dog-08',1),'G-sugoroku-race','M-beetle-08',1),
  replaced:'G-sugoroku-race×2→M-dog-08,M-beetle-08'},
 'challenge+S':{label:'ちょうせん：としをとったじぶん2→すれちがい2',cards:swap(base('challenge'),'E-mirror',S,2),replaced:'E-mirror×2→E-misunderstanding'},
 'growth+S':{label:'そだち獲得：ミニゴルフ2→すれちがい2',cards:swap(base('growth'),'G-mini-golf-physics',S,2),replaced:'G-mini-golf-physics×2→E-misunderstanding'},
 'item+S':{label:'アイテム・じゅんび：ごもく2→すれちがい2',cards:swap(base('item'),'G-gomoku-9',S,2),replaced:'G-gomoku-9×2→E-misunderstanding'},
 'partner+S':{label:'こいびと・交際：なかなおり2→すれちがい2',cards:swap(base('partner'),'E-reconciliation',S,2),replaced:'E-reconciliation×2→E-misunderstanding'},
};
// E8: each ⑧ deck against all 7 official decks. EL: lover decks against the すれちがい decks (#481 N1 layout).
export const SETS={
 E8:['main+8','balance+8'].flatMap(x=>CPU_DECKS.map(d=>[x,d.id])),
 // C8 (EIGHT.md): controls and the lighter variant on the E8 seeds. Third element = the deck whose E8 seed labels are reused,
 // so official main/balance and main+8lite meet the same opponents with the same shuffles and policy seeds as E8.
 C8:[['main','main+8'],['balance','balance+8'],['main+8lite','main+8']].flatMap(([x,s])=>CPU_DECKS.map(d=>[x,d.id,s])),
 EL:['partner','balance'].flatMap(x=>['challenge+S','growth+S','item+S','partner+S'].map(y=>[x,y])),
};
