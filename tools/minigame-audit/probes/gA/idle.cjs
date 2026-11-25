const {harness} = require('/home/user/naotocchi/tests/helpers/runtime-harness.cjs');
function fakeCtx(){const grad={addColorStop(){}};return new Proxy({},{get(t,k){if(k in t)return t[k];if(k==='createLinearGradient'||k==='createRadialGradient'||k==='createPattern')return()=>grad;if(k==='measureText')return()=>({width:0});if(k==='getImageData')return()=>({data:new Uint8ClampedArray(4)});return()=>{};},set(t,k,v){t[k]=v;return true;}});}
function play(id,{seed=1,during,mode=process.env.MODE,age=process.env.AGE}={}){const h=harness({seed,canvasContext:fakeCtx()});const s=h.api.state();Object.assign(s,{isSleeping:false,isSick:false,energy:100,health:100,hunger:80});if(mode)s.lifetime.minigameDifficulty=mode;if(age)s.ageTicks=Number(age);if(process.env.LEN)s.lifetime.minigameLength=process.env.LEN;
const game=h.api.games.find(g=>g.id===id);if(!game)return {err:'nogame'};let box=null,raw=null,t0=0,meter=null,tEnd=null,counted=null;
h.api.startMinigame({id,start(c,done){box=c;return game.start(c,(sc,...rest)=>{if(raw!==null)return;raw=sc;meter=rest[1];const n=s.minigameCount;done(sc,...rest);counted=s.minigameCount-n;});}});
let t=0;for(;raw===null&&t<400000;t+=100){if(during)during(h,t,box);h.advance(100);}return {raw,t,meter:JSON.stringify(meter),counted};}
module.exports={play,fakeCtx};
if(require.main===module){const ids=process.argv.slice(2);for(const id of ids){const r=[];for(const seed of [1,2,3,4,5]){try{const p=play(id,{seed});r.push(`${p.raw}@${p.t/1000}s c${p.counted}`);}catch(e){r.push('ERR '+e.message.slice(0,80));}}console.log(id,r.join(' | '));}}
