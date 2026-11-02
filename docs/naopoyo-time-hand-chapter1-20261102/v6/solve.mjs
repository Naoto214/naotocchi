import fs from 'node:fs';
import {stages} from '../../../prototypes/naopoyo-time-hand-chapter1/stages.mjs';
import {search,requirements,transition} from '../../../prototypes/naopoyo-time-hand-chapter1/tests/reachability.mjs';
import {createState,validState,mass,complete} from '../../../prototypes/naopoyo-time-hand-chapter1/engine.mjs';
const solutions=[],report=[];
for(const [i,stage] of stages.entries()){
 const result=search(stage.board);if(!result.solved)throw Error(`no solution ${stage.id}`);
 let state=createState(stage.board),events=[],flags=new Set();
 for(const a of result.path){const t=transition(state,...a);if(!t.result.ok||!validState(stage.board,t.state)||mass(state)!==mass(t.state))throw Error('invalid witness');state=t.state;events.push(...t.result.events);for(const f of t.flags)flags.add(f);}
 if(!complete(state)||!requirements[i].every(f=>flags.has(f)))throw Error('incomplete learning witness');
 const necessary={};for(const feature of requirements[i]){const proof=search(stage.board,{forbid:feature});if(proof.solved||!proof.exhausted)throw Error('bypass '+stage.id+'/'+feature);necessary[feature]={exhausted:true,states:proof.states};}
 solutions.push(result.path);report.push({stage:stage.id,title:stage.title,gravity:stage.board.gravity,moves:result.path.length,states:result.states,solution:result.path,necessary,events});
 console.log(stage.id,stage.title,result.path.length,'moves',result.states,'states');
}
fs.writeFileSync('prototypes/naopoyo-time-hand-chapter1/solutions.mjs','// Real-engine BFS witnesses. Each action is one cell; dragging may group steps.\nexport const solutions='+JSON.stringify(solutions)+';\n');
fs.writeFileSync('docs/naopoyo-time-hand-chapter1-20261102/v6/learning-proof.json',JSON.stringify(report,null,2)+'\n');
