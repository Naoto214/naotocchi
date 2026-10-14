const fs=require('node:fs'),{performance}=require('node:perf_hooks');
const {createSession}=require('../relationship-life.js');
const {harness,seededRandom}=require('../tests/helpers/runtime-harness.cjs');
const rng=seed=>{let n=seed;return()=>((n=Math.imul(n,1664525)+1013904223>>>0)/4294967296);};
const eligible=[];
for(let seed=1;seed<=100;seed++){
 const s=createSession({random:rng(seed)}),count={reunion:0,greeting:0,affection_interaction:0,invitation:0};
 for(let t=0;t<3600;t++){s.advance(1);const kind=['reunion','greeting','affection_interaction','invitation'][t%4];if(s.attempt(kind,kind==='affection_interaction'?'partner:p':'companion:'+t%5))count[kind]++;}
 eligible.push(count);
}
const spatial=[];
for(let seed=1;seed<=8;seed++){
 const h=harness({deterministic:true,seed,fullDisplay:true}),s=h.api.state(),M=h.api.meguruMod;
 s.companions=[...h.api.normalCompanions,...h.api.rareCompanions].map(c=>({id:c.id,bond:100}));s.lifetime.companionsRecruited=s.companions.map(c=>c.id);
 s.lifetime.partnersRecorded=h.api.partnerCandidates.map(p=>p.id);s.partner={id:s.lifetime.partnersRecorded[0],affection:100};
 s.discoveredStages=Object.entries(h.api.SPECIES).flatMap(([line,d])=>d.stages.map((_,i)=>`${line}:${i}`));
 const sim=M.createSimulation({socialSession:M.socialSession,regionId:seed%2?'home':'forest'}),count={},off=M.socialSession.subscribe(e=>count[e.type]=(count[e.type]||0)+1),times=[];
 let maxParty=0,maxNear=0,changed=0;const poses=new Map(sim.world.residents.map(a=>[a.key,[a.x,a.z]]));
 // Real collision-aware movement, no position injection or encounter teleportation.
 for(let i=0;i<6000;i++){const t=performance.now();sim.step(.1,{x:Math.sin(i/280),y:-Math.cos(i/380)});times.push(performance.now()-t);maxParty=Math.max(maxParty,sim.party.length);if(i%10===0)maxNear=Math.max(maxNear,sim.world.residents.filter(a=>Math.hypot(a.x-sim.player.x,a.z-sim.player.z)<80).length);}
 for(const a of sim.world.residents){const p=poses.get(a.key);if(p&&Math.hypot(a.x-p[0],a.z-p[1])>20)changed++;}
 times.sort((a,b)=>a-b);spatial.push({seed,region:sim.world.regionId,residents:poses.size,changed,count,maxParty,maxWithin80:maxNear,p95ms:times[Math.floor(times.length*.95)],p99ms:times[Math.floor(times.length*.99)]});off();
}
const mean=Object.fromEntries(Object.keys(eligible[0]).map(k=>[k,eligible.reduce((n,r)=>n+r[k],0)/eligible.length/6]));
const result={conditions:{eligible:'100 seeds x 60min; always eligible round-robin kinds; rates per 10min, not spatial encounters',spatial:'8 seeds x 10min, 10Hz active simulation, full dex, collision-aware cyclic input; CPU on host, not iPhone FPS'},eligiblePer10min:mean,spatial};
fs.writeFileSync('docs/qa/relationship-free-life-20261014/measurement.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result,null,2));
