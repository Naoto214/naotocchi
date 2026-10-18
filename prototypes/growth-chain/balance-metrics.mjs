import assert from 'node:assert/strict';import {applyAction,stateHash} from './session.mjs';
const count=s=>s.board.flat().filter(Boolean).length;
export function traceMetrics(initial,actions){
 let s=structuredClone(initial),stock=[...s.eggs],earnedStock=[0,0,0,0],pendingCycle=false,streak=0,streakEggs=0,streakGauge=s.gauge,streakOccupancy=count(s);
 const m={drops:0,actions:actions.length,created08:0,deathGroups:0,first08Drop:null,firstEggDrop:null,firstEggAction:null,eggsEarned:[0,0,0,0],eggsSpent:[0,0,0,0],earnedEggsSpent:0,cycleRewards:0,gaugeEarned:0,gaugeSpent:0,gaugeFromTools:0,transforms:0,bulks:0,maxChain:0,chains2:0,chains3:0,chains5:0,max08Present:0,terminal08:0,positiveGaugeStreaks:0,maxToolStreak:0,clearance:{egg:0,transform:0,bulk:0},events:[]};
 const finishStreak=()=>{if(streak&&s.gauge>streakGauge){m.positiveGaugeStreaks++;assert.ok(count(s)<streakOccupancy+streakEggs,'positive resource streak must consume board material');}streak=0;streakEggs=0;streakGauge=s.gauge;streakOccupancy=count(s);};
 for(let i=0;i<actions.length;i++){
  const a=actions[i];if(a.type==='drop')finishStreak();else if(!streak){streakGauge=s.gauge;streakOccupancy=count(s);}
  const before=count(s);s=applyAction(s,a,false);const e=s.last,n=e.eggs.reduce((x,y)=>x+y,0);
  if(a.type==='drop'){streakGauge=s.gauge;streakOccupancy=count(s);}else{streak++;m.maxToolStreak=Math.max(m.maxToolStreak,streak);m.clearance[a.type]+=before-count(s);m.gaugeFromTools+=e.gauge;}
  if(a.type==='transform'){m.transforms++;m.gaugeSpent+=s.rules.gaugeUnit;}if(a.type==='bulk'){m.bulks++;m.gaugeSpent+=s.rules.gaugeUnit*3;}
  if(a.type==='egg'){streakEggs++;m.eggsSpent[a.rank]++;if(stock[a.rank])stock[a.rank]--;else{assert.ok(earnedStock[a.rank]>0);earnedStock[a.rank]--;m.earnedEggsSpent++;pendingCycle=true;}}
  if(n){m.firstEggDrop??=s.drops;m.firstEggAction??=i+1;if(pendingCycle){m.cycleRewards+=n;pendingCycle=false;}m.events.push({action:i+1,drop:s.drops,rankCounts:e.eggs,chain:e.waves.length});}
  earnedStock=earnedStock.map((v,k)=>v+e.eggs[k]);m.eggsEarned=m.eggsEarned.map((v,k)=>v+e.eggs[k]);m.deathGroups+=n;m.created08+=e.created08;m.gaugeEarned+=e.gauge;
  if(e.created08)m.first08Drop??=s.drops;m.maxChain=Math.max(m.maxChain,e.waves.length);for(const k of [2,3,5])if(e.waves.length>=k)m['chains'+k]++;m.max08Present=Math.max(m.max08Present,s.board.flat().filter(c=>c?.s===8).length);
 }
 finishStreak();m.drops=s.drops;m.over=s.over;m.score=s.score;m.gaugeRemaining=s.gauge;m.eggsRemaining=s.eggs;m.hash=stateHash(s);m.terminal08=s.board.flat().filter(c=>c?.s===8).length;m.finalOccupancy=count(s);
 assert.equal(s.gauge,initial.gauge+m.gaugeEarned-m.gaugeSpent);
 assert.deepEqual(s.eggs,initial.eggs.map((n,i)=>n+m.eggsEarned[i]-m.eggsSpent[i]));
 assert.ok(m.gaugeEarned<=count(initial)+2*(s.drops-initial.drops)+m.eggsSpent.reduce((a,b)=>a+b,0)-count(s));
 return m;
}
