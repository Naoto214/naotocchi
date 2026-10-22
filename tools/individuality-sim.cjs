/* Model only: experience opportunities are assumptions, NOT measured play frequency. */
const I=require('../individuality.js');
let seed=20261021;const rng=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/2**32;};
const scenarios={care:[[1,1,1],[0,1,1],[2,2,2],[0,0,0]],games:[[1,1,2],[6,1,2],[1,1,1],[6,6,6]],travel:[[6,6,4],[1,6,4],[1,1,1],[1,1,0]],companions:[[2,2,6],[1,2,6],[6,6,6],[1,1,0]],balanced:[[4,4,4],[4,4,4],[4,4,4],[4,4,4]],'no-romance':[[5,5,5],[5,5,5],[5,5,5],[5,5,5]],'no-meguru':[[5,5,5],[5,5,5],[5,5,5],[5,5,5]],'no-A-S':[[3,3,3],[4,4,4],[3,3,3],[6,6,6]],repetition:[[1,0,0],[1,0,0],[1,0,0],[1,0,0]],'missed-choices':[[4,4,4],[4,4,4],[4,4,4],[4,4,4]],'all-12':[[4,4,4],[4,4,4],[4,4,4],[4,4,4]]};
for(const h of Object.keys(I.data.hearts))scenarios['focus-'+h]=Object.keys(I.data.hearts).map(k=>k===h?[5,5,4]:[1,1,1]);
const rows=[];
for(const [name,opportunities] of Object.entries(scenarios)){
 const totals=[0,0,0,0],five=[0,0,0,0],N=2000;
 for(let run=0;run<N;run++){
  const s=I.create('dog',['home'],rng,`${name}-${run}`);
  Object.keys(I.data.hearts).forEach((heart,h)=>opportunities[h].forEach((count,c)=>{for(let j=0;j<count;j++)if(rng()<.85){I.experience(s,{lifeId:s.lifeId,heart,category:c,id:`model-${c}-${j}`});if(name==='repetition')for(let n=0;n<100;n++)I.experience(s,{lifeId:s.lifeId,heart,category:c,id:`model-${c}-${j}`});}}));
  I.queue(s,0,90);
  for(const e of I.data.events){if(rng()>(name==='all-12'?1:name==='missed-choices'?.4:.8))continue;const focus=name.replace('focus-','');const choice=e.choices.find(c=>c.heart===focus)||e.choices[Math.floor(rng()*3)];I.choose(s,e.age,choice.heart,s.lifeId);}
  Object.keys(I.data.hearts).forEach((h,k)=>{const star=I.stars(I.points(s,h));totals[k]+=star;if(star===5)five[k]++;});
 }
 rows.push({scenario:name,meanStars:totals.map(n=>+(n/N).toFixed(3)),fiveStarPercent:five.map(n=>+(n/N*100).toFixed(2))});
}
console.log(JSON.stringify({kind:'hypothetical-opportunity-model',seed:20261021,runsPerScenario:2000,heartOrder:Object.keys(I.data.hearts),assumptions:{realization:.85,defaultChoiceParticipation:.8,allChoices:1,missedChoices:.4,opportunities:scenarios},results:rows},null,2));
