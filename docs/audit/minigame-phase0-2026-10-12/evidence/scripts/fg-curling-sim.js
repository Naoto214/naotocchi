// curling stone travel time (games.js 7646-7650 physics), single stone, no sweep, 60fps, 3 substeps
function travel(reach, curl=0, sweepTaps=0){
  let v=Math.sqrt(2*38*reach), vx=0, vy=-v, t=0, sweep=0, dt=1/60;
  while(true){ let any=false; for(let i=0;i<3;i++){ const d=dt/3; const sp=Math.hypot(vx,vy); if(sp>0){const fr=(38-Math.min(20,sweep*14))*d; const ns=Math.max(0,sp-fr); vx*=ns/sp; vy*=ns/sp; if(ns>0){any=true; vx+=curl*9*d*(ns/200);} } if(sweep>0) sweep=Math.max(0,sweep-d*1.2);} t+=dt; if(!any) break; if(t>60) break; }
  return t;
}
for (const W of [300,340,390,430]) { for (const H of [W*1.5, 360]) {
  const reachBtn = (H-30) - 0.22*H; const reachMin=90; const hogReach=(H-30)-(H*0.6+40);
  const tb=travel(reachBtn), tm=travel(reachMin), th=travel(hogReach);
  const aiT = 0.9 + travel(reachBtn*Math.pow(0.945,2)); // AI speed ~0.945 avg factor
  const P=(n,ta)=> n*aiT + n*ta;
  console.log(`W=${W} H=${H.toFixed(0)} reachBtn=${reachBtn.toFixed(0)} t_btn=${tb.toFixed(2)} t_hog=${th.toFixed(2)} t_min=${tm.toFixed(2)} ai=${aiT.toFixed(2)} | 6投(btn,aim0)=${P(3,tb).toFixed(1)} 8投(btn,aim0)=${P(4,tb).toFixed(1)} 8投(hog,aim0)=${P(4,th).toFixed(1)} 8投(min)=${P(4,tm).toFixed(1)}`);
}}
