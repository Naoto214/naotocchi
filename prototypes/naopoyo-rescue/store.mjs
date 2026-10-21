import{stages}from'./stages.mjs';import{validState}from'./engine.mjs';
export const KEY='naopoyo-rescue-v1';
export const pack=(index,state,history,cleared)=>JSON.stringify({version:1,index,state,history:history.slice(-80),cleared});
export function restore(raw){try{const p=JSON.parse(raw),stage=stages[p.index];if(p.version!==1||!Number.isInteger(p.index)||!stage||!validState(stage,p.state)||!Array.isArray(p.history)||p.history.length>80||!p.history.every(s=>validState(stage,s))||!Array.isArray(p.cleared)||!p.cleared.every(id=>stages.some(s=>s.id===id)))return null;return p}catch{return null}}
