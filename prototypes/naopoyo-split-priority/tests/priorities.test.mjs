import test from 'node:test';
import assert from 'node:assert/strict';
import {splitCandidates,createState,clone} from '../../naopoyo-v2/engine.mjs';
const file=new URL('../priorities.mjs',import.meta.url);
const subject=await import(file).catch(()=>({}));
const {candidateDetails,compass}=subject;
const board=()=>createState({id:'lab',w:8,h:8,actors:[{id:'p',x:3,y:3,level:8,species:'dog'}],walls:[],gates:[],exits:[],spikes:[{x:3,y:3,power:7}],gravity:false,movementRules:'contact-v2',terrainRules:'magic-gate-v2',gravityRules:'supported-v1',splitRules:'recombine-once-v1'});
const plain=arr=>arr.map(({x,y,distance})=>({x,y,distance}));
test('independent candidate API',()=>assert.equal(typeof candidateDetails,'function'));
for(const mode of ['A','B','C'])test(`${mode} all headings bounded unique legal routes`,()=>{
 assert.equal(typeof candidateDetails,'function');
 for(const [dx,dy] of compass){const s=board(),out=candidateDetails(s,3,3,dx,dy,s.actors[0],{},mode);assert.equal(out.length,mode==='B'?16:24);assert.equal(new Set(out.map(p=>`${p.x},${p.y}`)).size,out.length);for(const p of out){assert.ok(p.distance>=1&&p.distance<=2);assert.equal(p.path.length,p.distance+1);for(let i=1;i<p.path.length;i++)assert.equal(Math.max(Math.abs(p.path[i][0]-p.path[i-1][0]),Math.abs(p.path[i][1]-p.path[i-1][1])),1);}}
});
test('B uses each ray near then far; blocked intermediate prevents jump',()=>{
 assert.equal(typeof candidateDetails,'function');const s=board();let out=candidateDetails(s,3,3,0,1,s.actors[0],{},'B');assert.deepEqual(out.slice(0,4).map(p=>[p.x,p.y]),[[3,2],[3,1],[4,3],[5,3]]);s.actors.push({id:'b',x:3,y:2,level:1,species:'frog'});out=candidateDetails(s,3,3,0,1,s.actors[0],{},'B');assert.ok(!out.some(p=>p.x===3&&p.y===1));assert.ok(!out.some(p=>p.x===4&&p.y===1));
});
test('C retains fixed ranks and accepts alternate legal two-edge route',()=>{
 assert.equal(typeof candidateDetails,'function');const s=board();const before=candidateDetails(s,3,3,0,1,s.actors[0],{},'C');s.actors.push({id:'b',x:3,y:2,level:1,species:'frog'});const after=candidateDetails(s,3,3,0,1,s.actors[0],{},'C');for(const p of after)assert.equal(p.fixedRank,before.find(q=>q.x===p.x&&q.y===p.y).fixedRank);const p=after.find(p=>p.x===3&&p.y===1);assert.ok(p);assert.notDeepEqual(p.path[1],[3,2]);
});
test('A trace matches actual official candidates over deterministic randomized obstructions',()=>{
 assert.equal(typeof candidateDetails,'function');let seed=1459;const rand=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/2**32};
 for(let k=0;k<180;k++){const s=board();for(let i=0;i<16;i++){const x=Math.floor(rand()*8),y=Math.floor(rand()*8);if((x===3&&y===3)||s.walls.some(p=>p[0]===x&&p[1]===y)||s.actors.some(p=>p.x===x&&p.y===y))continue;switch(i%5){case 0:s.walls.push([x,y]);break;case 1:s.actors.push({id:'b'+i,x,y,level:8,species:'frog'});break;case 2:s.gates.push({x,y,exact:1});break;case 3:s.exits.push({x,y,exact:1});break;default:s.spikes.push({x,y,power:7})}}for(const [dx,dy]of compass)assert.deepEqual(plain(candidateDetails(s,3,3,dx,dy,s.actors[0],{},'A')),splitCandidates(s,3,3,dx,dy,s.actors[0]));}
});
test('all policies reject two-rock diagonal corner and special destinations',()=>{
 assert.equal(typeof candidateDetails,'function');for(const mode of ['A','B','C']){const s=board();s.walls=[[2,3],[3,2]];s.gates=[{x:4,y:3,exact:1}];s.exits=[{x:3,y:4,exact:1}];for(const p of candidateDetails(s,3,3,0,1,s.actors[0],{},mode)){assert.ok(!(p.x===4&&p.y===3));assert.ok(!(p.x===3&&p.y===4));assert.notDeepEqual(p.path.slice(0,2),[[3,3],[2,2]]);}}
});
