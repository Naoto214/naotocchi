// VERSION 7 (2026-11-04): the 7 cards fixed as the official-introduction candidates, in the official catalog structure.
// NOT part of the official catalog. Only the candidate build (build-candidate.mjs) and the trial use this file.
// IDs: type prefix + slug like the 452 official IDs; none collides with them (checked by test-candidate.mjs).
// The effects are the ones the owner fixed (VERSION 4–6, unchanged); the texts are the candidate wording (U-items: wording).
import {createHash} from 'node:crypto';import {readFileSync,existsSync} from 'node:fs';
// Provenance like the official catalog (build_full_catalog.py): source = '<file in docs/card-game>#<heading>', source_sha256 = the
// whole file. The candidate's source file is integration/481-time-reversal-cards.md (generated from DEFS below; it moves to
// docs/card-game/ on adoption). The texts below are the only place the wording is written.
export const CANDIDATE_DOC='481-time-reversal-cards.md',CANDIDATE_DOC_PATH=new URL('./'+CANDIDATE_DOC,import.meta.url);
const docSha=existsSync(CANDIDATE_DOC_PATH)?createHash('sha256').update(readFileSync(CANDIDATE_DOC_PATH)).digest('hex'):'missing';
// VERSION 8 (U9, owner's decision): short card texts. The shared time-card rules (both players, counter, discard, resolution
// order, 100維持) are written once in the rulebook section RULEBOOK_TIME_CARDS (integration/481-time-reversal-cards.md §1).
const TIME_TEXT=n=>`【時のカード】終了ラウンドを${n}にする。`;
export const RULEBOOK_TIME_CARDS=[
 '終了ラウンドは両者共通で、対戦の始めは10。終了ラウンドの後攻の番が終わったら最終比較をする。',
 '時のカード（IX・X・XI・XII）は、自分の番にふつうのセカイと同じように出す。出した時、終了ラウンドをそのカードの数にする。現在のラウンドより前の数にはできない（そのカードは出せない）。',
 '相手の時のカードの効果が解決を待っている間、手札の時のカードをカウンターとして出してよい（時はふつうに払う。何回でも続けられる）。同じ数でもカウンターできる。',
 'カウンターが続いた時は、最後に出された時のカードだけが成立する。それより前の時のカードは効果がなく、捨て札に置く。終了ラウンドは、すべての応答が終わってから一度だけ変わる。',
 '100維持の判定は、終了ラウンドより前のラウンドだけで行う。',
 '「負けている」は、自分のそだちが相手より少ないこと。',
];
const DEFS=[
 ['W-time-ix','IX','world',2,TIME_TEXT(9)],
 ['W-time-x','X','world',2,TIME_TEXT(10)],
 ['W-time-xi','XI','world',2,TIME_TEXT(11)],
 ['W-time-xii','XII','world',2,TIME_TEXT(12)],
 ['E-hayajimai','はやじまい','event',2,'負けていて、終了ラウンドが次のラウンドの時に使える。そだち+5（終了ラウンドが10なら+10、9なら+15）。1ターンに1回。','すぐつかう'],
 ['E-nagaiki','ながいきのひけつ','event',2,'そだち+5。効果を解決する直前に、終了ラウンドが11以上で負けているなら、さらに+10。','すぐつかう'],
 ['E-omoide-photo','おもいでのしゃしん','event',2,'終了ラウンドのラウンドに使える。自分のなかま・こいびと・セカイ（時のカードを除く）1枚につきそだち+5（最大+15）。1ターンに1回。','すぐつかう'],
];
// Same keys and order as the official entries (id, name, type, cost, rare, text, source, source_sha256[, method]).
export const CANDIDATE_CARDS=Object.freeze(Object.fromEntries(DEFS.map(([id,name,type,cost,text,method])=>[id,Object.freeze({id,name,type,cost,rare:false,text,
 source:`${CANDIDATE_DOC}#${id} — ${name}`,source_sha256:docSha,...(method?{method}:{})})])));
export const CANDIDATE_IDS=Object.freeze(Object.keys(CANDIDATE_CARDS));
export const TIME_IDS=Object.freeze({IX:'W-time-ix',X:'W-time-x',XI:'W-time-xi',XII:'W-time-xii'});
// Experiment ID → candidate ID (the experiment builds and records keep their X-* IDs).
export const ID_MAP=Object.freeze({'X-T-IX':'W-time-ix','X-T-X':'W-time-x','X-T-XI':'W-time-xi','X-T-XII':'W-time-xii','X-N-hayajimai':'E-hayajimai','X-N-nagaiki':'E-nagaiki','X-N-photo':'E-omoide-photo'});
export const mapId=id=>ID_MAP[id]??id;
export const unmapId=(()=>{const r=Object.fromEntries(Object.entries(ID_MAP).map(([a,b])=>[b,a]));return id=>r[id]??id;})();
// Rule programs (rules.mjs `add(...)` lines) of the candidates: the confirmed experiment programs with the IDs mapped.
export function candidateRules(){
 const v=(value,op,n)=>JSON.stringify({value,op,n}),all=(...c)=>`{"all":[${c.join(',')}]}`,g=n=>`{"op":"growth","n":${n},"to":"self"}`,iff=(c,s)=>`{"op":"if","condition":${c},"steps":[${s.join(',')}]}`;
 const behind=v('growth','lt',{value:'opponentGrowth'});
 return '\n// ---- official-introduction candidates (variable-life-20261031 VERSION 7) ----\n'+[
  ...Object.entries(TIME_IDS).map(([name,id])=>{const n={IX:9,X:10,XI:11,XII:12}[name];return `add('${id}',{mode:'world',placeCondition:'roundAtMost${n}',reaction:'timeCounter',triggers:[{when:'place',mandatory:true,steps:[{op:'timeSet',n:${n}}]}]});`;}),
  `add('E-hayajimai',{mode:'quick',condition:${all(behind,v('roundsLeft','eq',1))},onceName:true,steps:[${g(5)},${iff(v('final','lte',10),[g(5)])},${iff(v('final','eq',9),[g(5)])}]});`,
  `add('E-nagaiki',{mode:'quick',steps:[${iff(all(v('final','gte',11),behind),[g(10)])},${g(5)}]});`,
  `add('E-omoide-photo',{mode:'quick',condition:${v('roundsLeft','eq',0)},onceName:true,steps:[{op:'growthByValue',key:'photoCount',per:5,max:15}]});`,
 ].join('\n')+'\n';
}
