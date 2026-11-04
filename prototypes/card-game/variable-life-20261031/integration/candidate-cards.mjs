// VERSION 7 (2026-11-04): the 7 cards fixed as the official-introduction candidates, in the official catalog structure.
// NOT part of the official catalog. Only the candidate build (build-candidate.mjs) and the trial use this file.
// IDs: type prefix + slug like the 452 official IDs; none collides with them (checked by test-candidate.mjs).
// The effects are the ones the owner fixed (VERSION 4–6, unchanged); the texts are the candidate wording (U-items: wording).
import {createHash} from 'node:crypto';
export const CANDIDATE_SOURCE='variable-life-20261031/integration/CANDIDATE-V7.md';
const sha=t=>createHash('sha256').update(t).digest('hex');
const TIME_TEXT=n=>`このカードを出した時、終了ラウンドを${n}にする（両者共通）。現在のラウンドが${n}より後なら出せない。`
 +'相手の時のカードの効果が解決を待っている間、手札のこのカードをカウンターとして出してもよい（時はふつうに払う）。'
 +'カウンターが続いた時は、最後に出された時のカードだけが成立し、それより前の時のカードは効果がなく捨て札に置く。終了ラウンドは、すべての応答のあとに一度だけ変わる。';
const DEFS=[
 ['W-time-ix','IX','world',2,TIME_TEXT(9)],
 ['W-time-x','X','world',2,TIME_TEXT(10)],
 ['W-time-xi','XI','world',2,TIME_TEXT(11)],
 ['W-time-xii','XII','world',2,TIME_TEXT(12)],
 ['E-hayajimai','はやじまい','event',2,'自分のそだちが相手より少なく、終了ラウンドが現在のラウンドの次のラウンドの場合に発動できる。終了ラウンドが9なら自分のそだち+15、10なら+10、11以上なら+5。この名前のカードは1ターンに1回しか発動できない。','すぐつかう'],
 ['E-nagaiki','ながいきのひけつ','event',2,'自分のそだち+5。この効果の解決直前に、終了ラウンドが11以上で、自分のそだちが相手より少ない場合、さらに自分のそだち+10。','すぐつかう'],
 ['E-omoide-photo','おもいでのしゃしん','event',2,'現在のラウンドが終了ラウンドの場合に発動できる。自分の場の、なかま・こいびと・セカイ（時のカードを除く）の枚数1枚につき自分のそだち+5（最大+15）。この名前のカードは1ターンに1回しか発動できない。','すぐつかう'],
];
// Same keys and order as the official entries (id, name, type, cost, rare, text, source, source_sha256[, method]).
export const CANDIDATE_CARDS=Object.freeze(Object.fromEntries(DEFS.map(([id,name,type,cost,text,method])=>[id,Object.freeze({id,name,type,cost,rare:false,text,
 source:`${CANDIDATE_SOURCE}#${id} — ${name}`,source_sha256:sha(text),...(method?{method}:{})})])));
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
