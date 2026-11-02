import {clone,createState,move,mass} from './engine.mjs';
import {timeHandTrace} from './priorities.mjs';
import {lessons} from './lessons.mjs';
export const STORAGE_KEY='naopoyo.time-hand-tutorial.20261102.v1';
export class TutorialSession {
 constructor(index=0){if(!lessons[index])throw new RangeError('lesson');this.index=index;this.lesson=lessons[index];this.reset();}
 reset(){this.state=createState(this.lesson.board);this.actions=[];this.records=[];return this;}
 get cleared(){
  const l=this.lesson,split=this.records.find(r=>r.births.length===l.count&&r.parent==='parent');if(!split)return false;
  const turns=split.trace.candidates.slice(0,l.count).filter(c=>c.turns>0).length;
  if(l.turns&&turns<l.turns)return false;
  if(l.target){
   const friend=split.spawn.actors.find(a=>a.id==='friend');
   const steered=friend&&split.trace.candidates.slice(0,l.count).some(c=>c.turns>0&&split.trace.attempts.some(a=>a.reason==='仲間'&&a.from[0]===c.from[0]&&a.from[1]===c.from[1]&&a.to[0]===friend.x&&a.to[1]===friend.y));
   if(!steered||!this.actions.some(a=>a[0]==='friend')||!split.births.some(a=>a.x===l.target[0]&&a.y===l.target[1]))return false;
  }
  if(l.diagonal&&(!(split.direction[0]===1&&split.direction[1]===1)||!split.trace.attempts.some(a=>a.reason==='角抜け')))return false;
  if(l.gravity&&(!split.events.some(e=>e.type==='fall')||!split.events.some(e=>e.type==='merge')))return false;
  if(l.exit)return this.state.rescued===8&&this.state.actors.length===0&&this.records.some(r=>r.events.some(e=>e.type==='merge'&&e.level===8));
  return true;
 }
 preview(id,dx,dy){
  const state=clone(this.state),births=[];let spawn=null,trace=null,parent=null,direction=null;
  const result=move(state,id,dx,dy,{observeSplit:e=>{
   if(spawn)return;spawn=clone(e.state);births.push(...e.children);parent=e.parentId;direction=e.direction;
   const before=clone(e.state);before.actors=before.actors.filter(a=>!e.children.some(c=>c.id===a.id));const body=before.actors.find(a=>a.id===parent);body.level+=e.children.length;
   trace=timeHandTrace(before,body.x,body.y,...direction,body);
  }});
  if(mass(state)!==mass(this.state))throw new Error('mass mismatch');
  return {result,state,record:{births,spawn,trace,parent,direction,events:clone(result.events||[])}};
 }
 step(id,dx,dy){
  if(this.actions.length>=500)return {ok:false,reason:'limit'};
  const p=this.preview(id,dx,dy);if(!p.result.ok)return p.result;
  this.state=p.state;this.actions.push([id,dx,dy]);this.records.push(p.record);return p.result;
 }
 undo(){if(!this.actions.length)return false;const actions=this.actions.slice(0,-1);this.reset();for(const a of actions)this.step(...a);return true;}
 serialize(){return JSON.stringify({version:1,lesson:this.index,actions:this.actions});}
 restore(raw){
  try{const data=typeof raw==='string'?JSON.parse(raw):raw;
   if(data.version!==1||data.lesson!==this.index||!Array.isArray(data.actions)||data.actions.length>500)return false;
   const fresh=new TutorialSession(this.index);
   for(const a of data.actions)if(!Array.isArray(a)||a.length!==3||typeof a[0]!=='string'||!fresh.step(...a).ok)return false;
   this.state=fresh.state;this.actions=fresh.actions;this.records=fresh.records;return this;
  }catch{return false;}
 }
}
