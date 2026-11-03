// Experiment decks. Every list is derived from the official CPU decks (cpu-decks.mjs, read-only) by an
// explicit replacement; nothing else changes. Replacements keep the replaced copies at the same list
// positions, so with the same order seed both seats get the same opening hands apart from those cards.
import {CPU_DECKS} from '../../cpu-decks.mjs';
const base=id=>{const d=CPU_DECKS.find(x=>x.id===id);if(!d)throw Error('unknown CPU deck '+id);return [...d.cards];};
// Replace `n` copies of `from` (first occurrences) by `to`, in place.
function swap(list,from,to,n){let left=n;const out=list.map(id=>id===from&&left>0?(left--,to):id);if(left)throw Error(`not enough ${from}`);return out;}
const S='E-misunderstanding',AM='E-amicable-breakup';
export const DECKS={
 // Lover side (X). Official lists; C-plan copies replace two support cards by the trial card.
 partner:{label:'こいびと・交際（公式CPU・こいびと6枚）',cards:base('partner')},
 balance:{label:'バランス（公式CPU・こいびと3枚）',cards:base('balance')},
 'partner+AM':{label:'こいびと・交際：なかなおり2→円満な別れ2',cards:swap(base('partner'),'E-reconciliation',AM,2),replaced:{from:'E-reconciliation',to:AM,n:2}},
 'balance+AM':{label:'バランス：ヒット＆ブロー2→円満な別れ2',cards:swap(base('balance'),'G-hit-blow',AM,2),replaced:{from:'G-hit-blow',to:AM,n:2}},
 challenge:{label:'ちょうせん（公式CPU・すれちがいなし）',cards:base('challenge')},
 // Opponent side (Y): official lists with two すれちがい, so breakups actually happen.
 'challenge+S':{label:'ちょうせん：としをとったじぶん2→すれちがい2',cards:swap(base('challenge'),'E-mirror',S,2),replaced:{from:'E-mirror',to:S,n:2}},
 'growth+S':{label:'そだち獲得：ミニゴルフ2→すれちがい2',cards:swap(base('growth'),'G-mini-golf-physics',S,2),replaced:{from:'G-mini-golf-physics',to:S,n:2}},
 'item+S':{label:'アイテム・じゅんび：ごもく2→すれちがい2',cards:swap(base('item'),'G-gomoku-9',S,2),replaced:{from:'G-gomoku-9',to:S,n:2}},
 'partner+S':{label:'こいびと・交際：なかなおり2→すれちがい2（恋人デッキ同士）',cards:swap(base('partner'),'E-reconciliation',S,2),replaced:{from:'E-reconciliation',to:S,n:2}},
 // Abuse probe (plan C only): the official lover deck with ねこ社長 (an on-placement trigger) instead of こだちのシカ.
 abuse:{label:'こいびと・交際：こだちのシカ3→ビルのねこ社長3',cards:swap(base('partner'),'P-grove_deer','P-cat_ceo',3),replaced:{from:'P-grove_deer',to:'P-cat_ceo',n:3}},
 // Three trial cards here (per-name limit) so the loop is actually available in most games.
 'abuse+AM':{label:'こいびと・交際：こだちのシカ3→ねこ社長3、なかなおり2・あたらしいであい1→円満な別れ3',cards:swap(swap(swap(base('partner'),'P-grove_deer','P-cat_ceo',3),'E-reconciliation',AM,2),'E-new-encounter',AM,1),replaced:{from:'P-grove_deer×3, E-reconciliation×2, E-new-encounter×1',to:'P-cat_ceo×3, '+AM+'×3',n:6}},
 // Forced-breakup opponent: three すれちがい (the per-name limit), used only at the scripted stage.
 'challenge+S3':{label:'ちょうせん：としをとったじぶん2・ストリートファイト1→すれちがい3',cards:swap(swap(base('challenge'),'E-mirror',S,2),'G-street-fight',S,1),replaced:{from:'E-mirror×2, G-street-fight×1',to:S,n:3}},
};
// Which X list a variant uses (C-family variants carry the trial card or its control).
export const xDeck=(x,variant)=>['C','C2','Cx'].includes(variant)?x+'+AM':x;
