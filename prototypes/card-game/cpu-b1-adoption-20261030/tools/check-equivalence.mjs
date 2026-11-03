// Checks that the OFFICIAL implementation (cpu-observation.mjs + cpu-policy.mjs) reproduces the PR #491 experiment:
//   version heuristic-2 == arm E1 (B1 for intermediate) and version heuristic-1 == arm base (official CPU before),
// game by game (same final engine-save sha256). Every K-th match of the fixed manifest.
// Usage: node tools/check-equivalence.mjs <K> <shard> <shards> > out.json   (run from this folder)
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import * as e from '../../engine.mjs';
import {observeCpu} from '../../cpu-observation.mjs';
import {chooseCpuAction} from '../../cpu-policy.mjs';
import {advanceResponses} from '../../auto-progress.mjs';
import {permutations,inputFor,apply,sha} from '../../balance-verification-20261020/lib.mjs';
const [K='8',shard='0',shards='1']=process.argv.slice(2);
const M=JSON.parse(readFileSync(new URL('../ref/T-manifest.json',import.meta.url))),G=Object.fromEntries(M.groups.map(g=>[g.group,g]));
const ref=arm=>{const m=new Map();for(let k=0;k<4;k++)for(const l of gunzipSync(readFileSync(new URL(`../ref/${arm}-shard${k}.jsonl.gz`,import.meta.url))).toString().split('\n').filter(Boolean)){const r=JSON.parse(l);m.set(r.match,r.saveSha256);}return m;};
const REF={'heuristic-2':ref('E1'),'heuristic-1':ref('base')};
function play(m,version){const g=G[m.group],perm=permutations(g.orderSeed),order={X:apply(M.decks[g.X].cards,perm.A),Y:apply(M.decks[g.Y].cards,perm.B)};
 const seat={A:m.first==='X'?order.X:order.Y,B:m.first==='X'?order.Y:order.X};let s=e.createGame(g.orderSeed,{A:inputFor(seat.A,perm.A),B:inputFor(seat.B,perm.B)});const step={A:0,B:0};
 const adv=()=>{const r=advanceResponses(s);s=r.state;if(r.halted)throw Error(r.reason);};adv();
 while(s.phase!=='finished'){const a=e.actor(s),o=observeCpu(s,a),d=chooseCpuAction(o,{difficulty:m.difficulty[a],seed:m.policySeed[a],step:step[a]++,version});s=e.act(s,a,s.revision,e.legalActions(s)[o.actions.findIndex(x=>x.id===d.id)].id);adv();}
 return sha(e.save(s));}
const out={};for(const version of ['heuristic-2','heuristic-1']){let same=0,diff=[];
 M.matches.filter((m,i)=>i%Number(K)===0).filter((m,i)=>i%Number(shards)===Number(shard)).forEach(m=>{if(play(m,version)===REF[version].get(m.match))same++;else diff.push(m.match);});out[version]={same,different:diff};}
console.log(JSON.stringify(out));
