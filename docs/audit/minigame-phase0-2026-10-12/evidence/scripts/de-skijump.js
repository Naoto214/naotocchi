// games.js 5814-5911 ski-jump の物理を再現。strategy: 'none'(スタートだけ押す) / 'hold'(常に長押し) / 'perfect'(タイミング完璧+目印に追従)
const lerp=(a,b,t)=>a+(b-a)*t, clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
function run(strategy,difficulty){
  const G=9.8,RAMP_END=40; const rampY=px=>px<RAMP_END?24*Math.pow(1-px/RAMP_END,1.6):0;
  const hillY=px=>{const d=px-RAMP_END;return d<=0?0:-(0.62*d+2*(1-Math.exp(-d/2)));};
  let total=0,crashes=0;
  for(let j=0;j<3;j++){
    let x=0,y=rampY(0),vx=0,vy=0,lean=0,phase='run',flightT=0,windT=0;
    const wind=(Math.random()-0.5)*lerp(0.3,0.8,difficulty); let leanTarget=0.5+wind*0.4;
    const dt=1/60;
    const takeoff=()=>{const err=Math.abs(x-RAMP_END);const q=clamp(1-err/4,0,1);phase='fly';vy=2.2+q*4.2;vx=vx*(0.98+q*0.08);if(x<RAMP_END){x=RAMP_END;y=0;}};
    for(let t=0;t<60;t+=dt){
      if(phase==='run'){const slope=(rampY(x+0.1)-rampY(x))/0.1;vx+=(G*-slope*0.9-vx*0.02)*dt;vx=Math.max(vx,0);x+=vx*dt;y=rampY(x);
        if(strategy!=='none'&&strategy!=='hold'&&x>=RAMP_END){takeoff();}
        else if(x>RAMP_END+2.5){takeoff();vy=0.5;}}
      else if(phase==='fly'){flightT+=dt;windT+=dt;if(windT>0.6){windT=0;leanTarget=clamp(0.5+wind*0.4+(Math.random()-0.5)*lerp(0.1,0.3,difficulty),0.1,0.95);}
        let held = strategy==='hold' ? true : strategy==='perfect' ? (lean<leanTarget) : false;
        lean+=((held?1:0)-lean)*Math.min(1,dt*3.2);
        const q=1-Math.abs(lean-leanTarget)/0.5;const lift=1.0+clamp(q,-0.6,1)*3.5;
        vy+=(-G+lift)*dt;vx+=(q>0.6?0.6:-0.8)*dt;vx=Math.max(vx,8);x+=vx*dt;y+=vy*dt;
        if(y<=hillY(x)+0.01&&x>RAMP_END+0.5){let dist=Math.max(0,x-RAMP_END);const crashed=Math.abs(lean-leanTarget)>0.5||flightT<0.6;if(crashed){dist*=0.55;crashes++;}total+=dist;break;}}
    }
  }
  return {score:clamp(Math.round(10+total*0.26),10,100),crashes};
}
for(const s of ['none','hold','perfect'])for(const d of [0,0.55,1]){let sum=0,cr=0,N=2000;for(let i=0;i<N;i++){const r=run(s,d);sum+=r.score;cr+=r.crashes;}console.log(s,'d=',d,'avgScore',(sum/N).toFixed(1),'crash/jump',(cr/N/3).toFixed(2));}
