import {clone,createState,move,mass,totals} from './engine.mjs';
import {timeHandTrace} from './priorities.mjs';
import {stages} from './stages.mjs';
export const STORAGE_KEY='naopoyo.time-hand-dungeon.20261102.v6';
// Includes stage layout and all explicit rule options; rejected before replay.
export const stageSignature=index=>JSON.stringify(['dungeon-v6',stages[index].board]);
export class ChapterSession {
 constructor(index=0){if(!stages[index])throw new RangeError('stage');this.index=index;this.stage=stages[index];this.reset();}
 reset(){this.state=createState(this.stage.board);this.actions=[];this.groups=[];this.records=[];this.gesture=null;return this;}
 get cleared(){return this.state.actors.length===0;}
 beginGesture(){if(this.gesture===null)this.gesture=this.actions.length;}
 endGesture(){this.gesture=null;}
 preview(id,dx,dy){
  const state=clone(this.state),record={births:[],trace:null,events:[],direction:[dx,dy],parent:id};
  const policy={};policy.observeSplit=e=>{
   if(record.trace)return;record.births=clone(e.children);record.spawn=clone(e.state);record.parent=e.parentId;
   const before=clone(e.state);before.actors=before.actors.filter(a=>!e.children.some(v=>v.id===a.id));const a=before.actors.find(a=>a.id===e.parentId);a.level+=e.children.length;
   record.trace=timeHandTrace(before,a.x,a.y,...e.direction,a,policy);record.direction=e.direction;
  };
  const result=move(state,id,dx,dy,policy);record.events=clone(result.events||[]);
  if(result.ok){
   if(mass(state)!==mass(this.state)||JSON.stringify(Object.entries(totals(state)).sort())!==JSON.stringify(Object.entries(totals(this.state)).sort()))throw Error('mass mismatch');
  }
  return {result,state,record};
 }
 step(id,dx,dy){
  if(this.cleared||this.actions.length>=500)return {ok:false,reason:'limit'};
  const p=this.preview(id,dx,dy);if(!p.result.ok)return p.result;
  const group=this.gesture??this.actions.length;if(this.groups.at(-1)!==group)this.groups.push(group);
  this.state=p.state;this.actions.push([id,dx,dy]);this.records.push(p.record);return {...p.result,events:p.record.events};
 }
 undo(){if(!this.actions.length)return false;const start=this.groups.at(-1),actions=this.actions.slice(0,start),groups=this.groups.slice(0,-1);this.reset();for(const [i,a]of actions.entries()){if(groups.includes(i))this.beginGesture();this.step(...a);if(groups.includes(i+1))this.endGesture();}this.endGesture();return true;}
 serialize(){return JSON.stringify({version:6,stage:this.index,definition:stageSignature(this.index),actions:this.actions,groups:this.groups});}
 restore(raw){try{const d=typeof raw==='string'?JSON.parse(raw):raw;
  if(d.version!==6||d.stage!==this.index||d.definition!==stageSignature(this.index)||!Array.isArray(d.actions)||d.actions.length>500||!Array.isArray(d.groups)||d.groups.some((g,i)=>!Number.isInteger(g)||g<0||g>=d.actions.length||(i?g<=d.groups[i-1]:g!==0))||Boolean(d.actions.length)!==Boolean(d.groups.length))return false;
  const q=new ChapterSession(this.index);
  for(const [i,a]of d.actions.entries()){if(d.groups.includes(i))q.beginGesture();if(!Array.isArray(a)||a.length!==3||typeof a[0]!=='string'||!q.step(...a).ok)return false;if(d.groups.includes(i+1))q.endGesture();}q.endGesture();Object.assign(this,{state:q.state,actions:q.actions,groups:q.groups,records:q.records,gesture:null});return true;
 }catch{return false;}}
}
