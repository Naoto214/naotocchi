const path='/home/user/naotocchi/tests/helpers/runtime-harness.cjs';
const {harness}=require(path);
function fakeCtx(){const grad={addColorStop(){}};return new Proxy({},{get(t,k){if(k in t)return t[k];if(k==='createLinearGradient'||k==='createRadialGradient'||k==='createPattern')return()=>grad;if(k==='measureText')return()=>({width:0});if(k==='getImageData')return()=>({data:new Uint8ClampedArray(4)});return()=>{};},set(t,k,v){t[k]=v;return true;}});}
function play(id,{seed=1,before,during,mode}={}){
  const h=harness({seed,canvasContext:fakeCtx()});const s=h.api.state();Object.assign(s,{isSleeping:false,isSick:false,energy:100,health:100,hunger:80});
  if(mode&&mode.length)s.lifetime.minigameLength=mode.length; if(mode&&mode.diff)s.lifetime.minigameDifficulty=mode.diff;
  if(before)before(h,s);
  const game=h.api.games.find(g=>g.id===id);if(!game)throw new Error('no '+id);
  let box=null,raw=null,detail=null,t=0,counted=null;
  h.api.startMinigame({id,start(c,done){box=c;return game.start(c,(sc,m,d)=>{if(raw!==null)return;raw=sc;detail=d;const n=s.minigameCount;done(sc,m,d);counted=s.minigameCount-n;});}});
  for(t=0;raw===null&&t<240000;t+=50){if(during)during(h,t,box);h.advance(50);}
  return {raw,detail,t,counted,msg:h.api.getMessage&&h.api.getMessage()};
}
module.exports={play};
if(require.main===module){
  const ids=process.argv.slice(2);
  for(const id of ids){const r=[];for(let seed=1;seed<=5;seed++){const p=play(id,{seed});r.push(p.raw+'@'+(p.t/1000).toFixed(1)+'s'+(p.detail?JSON.stringify(p.detail):''));}console.log(id,r.join(' | '));}
}
