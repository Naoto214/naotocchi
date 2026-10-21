import{stages}from'./stages.mjs';import{validState}from'./engine.mjs';
import {legacyStages} from './legacy-stages.mjs';
export const KEY='naopoyo-rescue-v1';
export const pack=(index,state,history,cleared)=>JSON.stringify({version:1,index,state,history:history.slice(-80),cleared});
export function restore(raw){try{const p=JSON.parse(raw),stage=stages[p.index];const accepts=s=>validState(stage,s)||legacyStages.has(p.index)&&validState(legacyStages.get(p.index),s);if(p.version!==1||!Number.isInteger(p.index)||!stage||!accepts(p.state)||!Array.isArray(p.history)||p.history.length>80||!p.history.every(accepts)||!Array.isArray(p.cleared)||!p.cleared.every(id=>stages.some(s=>s.id===id)))return null;return p}catch{return null}}

