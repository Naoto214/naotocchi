import {validState} from './engine.mjs';
export const KEY='naopoyo-v2-continuous-20261022';
export function pack(session,cleared){return JSON.stringify({version:2,stageId:session.stage.id,state:session.state,history:session.snapshots(),cleared})}
export function restore(raw,stages){
 try{if(typeof raw!=='string'||raw.length>2e6)return null;const p=JSON.parse(raw),stage=stages.find(s=>s.id===p.stageId);
  if(p.version!==2||!stage||!validState(stage,p.state)||!Array.isArray(p.history)||p.history.length>80||!p.history.every(s=>validState(stage,s))||!Array.isArray(p.cleared)||p.cleared.length>stages.length||new Set(p.cleared).size!==p.cleared.length||!p.cleared.every(id=>stages.some(s=>s.id===id)))return null;
  return p;
 }catch{return null}
}
