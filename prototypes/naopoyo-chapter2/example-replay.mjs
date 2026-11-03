import {ForestSession} from './session.mjs';
import {clone,complete,totals,validState} from '../naopoyo-v2/engine.mjs';

// Validate the entire witness before exposing it; snapshots are presentation-only.
export class ExampleReplay {
 constructor(stage,path){
  this.path=clone(path);this.session=new ForestSession(stage);this.index=0;
  const q=new ForestSession(stage),initialTotals=JSON.stringify(totals(q.state));
  this.snapshots=[q.snapshot()];this.motions=[];
  for(const [i,step] of this.path.entries()){
   if(!Array.isArray(step.at)||!Array.isArray(step.d)||step.d.length!==2||!step.d.every(n=>Number.isInteger(n)&&Math.abs(n)<=1)||(!step.d[0]&&!step.d[1]))throw Error(`Invalid direction at ${i+1}`);
   const a=q.state.actors.find(a=>a.x===step.at[0]&&a.y===step.at[1]);
   if(!a||a.level!==step.level)throw Error(`Wrong actor at ${i+1}`);
   const before=clone(q.state),p={x:a.x+.5,y:a.y+.5};
   if(!q.begin(a.id,p))throw Error(`Cannot select at ${i+1}`);
   const results=q.travel({x:p.x+step.d[0],y:p.y+step.d[1]});q.end();
   if(results.length!==1||!results[0].ok||!validState(stage,q.state)||JSON.stringify(totals(q.state))!==initialTotals)throw Error(`Invalid move at ${i+1}`);
   this.motions.push({before,after:clone(q.state),events:clone(results[0].events),id:a.id,dx:step.d[0],dy:step.d[1],elapsed:0,duration:q.motion[0].duration});
   this.snapshots.push(q.snapshot());q.motion=[];
  }
  if(!complete(q.state))throw Error('Witness does not rescue everyone');
 }
 show(index,animate=false){this.index=index;this.session.apply(this.snapshots[index]);if(animate&&index>0)this.session.motion=[clone(this.motions[index-1])];}
 next(){if(this.index<this.path.length)this.show(this.index+1,true);}
 previous(){if(this.index>0)this.show(this.index-1);}
 reset(){this.show(0);}
 get nextStep(){return this.path[this.index]||null;}
}
