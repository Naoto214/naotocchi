const {harness}=require(process.cwd()+'/tests/helpers/runtime-harness.cjs');
function fakeCtx(){const grad={addColorStop(){}};return new Proxy({},{get(t,k){if(k in t)return t[k];if(k==='createLinearGradient'||k==='createRadialGradient'||k==='createPattern')return()=>grad;if(k==='measureText')return()=>({width:0});return()=>{};},set(t,k,v){t[k]=v;return true;}});}
const [mode,from,to]=process.argv.slice(2);const res=[];
for(let seed=+from;seed<+to;seed++){
 const h=harness({seed,canvasContext:fakeCtx()});const s=h.api.state();if(mode==='short')s.lifetime.minigameLength='short';
 const game=h.api.games.find(g=>g.id==='sugoroku-race');let box,score=null,t=0,hint='';
 h.api.startMinigame({id:game.id,start(c,done){box=c;game.start(c,(sc)=>{if(score===null){score=sc;}done(sc);});}});
 const btn=box.querySelector('#sgRoll');const hintEl=box.querySelector('#sgHint');
 while(score===null&&t<80000){ if(!btn.disabled){ // 押すまで ランダムな 待ち(人の反応) 
   h.advance(200+Math.floor(Math.random()*300)); t+=400; for(const l of btn.listeners) if(l.type==='pointerdown') l.fn({type:'pointerdown',preventDefault(){}}); }
   h.advance(50);t+=50; if(/ゴール|い…|1い/.test(hintEl.textContent)) hint=hintEl.textContent; }
 res.push({score,hint:hintEl.textContent.slice(0,20)});
}
console.log(JSON.stringify(res));
