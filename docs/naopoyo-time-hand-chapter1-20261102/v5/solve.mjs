import {stages} from '../../../prototypes/naopoyo-time-hand-chapter1/stages.mjs';
import {createState,move,complete} from '../../../prototypes/naopoyo-time-hand-chapter1/engine.mjs';
import fs from 'node:fs';
const dirs=[[1,0],[0,1],[0,-1],[-1,0],[1,1],[1,-1],[-1,1],[-1,-1]];
const starts=[[],[['parent',1,0]],[['parent',1,0]],[['parent',1,0]],[],[['parent',1,0]],[['friend',0,1],['parent',1,0]],[['parent',1,1]],[['parent',1,0]],[['parent',1,0],['parent',1,0],['child1',1,0],['child1',1,0],['child2',1,0],['child2',1,0],['child2',1,0],['child3',1,1],['child3',1,0],['child3',1,0],['friend',-1,0],['friend',1,0],['friend',1,0]]];
const key=s=>JSON.stringify(s.actors.map(a=>[a.id,a.level,a.x,a.y]).sort());
const output=[];
for(let i=0;i<10;i++){
 let s=createState(stages[i].board),path=starts[i];for(const a of path){const r=move(s,...a);if(!r.ok)throw Error(JSON.stringify([i,a,r]));}
 console.log('stage',i+1,'after',s.actors);
 if([0,1,2,3,5,6,7].includes(i)){
 for(const id of [...s.actors].map(a=>a.id)){
 const q=[[structuredClone(s),[]]],seen=new Set([key(s)]);let found;
 for(let n=0;n<q.length&&!found;n++){const [state,p]=q[n];for(const d of dirs){const t=structuredClone(state),r=move(t,id,...d);if(!r.ok||r.merged)continue;const np=[...p,[id,...d]];if(!t.actors.some(a=>a.id===id)){found=[t,np];break;}const k=key(t);if(!seen.has(k)){seen.add(k);q.push([t,np]);}}}
 if(!found)throw Error('no individual '+i+' '+id);s=found[0];path.push(...found[1]);
 }
 }else if(!complete(s)){
 const q=[[s,[]]],seen=new Set([key(s)]);let found;
 for(let n=0;n<q.length&&!found;n++){if(n>300000)throw Error('limit '+i);const [state,p]=q[n];for(const a of state.actors)for(const d of dirs){const t=structuredClone(state),r=move(t,a.id,...d);if(!r.ok)continue;const np=[...p,[a.id,...d]];if(complete(t)){found=[t,np];break;}const k=key(t);if(!seen.has(k)){seen.add(k);q.push([t,np]);}}}
 if(!found)throw Error('no '+i);s=found[0];path.push(...found[1]);
 }
 if(!complete(s))throw Error('incomplete');output.push(path);console.log('moves',path.length);
}
fs.writeFileSync('prototypes/naopoyo-time-hand-chapter1/solutions.mjs','// Confirmed legal witnesses; no claim of global shortest paths.\nexport const solutions='+JSON.stringify(output)+';\n');
