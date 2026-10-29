import fs from 'node:fs';import assert from 'node:assert/strict';import {stages} from '../stages.mjs';import {ExampleReplay} from '../example-replay.mjs';import {clone,move,mass,validState,complete} from '../../naopoyo-v2/engine.mjs';
const dirs=[[0,-1],[1,-1],[1,0],[1,1],[0,1],[-1,1],[-1,0],[-1,-1]],physical=s=>JSON.stringify({rescued:s.rescued,actors:s.actors.map(({x,y,level,species})=>[x,y,level,species]).sort()});
const rows=[];
for(const stage of stages){const path=JSON.parse(fs.readFileSync(new URL(`../examples/${stage.number}.json`,import.meta.url))).path,replay=new ExampleReplay(stage,path);let candidates=0,newlyLegal=0,physicalChanges=0,cycles=0;
 for(const snap of replay.snapshots)for(const a of snap.state.actors)for(const d of dirs){const before=snap.state,A=clone(before),B={...clone(before),movementRules:'contact-v2'},ra=move(A,a.id,...d),rb=move(B,a.id,...d);candidates++;if(rb.reason==='gravity-cycle')cycles++;if(rb.ok){assert.equal(mass(B),mass(before));assert.ok(validState({...stage,movementRules:'contact-v2'},B));if(!ra.ok){newlyLegal++;if(physical(B)!==physical(before))physicalChanges++;}else assert.equal(physical(A),physical(B),'existing legal transition physical equivalence');}}
 rows.push({stage:stage.number,witnessMoves:path.length,candidates,newlyLegal,physicalChanges,cycles});
}
const result={scope:'All single-cell outgoing transitions from every V11 witness snapshot; not full reachable-state exploration or shortest-path proof',rows};console.log(JSON.stringify(result,null,2));
