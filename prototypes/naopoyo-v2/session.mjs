import {clone,createState,move} from './engine.mjs';
import {enteredCells} from './input.mjs';
export class Session{
 constructor(stage,saved=null){this.stage=stage;this.state=saved?clone(saved.state):createState(stage);this.history=saved?clone(saved.history):[];this.active=null;this.lastResults=[]}
 begin(id,point){
  if(this.active||!this.state.actors.some(a=>a.id===id)||![point?.x,point?.y].every(Number.isFinite))return false;
  this.active={id,before:clone(this.state),last:{...point},cursor:{x:Math.floor(point.x),y:Math.floor(point.y)}};return true;
 }
 travel(point){
  const drag=this.active;this.lastResults=[];if(!drag||![point?.x,point?.y].every(Number.isFinite))return this.lastResults;
  for(const [x,y] of enteredCells(drag.last,point)){
   if(!this.state.actors.some(a=>a.id===drag.id))break;
   if(x===drag.cursor.x&&y===drag.cursor.y)continue;
   const result=move(this.state,drag.id,x-drag.cursor.x,y-drag.cursor.y);
   if(result.ok)drag.cursor={x,y};this.lastResults.push(result);
  }
  drag.last={...point};return this.lastResults;
 }
 snapshots(){const out=[...this.history];if(this.active&&JSON.stringify(this.state)!==JSON.stringify(this.active.before))out.push(clone(this.active.before));return out.slice(-80)}
 end(){if(!this.active)return;this.history=this.snapshots();this.active=null}
 undo(){this.end();if(!this.history.length)return false;this.state=this.history.pop();this.lastResults=[];return true}
 retry(){this.state=createState(this.stage);this.history=[];this.active=null;this.lastResults=[]}
}
