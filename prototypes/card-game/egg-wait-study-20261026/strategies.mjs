// EXPERIMENT ONLY. Comparison strategies for the egg-wait study. Each one is a filter in front of the
// unchanged official CPU (cpu-policy.mjs heuristic-1): it removes "birth" candidates while the strategy says
// "stay an egg", and otherwise lets the official evaluation choose. Nothing here is used by the game runtime.
const isBirth=a=>a.kind==='place'&&a.slot==='main'&&a.variant==='birth';
export const STRATEGIES={
 // A: official CPU as is. It scores birth at 40+, so it hatches at the first affordable chance.
 A_early:{label:'A 序盤からたんじょう（正式CPUそのまま）',filter:(o,acts)=>acts},
 // B: stay an egg through R3 (three egg exchanges), hatch normally from R4.
 B_wait3:{label:'B R1〜R3はたまご、R4から通常',filter:(o,acts)=>o.round<=3?acts.filter(a=>!isBirth(a)):acts},
 // C: stay an egg through R6; from R7 only the highest affordable stage may be born (direct high-stage birth).
 C_late7:{label:'C R6までたまご、R7以降は最高段階で直接たんじょう',filter:(o,acts)=>{
  if(o.round<=6)return acts.filter(a=>!isBirth(a));
  const births=acts.filter(isBirth);if(!births.length)return acts;
  const top=Math.max(...births.map(a=>a.card?.stage??0));return acts.filter(a=>!isBirth(a)||(a.card?.stage??0)===top);}},
 // D: never hatch; play only the non-main cards.
 D_never:{label:'D 最後までたまご（メイン以外で戦う）',filter:(o,acts)=>acts.filter(a=>!isBirth(a))},
};
export const STRATEGY_IDS=Object.keys(STRATEGIES);
