// 育成ペナルティ A/B/C の 一生シミュレーション(本物の script.js を harness で うごかす)
const fs=require('fs'),path=require('path'),vm=require('vm');
const ROOT='/home/user/naotocchi';
const PLAN=process.env.PLAN||'A';
const ORIG="    } else {\n      applyDecline(8);\n      raiseDeathMeter(2);\n    }";
const REPL={A:ORIG,
 B:"    } else {\n      applyDecline(clampedScore >= 15 ? 2 : 4);\n    }",
 C:"    } else {\n    }"}[PLAN];
const rf=fs.readFileSync;fs.readFileSync=function(p,...a){const r=rf.call(fs,p,...a);if(String(p).endsWith('script.js')&&typeof r==='string'){if(!r.includes(ORIG))throw new Error('patch point');return r.replace(ORIG,REPL);}return r;};
process.chdir(ROOT);const {harness}=require(ROOT+'/tests/helpers/runtime-harness.cjs');
function lcg(s){return()=>((s=(Math.imul(s,1664525)+1013904223)>>>0)/4294967296);}
// 人物像: att=お世話に気づく確率/tick, gap=ミニゲーム間隔(tick), dist=[<30,30-69,70+]の確率, quit=途中でやめる確率
const CARE={good:0.35,normal:0.12,poor:0.05};
const P={
 beginner:{care:'normal',gap:30,dist:[0.55,0.40,0.05]},
 child:{care:'poor',gap:20,dist:[0.60,0.35,0.05],quit:0.10},
 average:{care:'normal',gap:30,dist:[0.25,0.50,0.25]},
 skilled:{care:'good',gap:30,dist:[0.05,0.25,0.70]},
 luck:{care:'normal',gap:30,dist:[0.33,0.40,0.27]},
 rare:{care:'normal',gap:300,dist:[0.25,0.50,0.25]},
 quitter:{care:'normal',gap:30,dist:[0,0,0],quit:1},
 idler:{care:'normal',gap:30,dist:[0,0,0],idle:1},
 nogame:{care:'normal',gap:1e9,dist:[0,0,0]},
 beginnerPoor:{care:'poor',gap:30,dist:[0.55,0.40,0.05]},
 averagePoor:{care:'poor',gap:30,dist:[0.25,0.50,0.25]},
 beginnerGood:{care:'good',gap:30,dist:[0.55,0.40,0.05]},
};
function run(name,seed){
 const p=P[name],r=lcg(seed*7919+13);
 const h=harness({seed});vm.runInContext(`Math.random=(()=>{let s=${seed*104729};return ()=>((s=(Math.imul(s,1664525)+1013904223)>>>0)/4294967296);})()`,h.sandbox);
 const s=h.api.state();
 Object.assign(s,{stage:'growing',speciesLine:s.speciesLine||'dog',ageTicks:(+process.env.START_AGE||0)*20,hunger:80,happiness:80,energy:80,health:100,sodachi:+(process.env.START_SODACHI||20),maxSodachi:+(process.env.START_SODACHI||20),growth:0,decline:0,deathMeter:0});
 const click=(id)=>{const b=h.get(id);if(b&&!b.disabled)h.dispatch(b,'click',{});};
 const game={id:'sim-game',start(c){c.innerHTML='<div></div>';}};
 const st={games:0,fails:0,mid:0,great:0,quits:0,transforms:0,happySum:0,declineSum:0,deathMax:0,coins0:s.lifetime.money,sick0:s.totalSicknessCount,ticks:0,died:false,diedAge:null,dyingWarn:0,dmSum:0};
 if(process.env.GAP)p.gap=+process.env.GAP;let nextGame=Math.floor(r()*p.gap);
 for(let t=0;t<2100;t++){
  if(s.stage==='farewell'||s.stage==='dead')break;
  try{h.api.closeIndividualityDialog&&h.api.closeIndividualityDialog();}catch(e){}
  try{h.api.closeAllMenuOverlays&&h.api.closeAllMenuOverlays();}catch(e){}
  if(s.transformOptions){st.transforms++;s.transformOptions=null;}
  // お世話
  const att=CARE[p.care];if(r()<att){
   if(s.isSleeping){ if(s.energy>=95) click('sleepBtn'); }
   else if(s.isSick) click('medicineBtn');
   else if(s.hunger<45) click('feedBtn');
   else if(s.poopCount>=2) click('cleanBtn');
   else if(s.energy<25) click('sleepBtn');
  }
  if(s.isSleeping) for(let k=0;k<30;k++) h.api.recoverSleepStep();
  // ミニゲーム
  if(t>=nextGame && !s.isSleeping && !s.isSick && s.energy>=30){
   nextGame=t+p.gap;
   h.api.startMinigame(game);
   if(p.idle){h.api.retireMinigame("idle");st.quits++;}
   else if(p.quit && r()<p.quit){h.api.retireMinigame();st.quits++;}
   else{const u=r();let sc;if(u<p.dist[0])sc=10+Math.floor(r()*20);else if(u<p.dist[0]+p.dist[1])sc=30+Math.floor(r()*40);else sc=70+Math.floor(r()*31);
    h.api.finishMinigame(sc,null,{acts:5});st.games++;if(sc<30)st.fails++;else if(sc<70)st.mid++;else st.great++;}
  }
  h.api.tick();st.ticks++;
  st.happySum+=s.happiness;st.declineSum+=s.decline;st.dmSum+=s.deathMeter;st.deathMax=Math.max(st.deathMax,s.deathMeter);
  if(s.deathMeter>=80)st.dyingWarn++;
  if(s.lifePhase==='dead'||s.isDead||s.dead||(s.stage==='dead')){st.died=true;st.diedAge=Math.floor(s.ageTicks/20);break;}
 }
 const age=Math.floor(s.ageTicks/20);
 return {plan:PLAN,persona:name,seed,age,reached100:age>=100,maxSodachi:s.maxSodachi,sodachi:s.sodachi,evolutions:s.lifetime.evolutions,transforms:st.transforms,games:st.games,fails:st.fails,quits:st.quits,coins:s.lifetime.money-st.coins0,happyAvg:+(st.happySum/st.ticks).toFixed(1),declineAvg:+(st.declineSum/st.ticks).toFixed(1),deathAvg:+(st.dmSum/st.ticks).toFixed(1),deathMax:+st.deathMax.toFixed(1),warnTicks:st.dyingWarn,sick:s.totalSicknessCount-st.sick0,stage:s.stage};
}
const out=[];const names=(process.env.P||Object.keys(P).join(',')).split(',');const seeds=+(process.env.SEEDS||3);
for(const n of names)for(let sd=1;sd<=seeds;sd++){console.log=()=>{};const res=run(n,sd);out.push(res);process.stderr.write(JSON.stringify(res)+'\n');}
fs.writeFileSync(require('path').resolve(__dirname,process.env.OUT||'out.jsonl'),out.map(x=>JSON.stringify(x)).join('\n')+'\n');
