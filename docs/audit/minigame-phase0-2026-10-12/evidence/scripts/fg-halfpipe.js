// replica of games.js 8019-8030 update(); pump held always; 1 trick press at air.t=0.05s each air
function run(pumpMode, spinsPerAir){ const G=14,RAMP_H=2.2; let s=-0.6,v=0,air=null,score=0,combo=0,bails=0,airs=0,t=0; const dt=1/60;
 while(t<26){ t+=dt;
  if(air){ air.vy-=G*dt; air.x+=air.vx*dt; air.y+=air.vy*dt; air.rot+=(air.spinTarget-air.rot)*Math.min(1,dt*6); air.t+=dt;
    if(air.spins<spinsPerAir && air.t>0.02){ air.spins++; air.spinTarget+=Math.PI*2*(air.dir>0?1:-1);} 
    if(air.y<=RAMP_H&&air.t>0.15){ const rem=Math.abs(air.spinTarget-air.rot); const spins=air.spins,dir=air.dir,v0=air.v0; const ok=rem<1.25||spins===0; air=null; s=dir>0?1:-1;
      if(ok){ const gain=spins*spins*20+(spins?10:0); if(spins){combo++; score+=gain*Math.min(3,combo);} v=-dir*Math.max(3.2,Math.abs(v0)*0.95);} else {bails++;combo=0;v=0;s=dir*0.95;} }
    continue; }
  const slope=2*s*RAMP_H; const down=(s>0&&v<0)||(s<0&&v>0); const pump = pumpMode==='hold' ? true : pumpMode==='down' ? down : false;
  let acc=-slope*G*0.45; if(pump&&down) acc+=-Math.sign(s)*4.6; acc-=v*0.09; v+=acc*dt; s+=v*dt*0.42;
  if(Math.abs(s)>=1){ const dir=Math.sign(s), speed=Math.abs(v); s=dir; if(speed>2.4){ airs++; (global.SP=global.SP||[]).push(speed); air={x:dir,y:RAMP_H,vx:dir*speed*0.12,vy:speed*0.9,rot:0,spinTarget:0,spins:0,dir,t:0,v0:v}; } else v=-v*0.6; } }
 return {airs,score,bails,final:Math.max(10,Math.min(100,Math.round(10+score/4-bails*3)))};
}
for(const m of ['hold','down']) for(const k of [1,2,3]) console.log(m,'spins/air',k,JSON.stringify(run(m,k)));
global.SP=[]; run('hold',1); const sp=global.SP; console.log('lip speeds (1spin hold):', sp.map(x=>x.toFixed(2)).join(' '));
const need=(k)=>{ // min airtime for k spins pressed at t=0: rem=2πk·e^{-6T} (approx continuous) <1.25
 return Math.log(2*Math.PI*k/1.25)/6; };
for(const k of [1,2,3]){ const T=need(k); console.log(`${k}回転: 必要滞空 ${T.toFixed(3)}s → 必要リップ速度 ${(T*14/(2*0.9)).toFixed(2)}`); }
