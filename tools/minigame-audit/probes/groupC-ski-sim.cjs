// replicates ski-jump physics (games.js 6230-6337)
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v)), lerp=(a,b,t)=>a+(b-a)*t;
const G=9.8,RAMP_END=40;
const rampY=(px)=>(px<RAMP_END?24*Math.pow(1-px/RAMP_END,1.6):0);
const hillY=(px)=>{const d=px-RAMP_END;return d<=0?0:-(0.62*d+2*(1-Math.exp(-d/2)));};
function jumpOnce(strat,difficulty){
 let x=0,y=rampY(0),vx=0,vy=0,lean=0,phase='run',flightT=0,windT=0;
 const wind=(Math.random()-0.5)*lerp(0.3,0.8,difficulty); let leanTarget=0.5+wind*0.4;
 const dt=1/60; let t=0;
 function takeoff(){const late=x-RAMP_END;const q=clamp(1-Math.abs(late)/4,0,1);phase='fly';vy=2.2+q*4.2;vx=vx*(0.98+q*0.08);if(x<RAMP_END){x=RAMP_END;y=0;}}
 while(t<30){t+=dt;
  if(phase==='run'){const slope=(rampY(x+0.1)-rampY(x))/0.1;vx+=(G*-slope*0.9-vx*0.02)*dt;vx=Math.max(vx,0);x+=vx*dt;y=rampY(x);
   if(strat.tapEdge && x>=RAMP_END+strat.tapOffset){takeoff();}
   else if(x>RAMP_END+2.5){takeoff();vy=0.5;}}
  else if(phase==='fly'){flightT+=dt;windT+=dt;if(windT>0.6){windT=0;leanTarget=clamp(0.5+wind*0.4+(Math.random()-0.5)*lerp(0.1,0.3,difficulty),0.1,0.95);}
   let held=strat.hold==='perfect'?(lean<leanTarget):strat.hold==='always'; if(strat.hold==='band'){ if(lean<leanTarget-strat.band) strat._h=true; else if(lean>leanTarget+strat.band) strat._h=false; held=!!strat._h; }
   lean+=((held?1:0)-lean)*Math.min(1,dt*3.2);
   const q=1-Math.abs(lean-leanTarget)/0.5;const lift=1.0+clamp(q,-0.6,1)*3.5;
   vy+=(-G+lift)*dt;vx+=(q>0.6?0.6:-0.8)*dt;vx=Math.max(vx,8);x+=vx*dt;y+=vy*dt;
   if(y<=hillY(x)+0.01&&x>RAMP_END+0.5){let dist=Math.max(0,x-RAMP_END);const crashed=Math.abs(lean-leanTarget)>0.5||flightT<0.6;if(crashed)dist*=0.55;return dist+(strat.tele&&!crashed?3:0);}
  }
 }
 return 0;
}
for(const d of [0,0.55]){
 for(const [name,strat] of Object.entries({
  startOnly:{tapEdge:false,hold:'none'},
  holdAlways:{tapEdge:false,hold:'always'},
  perfect:{tapEdge:true,tapOffset:0,hold:'perfect',tele:true},
  perfectNoTele:{tapEdge:true,tapOffset:0,hold:'perfect'},
  edgeOnly:{tapEdge:true,tapOffset:0,hold:'none'},
  edgeLate1:{tapEdge:true,tapOffset:1,hold:'none'},
  band015:{tapEdge:true,tapOffset:0.5,hold:'band',band:0.15},
  band03:{tapEdge:true,tapOffset:1,hold:'band',band:0.3},
 })){
  const tot=[];for(let i=0;i<5000;i++){let s=0;for(let j=0;j<3;j++)s+=jumpOnce(strat,d);tot.push(s);}
  tot.sort((a,b)=>a-b);const sc=v=>Math.min(100,Math.max(10,Math.round(10+v*0.26)));
  const mean=tot.reduce((a,b)=>a+b,0)/tot.length;
  console.log(`d=${d} ${name}: total mean=${mean.toFixed(1)} min=${tot[0].toFixed(1)} max=${tot[tot.length-1].toFixed(1)} score mean=${sc(mean)} range ${sc(tot[0])}-${sc(tot[tot.length-1])}`);
 }
}
