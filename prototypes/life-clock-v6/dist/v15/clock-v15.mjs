import{render as prior,sample}from'../v14/clock-v14.mjs';export * from '../v14/clock-v14.mjs';
// D is explicitly the protected V14 face pending safe ring/foliage separation.
export function render(state=sample,{variant='D',crop='full'}={}){return prior(state,{variant:variant==='D'?'C':variant,crop});}
