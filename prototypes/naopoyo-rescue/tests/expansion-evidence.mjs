import fs from 'node:fs';
import crypto from 'node:crypto';
import {stages} from '../stages.mjs';
import {clone,createState,move,release,complete,mass,validState,gatePassages} from '../engine.mjs';
import {pack,restore} from '../store.mjs';
const solutions=JSON.parse(fs.readFileSync(new URL('../solutions.json',import.meta.url)));
const directions=[[-1,-1],[0,-1],[1,-1],[-1,0],[1,0],[-1,1],[0,1],[1,1]];
const at=(list,x,y)=>list.find(a=>a.x===x&&a.y===y);
// Conservative topology: ignore all actor collisions, level restrictions, gravity
// and exit level requirements. Keep walls, species restrictions and sealed gates.
// Moves/merges/splits/releases never create mass outside this 8-neighbour component.
export function gateCut(stage,sealedIndices){
 const blocked=(x,y,species)=>x<0||x>=8||y<0||y>=6||stage.walls.some(p=>p[0]===x&&p[1]===y)||stage.gates.some((g,i)=>g.x===x&&g.y===y&&(sealedIndices.includes(i)||(g.species&&g.species!==species)));
 const stranded=[];
 for(const a of stage.actors){const seen=new Set([`${a.x},${a.y}`]),queue=[[a.x,a.y]];
 for(let i=0;i<queue.length;i++)for(const [dx,dy]of directions){const [x,y]=queue[i],nx=x+dx,ny=y+dy,k=`${nx},${ny}`;if(!blocked(nx,ny,a.species)&&!seen.has(k)){seen.add(k);queue.push([nx,ny]);}}
 if(!stage.exits.some(e=>(!e.species||e.species===a.species)&&seen.has(`${e.x},${e.y}`)))stranded.push({id:a.id,species:a.species,mass:2**(a.level-1),reachable:seen.size});
 }
 return {status:stranded.length?'proved-impossible':'unproved',sealedIndices,stranded};
}
export function replay(stage){
 let s=createState(stage);const total=mass(s),metrics={id:stage.id,title:stage.title,drags:solutions[stage.id].length,manualSteps:0,automaticFallSteps:0,merges:0,splits:0,actorSupportedAscents:0,rescuedMass:0,gatePassages:{}};
 const check=()=>{if(mass(s)!==total||!validState(stage,s))throw Error('invalid state '+stage.id);};
 for(const drag of solutions[stage.id]){
 const before=clone(s);
 for(const [x,y]of drag.path){const a=s.actors.find(a=>a.id===drag.id);if(!a)throw Error('missing actor');const target=at(s.actors,x,y),exit=at(s.exits,x,y);const merged=!!target;
 const split=!exit&&s.spikes.some(p=>p[0]===x&&p[1]===y)&&(a.level+(merged?1:0)>1);
 if(stage.gravity&&y<a.y&&(at(s.actors,a.x,a.y+1)||at(s.actors,a.x-1,a.y)||at(s.actors,a.x+1,a.y)))metrics.actorSupportedAscents++;
 if(!move(s,a.id,x-a.x,y-a.y))throw Error('illegal move '+stage.id);
 metrics.manualSteps++;metrics.merges+=+merged;metrics.splits+=+split;check();
 }
 const manualMoves=s.moves;if(!release(s))throw Error('cycle');metrics.automaticFallSteps+=s.moves-manualMoves;check();
 const raw=pack(Number(stage.id)-1,s,[before],['01','07','12']);const restored=restore(raw);
 if(!restored||JSON.stringify(restored.state)!==JSON.stringify(s)||JSON.stringify(restored.history[0])!==JSON.stringify(before))throw Error('restore/undo mismatch');
 }
 if(!complete(s))throw Error('not complete');
 metrics.rescuedMass=s.rescued;metrics.gatePassages=Object.fromEntries(gatePassages(s));
 metrics.gateCuts=stage.gates.map((g,i)=>gateCut(stage,[i]));
 metrics.shortestProved=false;
 return metrics;
}
if(process.argv[1]===new URL(import.meta.url).pathname){
 const files=['engine.mjs','input.mjs','store.mjs','stages.mjs','advanced-stages.mjs','solutions.json'];
 const hashes=Object.fromEntries(files.map(p=>[p,crypto.createHash('sha256').update(fs.readFileSync(new URL('../'+p,import.meta.url))).digest('hex')]));
 const evidence={base:'f69310c79131f51ceed043417cf4c39cab925331',hashes,handsetQA:'pending-owner-iPhone-Safari',unit:'drags + manual grid steps; gravity steps separate',stages:stages.map(replay)};
 fs.writeFileSync(new URL('../../../docs/naopoyo-expansion-20261022/evidence.json',import.meta.url),JSON.stringify(evidence,null,2)+'\n');
 console.log(JSON.stringify(evidence.stages.slice(12).map(s=>({id:s.id,steps:s.manualSteps,fall:s.automaticFallSteps,merge:s.merges,split:s.splits,support:s.actorSupportedAscents,cuts:s.gateCuts.map(g=>g.status)})),null,2));
}
