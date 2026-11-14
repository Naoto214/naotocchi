export const cardinal=[[1,0],[0,1],[-1,0],[0,-1]];
export const validMove=a=>a?.type==='move'&&Number.isInteger(a.dx)&&Number.isInteger(a.dy)&&Math.abs(a.dx)+Math.abs(a.dy)===1;
export function searchLab(initial,step,{limit=20000,forbid=()=>false}={}){const queue=[{s:structuredClone(initial),path:[]}],seen=new Set();let expanded=0;for(let i=0;i<queue.length;i++){const n=queue[i];if(n.s.actors.length===0)return{status:'shortest',solution:n.path,expanded};if(expanded>=limit)return{status:'limit',expanded};expanded++;for(const actor of n.s.actors)for(const [dx,dy]of cardinal)for(const type of n.s.variant==='D2'?['move','dig']:['move']){const a={type,id:actor.id,dx,dy};if(forbid(n.s,a))continue;const r=step(n.s,a);if(!r.ok)continue;const key=JSON.stringify({...r.state,moves:0});if(seen.has(key))continue;seen.add(key);queue.push({s:r.state,path:[...n.path,a]})}}return{status:'exhausted',expanded}}
export class LabSession{
 constructor(kind,variant,factory,step){this.kind=kind;this.variant=variant;this.factory=factory;this.step=step;this.state=factory(variant);this.past=[];this.actions=[]}
 act(action){const r=this.step(this.state,action);if(r.ok){this.past.push(structuredClone(this.state));this.state=r.state;this.actions.push(structuredClone(action))}return r}
 undo(){if(this.past.length){this.state=this.past.pop();this.actions.pop()}return this.state}
 reset(){this.state=this.factory(this.variant);this.past=[];this.actions=[]}
 serialize(){return JSON.stringify({schemaVersion:1,kind:this.kind,variant:this.variant,actions:this.actions})}
}
export function restoreLab(text,kind,factory,step){if(typeof text!=='string'||text.length>500000)throw Error('実験保存が大きすぎます');const d=JSON.parse(text);if(!d||Object.keys(d).some(k=>!['schemaVersion','kind','variant','actions'].includes(k))||d.schemaVersion!==1||d.kind!==kind||!(kind==='flight'?['F1','F2']:['D1','D2']).includes(d.variant)||!Array.isArray(d.actions)||d.actions.length>1000)throw Error('別の実験形式です');const l=new LabSession(kind,d.variant,factory,step);for(const a of d.actions){if(!a||Object.keys(a).some(k=>!['type','id','dx','dy','species','level'].includes(k))||!l.act(a).ok)throw Error('実験履歴を再生できません')}return l}
