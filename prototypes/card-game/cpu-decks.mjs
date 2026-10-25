// CPU strategy decks. Every deck is a legal 40-card list of existing card IDs (engine.validateDeck: 40 cards,
// normal <=3 / rare <=1 copies). Card definitions are untouched; these are only deck lists for the CPU seat.
// Verification history: prototypes/card-game/balance-verification-20261022-variety/.
import {validateDeck} from './engine.mjs';
const x=spec=>Object.entries(spec).flatMap(([id,n])=>Array(n).fill(id));
export const CPU_DECKS=Object.freeze([
 {id:'main',name:'メイン成長',summary:'いぬとカブトムシを①から育て、ときおくりで能力を上げてちょうせんで勝つ。',
  cards:x({'M-dog-01':3,'M-dog-02':2,'M-dog-03':2,'M-dog-04':2,'M-dog-05':2,'M-dog-06':1,'M-beetle-01':2,'M-beetle-03':1,'M-beetle-06':1,'M-beetle-07':1,'E-mirror':3,'E-fateful-transform':2,'C-owl':2,'C-shiba':2,'W-snow':2,'P-snow_spirit':2,'I-c_egg_normal':2,'E-midlife-flower':2,'G-sugoroku-race':2,'G-race-3d':2,'C-rabbit_friend':2})},
 {id:'companion',name:'なかま',summary:'もりとなかまを並べ、ふくろう・ニワトリで手札を整える。パンダとこいびとでそだちを重ねる。',
  cards:x({'M-mushroom-01':3,'M-mushroom-02':2,'M-mushroom-03':2,'M-mushroom-04':2,'M-mushroom-05':1,'C-owl':3,'C-chicken':3,'C-cat_friend':2,'C-otter':2,'C-panda':3,'W-forest':3,'P-grove_deer':2,'I-c_friend':2,'G-stack-acorn':2,'E-new-encounter':2,'G-beach-volley':2,'E-midlife-flower':2,'G-sugoroku-race':2})},
 // 2026-10-25: lovers 10 (4 kinds) -> 6 (シカ・ワシ 3 each). Only one lover can be on the field, so the extra
 // copies stayed in hand; the 4 freed slots go to コネクトフォー x2, あたらしいであい +1, おべんとうばこ x1.
 // Comparison: prototypes/card-game/partner-deck-20261025/. The previous list is kept in CPU_DECK_HISTORY.
 {id:'partner',name:'こいびと・交際',version:'2026-10-25',summary:'こいびとと交際を進めて結婚をめざす。デートや記念日、なかま・こいびと・あいてむをそろえるコネクトフォーでそだちを積み上げる。',
  cards:x({'M-cat-01':3,'M-cat-02':2,'M-cat-03':2,'M-cat-04':2,'M-cat-05':1,'P-grove_deer':3,'P-high_eagle':3,'E-first-date':3,'E-wedding-anniversary':3,'E-reconciliation':2,'I-c_match':2,'I-partner1':2,'E-new-encounter':3,'W-home':2,'C-chicken':2,'C-seal':2,'G-connect-four':2,'I-bowtie':1})},
 {id:'challenge',name:'ちょうせん',summary:'サクラとドラゴンを育て、スキージャンプなどの補正でちから・ちえ両方のちょうせんに勝つ。',
  cards:x({'M-sakura-01':3,'M-sakura-02':2,'M-sakura-03':2,'M-sakura-04':2,'M-sakura-05':1,'M-sakura-06':1,'M-dragon-01':1,'M-dragon-02':1,'C-rabbit_friend':3,'C-otter':2,'P-gentle_gorilla':3,'W-mountain':2,'W-jungle':1,'G-ski-jump':3,'G-baseball-batting':2,'G-basketball-3d':2,'G-grand-prix-3d':2,'E-boss':1,'E-mirror':2,'G-street-fight':2,'G-race-3d':2})},
 {id:'growth',name:'そだち獲得',summary:'いなかとパンダで毎ターン少しずつ。すごろくやミニゴルフでそだちを直接ふやす。',
  cards:x({'M-turtle-01':3,'M-turtle-02':2,'M-turtle-03':2,'M-turtle-04':2,'W-countryside':3,'C-panda':3,'P-field_cow':2,'G-connect-four':2,'I-c_coin2':3,'G-sugoroku-race':3,'G-lunar-lander':2,'G-plane-landing':2,'E-midlife-flower':3,'I-naoto_lantern':1,'G-mini-golf-physics':3,'E-midlife-50th':2,'G-area-claim':2})},
 {id:'item',name:'アイテム・じゅんび',summary:'おうちで装備やしかけを安く並べ、準備枠がそろったらつみあげ系のあそびでそだちに変える。',
  cards:x({'M-venus_flytrap-01':3,'M-venus_flytrap-02':2,'M-venus_flytrap-03':2,'M-venus_flytrap-04':2,'M-venus_flytrap-05':1,'W-home':2,'I-bowtie':3,'I-sleepboost1':2,'I-naoto_lantern':1,'I-star':2,'G-ski-jump':2,'G-missile-command':2,'G-takoyaki-grill':2,'G-stack-themed':3,'G-stack-leaves':2,'G-gomoku-9':3,'G-connect-four':2,'P-knitting_spider':2,'C-owl':2})},
 {id:'balance',name:'バランス',summary:'メイン・なかま・こいびとを少しずつ。山札をさがすカードとそだちのカードを組み合わせる。',
  cards:x({'M-salmon-01':3,'M-salmon-02':2,'M-salmon-03':2,'M-salmon-04':2,'M-salmon-05':1,'C-owl':2,'C-chicken':2,'P-grove_deer':2,'P-high_eagle':1,'W-countryside':2,'E-first-date':2,'E-new-encounter':2,'E-mirror':2,'I-c_coin2':2,'I-sleepboost1':2,'I-bowtie':1,'G-mini-golf-physics':2,'G-sugoroku-race':2,'G-hit-blow':2,'G-baseball-batting':2,'G-ski-jump':2})},
]);
export const CPU_DECK_IDS=CPU_DECKS.map(d=>d.id);
export function cpuDeck(id){const d=CPU_DECKS.find(d=>d.id===id);if(!d)throw Error('CPUデッキが見つかりません');return d;}
// Earlier lists of a deck. A match saved with one of them keeps and restores its own 40 cards; it is never
// rewritten to the current list. New matches always use the current list.
export const CPU_DECK_HISTORY=Object.freeze({
 partner:Object.freeze([{version:'2026-10-22',cards:Object.freeze(x({'M-cat-01':3,'M-cat-02':2,'M-cat-03':2,'M-cat-04':2,'M-cat-05':1,'P-grove_deer':3,'P-high_eagle':3,'P-robot_neighbor':2,'P-cat_ceo':2,'E-first-date':3,'E-wedding-anniversary':3,'E-reconciliation':2,'I-c_match':2,'I-partner1':2,'E-new-encounter':2,'W-home':2,'C-chicken':2,'C-seal':2}))}]),
});
for(const list of Object.values(CPU_DECK_HISTORY))for(const v of list)validateDeck(v.cards);
// Which list of deck `id` these 40 cards are: 'current', an earlier version string, or null.
export function cpuDeckVersion(id,cards){const key=l=>JSON.stringify([...l].sort()),k=key(cards);if(k===key(cpuDeck(id).cards))return 'current';return (CPU_DECK_HISTORY[id]??[]).find(v=>key(v.cards)===k)?.version??null;}
// おまかせ: deterministic from a match seed, so a saved/replayed match always names the same deck.
export function pickCpuDeck(seed){if(!Number.isSafeInteger(seed)||seed<0)throw Error('seedが不正です');let n=seed>>>0;n=Math.imul(n^(n>>>16),0x45d9f3b)>>>0;n=Math.imul(n^(n>>>16),0x45d9f3b)>>>0;return CPU_DECKS[((n^(n>>>16))>>>0)%CPU_DECKS.length].id;}
for(const d of CPU_DECKS)validateDeck(d.cards);
export const CPU_DECK_MODES=Object.freeze({auto:'おまかせ',choose:'指定する',fixed:'固定（前回と同じ）',mydeck:'マイデッキ（従来）'});
// Which deck the CPU seat uses. auto: seeded pick per match; choose: the selected type; fixed: the last CPU deck
// (balance until one exists); mydeck: keep the CPU seat's selected My Deck (returns null, caller keeps that list).
export function resolveCpuDeck({mode='auto',chosen=null,last=null,seed}={}){
 if(!Object.hasOwn(CPU_DECK_MODES,mode))throw Error('CPUデッキの選び方が不正です');
 if(mode==='mydeck')return null;
 const id=mode==='auto'?pickCpuDeck(seed):mode==='choose'?cpuDeck(chosen).id:CPU_DECK_IDS.includes(last)?last:'balance';
 const d=cpuDeck(id);return {mode,id,name:d.name,seed:mode==='auto'?seed:null,cards:[...d.cards]};
}
