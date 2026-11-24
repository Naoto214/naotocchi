const G=14,RAMP_H=2.2;
function sim(pumpFn, trickPlan, T=26, dt=1/60){let s=-0.6,v=0,air=null,score=0,tricks=0,bails=0,combo=0,t=0,airs=[];
 for(;t<T;t+=dt){
  if(air){air.vy-=G*dt;air.x+=air.vx*dt;air.y+=air.vy*dt;air.rot+=(air.spinTarget-air.rot)*Math.min(1,dt*6);air.t+=dt;
   if(trickPlan){const k=trickPlan(air);while(air.spins<k.n && air.t>=k.at[air.spins]){air.spins++;air.spinTarget+=Math.PI*2*(air.dir>0?1:-1);}}
   if(air.y<=RAMP_H&&air.t>0.15){const rem=Math.abs(air.spinTarget-air.rot);const spins=air.spins,dir=air.dir,v0=air.v0;const ok=rem<1.25||spins===0;airs.push({t:air.t.toFixed(2),spins,ok,rem:rem.toFixed(2),v0:v0.toFixed(2)});air=null;s=dir>0?1:-1;
    if(ok){const gain=spins*spins*20+(spins?10:0);if(spins){tricks++;combo++;score+=gain*Math.min(3,combo);}v=-dir*Math.max(3.2,Math.abs(v0)*0.95);}else{bails++;combo=0;v=0;s=dir*0.95;}}
   continue;}
  const slope=2*s*RAMP_H;const down=(s>0&&v<0)||(s<0&&v>0);let acc=-slope*G*0.45;if(pumpFn(t)&&down)acc+=-Math.sign(s)*4.6;acc-=v*0.09;v+=acc*dt;s+=v*dt*0.42;
  if(Math.abs(s)>=1){const dir=Math.sign(s);const speed=Math.abs(v);s=dir;if(speed>2.4){air={x:dir,y:RAMP_H,vx:dir*speed*0.12,vy:speed*0.9,rot:0,spinTarget:0,spins:0,dir,t:0,v0:v};}else v=-v*0.6;}
 }
 return {final:Math.max(10,Math.min(100,Math.round(10+score/4-bails*3))),score,tricks,bails,airs:airs.slice(0,6),nAir:airs.length};}
console.log('pump always, no trick',JSON.stringify(sim(()=>true,null)));
console.log('no pump',JSON.stringify(sim(()=>false,null)));
for (const n of [1,2,3,4,5]) console.log('pump + '+n+' spins at start',JSON.stringify(sim(()=>true,()=>({n,at:Array.from({length:n},(_,i)=>0.02+i*0.08)}))));
