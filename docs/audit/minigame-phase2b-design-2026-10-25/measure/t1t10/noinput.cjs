// 無操作で各ゲームを最後まで進め、点数・終了時刻・時計表示の有無を測る
const path=process.cwd()+'/tests/helpers/runtime-harness.cjs';
const {harness}=require(path);
function fakeCtx(){const grad={addColorStop(){}};return new Proxy({},{get(t,k){if(k in t)return t[k];if(k==='createLinearGradient'||k==='createRadialGradient'||k==='createPattern')return()=>grad;if(k==='measureText')return()=>({width:0});if(k==='getImageData')return()=>({data:new Uint8ClampedArray(4)});return()=>{};},set(t,k,v){t[k]=v;return true;}});}
const [from,to,mode,seedArg]=process.argv.slice(2);
const seed=+seedArg||1;
const h0=harness({seed:1});const ids=h0.api.games.map(g=>g.id);
const out=[];
for(const id of ids.slice(+from,+to)){
  const h=harness({seed,canvasContext:fakeCtx()});
  const s=h.api.state(); if(mode==='short') s.lifetime.minigameLength='short';
  const game=h.api.games.find(g=>g.id===id);let box=null,score=null,at=null;let t=0;
  try{
    h.api.startMinigame({id,start(c,done){box=c;game.start(c,(sc)=>{if(score===null){score=sc;at=t;}done(sc);});}});
    const html=box?box.innerHTML:'';const timerShown=/残り|⏱/.test(html);
    while(score===null&&t<240000){h.advance(100);t+=100;}
    out.push({id,score,endMs:at,timerShown});
  }catch(e){out.push({id,err:String(e).slice(0,80)});}
}
console.log(JSON.stringify(out));
