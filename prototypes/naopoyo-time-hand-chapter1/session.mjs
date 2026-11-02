import {clone,createState,move,mass,totals} from './engine.mjs';
import {timeHandTrace} from './priorities.mjs';
import {stages} from './stages.mjs';
export const STORAGE_KEY='naopoyo.time-hand-dungeon.20261102.v1';
export class ChapterSession {
 constructor(index=0){if(!stages[index])throw new RangeError('stage');this.index=index;this.stage=stages[index];this.reset();}
 reset(){this.state=createState(this.stage.board);this.state.cageOpen=!this.stage.cage;this.state.partnerHelp=false;this.state.learned=!this.stage.objective;this.actions=[];this.groups=[];this.records=[];this.gesture=null;return this;}
 get cleared(){return this.state.actors.length===0&&this.state.learned&&(!this.stage.cage||this.state.cageOpen&&this.state.partnerHelp);}
 beginGesture(){if(this.gesture===null)this.gesture=this.actions.length;}
 endGesture(){this.gesture=null;}
 policy(state){const c=this.stage.cage;return {canEnter:(s,a,x,y)=>{
  if(c&&!s.cageOpen&&(c.bars.some(p=>p[0]===x&&p[1]===y)||s.actors.some(p=>p.id===c.actor&&p.x===x&&p.y===y)))return false;
  if(s.exits.some(e=>e.x===x&&e.y===y)&&(!s.learned||c&&!s.partnerHelp))return false;
  return true;
 }};}
 preview(id,dx,dy){
  const state=clone(this.state),record={births:[],trace:null,events:[],direction:[dx,dy],parent:id};const c=this.stage.cage;
  if(c&&!state.cageOpen&&id===c.actor)return {result:{ok:false,reason:'captive'},state,record};
  const policy=this.policy(state);policy.observeSplit=e=>{
   if(record.trace)return;record.births=clone(e.children);record.spawn=clone(e.state);record.parent=e.parentId;
   const before=clone(e.state);before.actors=before.actors.filter(a=>!e.children.some(v=>v.id===a.id));const a=before.actors.find(a=>a.id===e.parentId);a.level+=e.children.length;
   record.trace=timeHandTrace(before,a.x,a.y,...e.direction,a,policy);record.direction=e.direction;
  };
  const result=move(state,id,dx,dy,policy);record.events=clone(result.events||[]);
  if(result.ok){
   const o=this.stage.objective;
   if(o){const all=[...this.records,record];let learned=true;
    if(o.count)learned=all.some(r=>{
     if(r.births.length!==o.count)return false;
     if(o.turns&&r.trace.candidates.slice(0,o.count).filter(p=>p.turns>0).length<o.turns)return false;
     if(o.diagonal&&(!r.direction[0]||!r.direction[1]))return false;
     if(o.support){const a=r.spawn.actors.find(a=>a.id===r.parent);if(!r.spawn.actors.some(p=>p.species!==a.species&&p.x===a.x&&p.y===a.y+1))return false;}
     if(o.friend){const f=r.spawn.actors.find(a=>a.id==='friend');if(!f||!r.trace.attempts.some(t=>t.reason==='仲間'&&t.to[0]===f.x&&t.to[1]===f.y)||!this.actions.some(a=>a[0]==='friend')||!r.births.some(a=>a.x===o.target[0]&&a.y===o.target[1]))return false;}
     return true;
    });
    if(o.merge)learned=learned&&all.some(r=>r.events.some(e=>e.type==='merge'&&e.level>=o.merge));
    if(o.gate)learned=learned&&all.some(r=>r.events.some(e=>e.type==='phase'));
    state.learned=state.learned||learned;
   }
   if(c){const a=state.actors.find(a=>a.x===c.switch.x&&a.y===c.switch.y&&a.level===c.switch.exact);
    if(!state.cageOpen&&a&&state.learned){state.cageOpen=true;record.events.push({type:'release'});}
    if(state.cageOpen&&state.actors.some(a=>a.id===c.actor&&a.x===c.partnerSwitch.x&&a.y===c.partnerSwitch.y)){state.partnerHelp=true;record.events.push({type:'partner-help'});}
   }
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
 serialize(){return JSON.stringify({version:1,stage:this.index,actions:this.actions,groups:this.groups});}
 restore(raw){try{const d=typeof raw==='string'?JSON.parse(raw):raw;
  if(d.version!==1||d.stage!==this.index||!Array.isArray(d.actions)||d.actions.length>500||!Array.isArray(d.groups)||d.groups.some((g,i)=>!Number.isInteger(g)||g<0||g>=d.actions.length||(i?g<=d.groups[i-1]:g!==0))||Boolean(d.actions.length)!==Boolean(d.groups.length))return false;
  const q=new ChapterSession(this.index);
  for(const [i,a]of d.actions.entries()){if(d.groups.includes(i))q.beginGesture();if(!Array.isArray(a)||a.length!==3||typeof a[0]!=='string'||!q.step(...a).ok)return false;if(d.groups.includes(i+1))q.endGesture();}q.endGesture();Object.assign(this,{state:q.state,actions:q.actions,groups:q.groups,records:q.records,gesture:null});return true;
 }catch{return false;}}
}
