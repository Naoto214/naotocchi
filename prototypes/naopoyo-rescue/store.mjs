import{stages}from'./stages.mjs';import{validState}from'./engine.mjs';
import {stages as previous} from './previous-stages.mjs';
import {legacyStages} from './legacy-stages.mjs';
export const KEY='naopoyo-rescue-v1';
// Exact terrain shipped by PR #418 at 702721a. Keep its occupants and Undo
// snapshots on that terrain; retry creates a state from the current stages.
const clearanceWalls={6:[[3,0],[2,1],[2,3],[3,4],[3,5]],
 9:[[3,0],[2,1],[3,3],[3,5],[4,3],[5,3]],
 11:[[3,0],[4,1],[4,3],[3,4],[3,5]]};
export const pack=(index,state,history,cleared)=>JSON.stringify({version:1,index,state,history:history.slice(-80),cleared});
export function restore(raw){try{
 const p=JSON.parse(raw),stage=stages[p.index];
 if(p.version!==1||!Number.isInteger(p.index)||!stage||!Array.isArray(p.history)||p.history.length>80||!Array.isArray(p.cleared)||!p.cleared.every(id=>stages.some(s=>s.id===id)))return null;
 const oldLegacy=p.index===6?{...previous[6],walls:[]}:p.index===9?{...previous[9],walls:[[3,3],[4,3],[5,3]]}:null;
 // Preserve pre-clearance v1 saves and Undo exactly; retry selects the new terrain.
 const beforeDiagonal=[6,9,11].includes(p.index)?{...stage,walls:previous[p.index].walls.filter(([x,y])=>p.index!==9||x!==3||y!==4)}:null;
 const clearance=clearanceWalls[p.index]?{...stage,walls:clearanceWalls[p.index]}:null;
 const accepts=s=>[stage,clearance,beforeDiagonal,legacyStages.get(p.index),previous[p.index],oldLegacy].filter(Boolean).some(st=>validState(st,s));
 if(![p.state,...p.history].every(accepts))return null;
 // Same v1 schema and actor/history data; only add the newly required fish passage.
 if(p.index===9)for(const s of [p.state,...p.history])if(s.gates.length===1){s.gates.push({...stage.gates[1],...(s.actors.some(a=>a.x===3&&a.y===4)?{open:true}:{})});s.walls=s.walls.filter(([x,y])=>x!==3||y!==4);}
 return p;
 }catch{return null}}
