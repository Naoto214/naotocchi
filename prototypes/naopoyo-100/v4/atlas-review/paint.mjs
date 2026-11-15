import {renderDraft} from '../v6/render.mjs';
import {renderStudy} from '../v6/gimmick-study.mjs';
import {describeTiles} from '../../engine.mjs';
import {reviewEntries} from './review.mjs';
import {targets} from './scenes.mjs';
const buffers=new WeakMap();
const controls=new Set(['fixture.plate.hold','fixture.plate.weight','fixture.latch','fixture.toggle','fixture.sequence','fixture.door','npc.owl']);
export function comparisonCells(scene,state){
 const selected=targets(scene.id,scene,state);if(!controls.has(scene.id))return selected;
 const all=describeTiles(state).filter(t=>controls.has(t.catalogId));
 const keys=t=>t.catalogId==='fixture.door'?[...(t.params.needs||[]),...(t.params.any||[])]:[t.params.groupId||t.params.id];
 const linked=new Set(selected.flatMap(keys).filter(Boolean));let changed=true;
 while(changed){changed=false;for(const t of all)if(keys(t).some(k=>linked.has(k)))for(const k of keys(t))if(k&&!linked.has(k)){linked.add(k);changed=true;}}
 return all.filter(t=>keys(t).some(k=>linked.has(k)));
}
export function renderReview(canvas,scene,state,options={},style='old'){
 renderDraft(canvas,scene.lab?scene.lab.document.d:scene.d,state,options);
 if(style!=='candidate'||!reviewEntries.find(e=>e.id===scene.id)?.inkCandidate)return;
 let buffer=buffers.get(canvas);if(!buffer){buffer=document.createElement('canvas');buffers.set(canvas,buffer);}
 buffer.getBoundingClientRect=()=>canvas.getBoundingClientRect();
 renderStudy(buffer,scene.lab?scene.lab.document.d:scene.d,state,options,'candidate',scene.lab?.session.state);
 const tiles=describeTiles(state),unit=canvas.width/8,c=canvas.getContext('2d');c.save();c.setTransform(1,0,0,1,0,0);
 for(const t of comparisonCells(scene,state)){
  // Approved fixtures always win even if a target shares their cell.
  if(tiles.some(v=>v.x===t.x&&v.y===t.y&&['fixture.exit','fixture.gate','fixture.warp','sign.gravity'].includes(v.catalogId)))continue;
  c.drawImage(buffer,t.x*unit,t.y*unit,unit,unit,t.x*unit,t.y*unit,unit,unit);
 }
 c.restore();
}
export function drawTile(canvas,board,target,px){
 const unit=board.width/8;canvas.width=canvas.height=Math.round(unit);if(canvas.style){canvas.style.width=canvas.style.height=px+'px';}
 const c=canvas.getContext('2d');c.clearRect(0,0,canvas.width,canvas.height);
 if(target)c.drawImage(board,target.x*unit,target.y*unit,unit,unit,0,0,canvas.width,canvas.height);
}
