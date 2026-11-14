import fs from 'node:fs';import {createGame} from './state.mjs';import {applySwap} from './engine.mjs';import {chooseAction} from './policy.mjs';import {stage,count,species} from './board.mjs';import {replay} from './replay.mjs';import {createHash} from 'node:crypto';
const arg=Object.fromEntries(process.argv.slice(2).map(v=>v.replace(/^--/,'').split('='))),seeds=Number(arg.seeds||20),start=Number(arg.start||1),limit=Number(arg.limit||300),distribution=arg.distribution||'uniform',kinds=(arg.kinds||'3,4,5').split(',').map(Number),intervals=(arg.intervals||'3,4,5,6').split(',').map(Number),policies=(arg.policies||'random,evolve,goal').split(','),out=arg.out||'results/screening.json';
const low=Number(arg.low||12),target=Number(arg.target||18);
const manifest={version:'swap-sim-v4',low,target,seeds,start,limit,distribution,kinds,intervals,policies,hiddenRngAccess:false,policyDescription:'goal/focus use reachable line assignment target (v4); one-step evaluation; 4^stage material, same-piece distance and line alignment; evolve adds immediate evolution bonus; focus weights species0 twice; random hash-seeded uniform choices'};const rows=[];fs.mkdirSync(new URL('./results/',import.meta.url),{recursive:true});
for(const k of kinds)for(const interval of intervals)for(const policy of policies){let clears=0;for(let seed=start;seed<start+seeds;seed++){
 let s=createGame(seed,{kinds:k,interval,distribution,low,target}),reached={},first08=null,pair08=false,evolves=0,mixed=0,chains=0,maxChain=0,occupancy=0,nonreact=0,rescueEggs=0,normalEggs=0,highLost=0,speciesEvolves=Array(k).fill(0),hist=Array(37).fill(0),lengths=Array(7).fill(0);
 for(let turn=0;turn<limit&&s.status==='playing';turn++){
  const action=chooseAction(s,policy);if(!action)break;const r=applySwap(s,action);if(!r.accepted)throw Error('illegal policy action');s=r.state;
  const beforeStages=r.events.filter(e=>e.type==='evolve').map(e=>e.to);for(const rank of [...s.board.map(stage),...beforeStages])for(let j=5;j<=rank;j++)if(!reached[j])reached[j]=s.moves;
  if(reached[8]&&first08===null)first08=reached[8];
  const eight={};for(const c of s.board)if(stage(c)===8)eight[species(c)]=(eight[species(c)]||0)+1;if(Object.values(eight).some(n=>n>=2)||s.status==='clear')pair08=true;
  let playerReaction=false,wave=0;for(const e of r.events){if(e.type==='evolve'){evolves++;speciesEvolves[e.species]++;lengths[e.longest]++;}if(e.type==='mixedClear'){mixed++;if(e.from>=5)highLost+=e.cells.length;}if(e.source==='player'&&(e.type==='evolve'||e.type==='mixedClear')){playerReaction=true;wave=Math.max(wave,e.wave);}if(e.type==='eggHatch'){if(e.source==='normal')normalEggs++;else rescueEggs++;}}
  if(!playerReaction)nonreact++;if(wave>1)chains++;maxChain=Math.max(maxChain,wave);const n=count(s.board);occupancy+=n;hist[n]++;
 }
 if(s.status==='clear')clears++;
 const row={seed,kinds:k,interval,distribution,policy,status:s.status==='playing'?'censored':s.status,moves:s.moves,reached,first08,pair08,evolves,mixed,chains,maxChain,meanOccupancy:occupancy/Math.max(s.moves,1),occupancyHistogram:hist,nonreact,rescueEggs,normalEggs,highLost,speciesEvolves,lineLengths:lengths,shuffles:s.shuffles,unresolved:s.rescueUnresolved,finalHash:createHash('sha256').update(JSON.stringify(s)).digest('hex')};
 rows.push(row);
 if(s.status==='clear'&&!fs.existsSync(new URL('./results/witness.json',import.meta.url))){const r=replay(seed,s.config,s.actions);if(JSON.stringify(r)!==JSON.stringify(s))throw Error('replay mismatch');fs.writeFileSync(new URL('./results/witness.json',import.meta.url),JSON.stringify({seed,config:s.config,actions:s.actions,finalHash:row.finalHash},null,2));}
 }
 fs.writeFileSync(new URL(out,import.meta.url),JSON.stringify({manifest,rows},null,2));console.log(JSON.stringify({kinds:k,interval,policy,clears,total:seeds}));}
