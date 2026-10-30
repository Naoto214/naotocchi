import {stages} from '../stages.mjs';
import {clone,createState,move,settle,validState} from '../../naopoyo-v2/engine.mjs';

export const actor=(id,x,y,level,species='dog')=>({id,x,y,level,species});
export const directions=[[0,-1],[1,-1],[1,0],[1,1],[0,1],[-1,1],[-1,0],[-1,-1]];
export function board(actors,extra={}){
 return {...clone(stages[9]),id:'overflow-contact',gravity:false,walls:[],gates:[],spikes:[],exits:[],actors,...extra};
}
// Screenshot shows cells and levels, not runtime IDs/history. IDs below are
// diagnostic labels, not a claim to recover the user's localStorage.
export function screenshotBoard(){
 return {...clone(stages[9]),actors:[actor('four',5,7,4),actor('eight',6,7,8),actor('two',7,7,2),actor('upper',7,4,2)]};
}
export function mirror(b){
 const s=clone(b);s.actors.forEach(a=>a.x=s.w-1-a.x);
 s.walls=s.walls.map(([x,y])=>[s.w-1-x,y]);
 for(const key of ['gates','spikes','exits'])s[key].forEach(a=>a.x=s.w-1-a.x);
 return s;
}
export function trace(b,id,dx,dy){
 const state=createState(b),initialSettlement=settle(state);const before=clone(state);
 const selected=clone(state.actors.find(a=>a.id===id));
 const target=state.actors.find(a=>a.x===selected.x+dx&&a.y===selected.y+dy);
 const result=move(state,id,dx,dy);
 return {initialSettlement,selected,target:target?clone(before.actors.find(a=>a.id===target.id)):null,direction:[dx,dy],before,result,after:state,valid:validState(b,state)};
}
export function environment(name){
 const y=name==='floor'||name==='exit'||name==='neighbor'?7:4;
 const b=board([actor('four',3,y,4),actor('eight',4,y,8)],{gravity:true});
 if(name==='rock'||name==='spike')b.walls=[[3,5],[4,5]];
 if(name==='gate')b.gates=[{x:3,y:5,exact:4},{x:4,y:5,exact:8}];
 if(name==='spike')b.spikes=[{x:2,y:4,power:2},{x:5,y:4,power:2}];
 if(name==='exit')b.exits=[{x:5,y:7,exact:3}];
 if(name==='neighbor')b.actors.push(actor('two',5,7,2));
 return b;
}
