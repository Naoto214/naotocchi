const {play}=require('./run.cjs');
const q=(b,s)=>b.querySelector(s);
const tap=(h,el,id=1)=>{h.dispatch(el,'pointerdown',{pointerId:id,clientX:10,clientY:10,button:0});h.dispatch(el,'pointerup',{pointerId:id,clientX:10,clientY:10,button:0});};
const out=(name,f)=>{const r=[];for(let seed=1;seed<=5;seed++){const p=f(seed);r.push(p.raw+'@'+(p.t/1000).toFixed(1)+(p.counted!=null?'c'+p.counted:''));}console.log(name,r.join(' | '));};
const which=process.argv[2];
if(!which||which==='rhythm'){
 for(const iv of [50,100,150]) out('rhythm mash every'+iv,seed=>play('rhythm-highway-3d',{seed,during:(h,t,b)=>{if(t%iv===0)for(const s of ['#rhL','#rhM','#rhR'])tap(h,q(b,s));}}));
}
if(!which||which==='td'){
 const place=(h,b,cells)=>{const c=q(b,'#tdCanvas'),CELL=300/8;for(const [x,y] of cells){h.dispatch(c,'pointerdown',{pointerId:1,clientX:(x+.5)*CELL,clientY:(y+.5)*CELL});}};
 for(const length of ['normal','short']){
  out('td 0 tower(touch only) '+length,seed=>play('tower-defense',{seed,mode:{length},during:(h,t,b)=>{if(t===500)tap(h,q(b,'#tdIce'));}}));
  out('td 2 arrows '+length,seed=>play('tower-defense',{seed,mode:{length},during:(h,t,b)=>{if(t===500)place(h,b,[[2,2],[4,4]]);}}));
  out('td 2 arrows+buy more '+length,seed=>play('tower-defense',{seed,mode:{length},during:(h,t,b)=>{if(t===500)place(h,b,[[2,2],[4,4]]); if(t%3000===0) place(h,b,[[4,3],[2,4],[4,2],[6,3],[0,2],[2,0],[6,1],[4,6]]);}}));
 }
}
if(!which||which==='fight'){
 out('fight punch spam 100ms',seed=>play('street-fight',{seed,during:(h,t,b)=>{if(t%100===0)tap(h,q(b,'#sfPunch'));}}));
 out('fight punch every 500ms',seed=>play('street-fight',{seed,during:(h,t,b)=>{if(t%500===0)tap(h,q(b,'#sfPunch'));}}));
 out('fight kick every 750ms',seed=>play('street-fight',{seed,during:(h,t,b)=>{if(t%750===0)tap(h,q(b,'#sfKick'));}}));
 out('fight guard hold',seed=>play('street-fight',{seed,during:(h,t,b)=>{if(t===100)h.dispatch(q(b,'#sfGuard'),'pointerdown',{pointerId:3,clientX:1,clientY:1});}}));
}
if(!which||which==='gun'){
 out('gunner fire spam center',seed=>play('space-gunner-3d',{seed,during:(h,t,b)=>{if(t%200===0)tap(h,q(b,'#sgFire'));}}));
}
if(!which||which==='chain'){
 out('chain harddrop spam',seed=>play('chain-puzzle',{seed,during:(h,t,b)=>{if(t%300===0)tap(h,q(b,'#fbDrop'));}}));
}
if(!which||which==='tilt'){
 out('tilt touch once',seed=>play('tilt-maze-3d',{seed,during:(h,t,b)=>{if(t===2000){const c=q(b,'#tmCanvas');h.dispatch(c,'pointerdown',{pointerId:1,clientX:150,clientY:150});h.dispatch(c,'pointermove',{pointerId:1,clientX:152,clientY:150});h.dispatch(c,'pointerup',{pointerId:1,clientX:152,clientY:150});}}}));
}
if(!which||which==='sky'){
 out('sky wiggle',seed=>play('sky-shooter',{seed,during:(h,t,b)=>{const c=q(b,'#ssCanvas');if(t%1000===0){h.dispatch(c,'pointerdown',{pointerId:1,clientX:100,clientY:100});h.dispatch(c,'pointermove',{pointerId:1,clientX:100,clientY:100+((t/1000)%2?30:-30)});h.dispatch(c,'pointerup',{pointerId:1,clientX:100,clientY:100});}}}));
}
if(!which||which==='pp'){
 out('pingpong short idle',seed=>play('pingpong-3d',{seed,mode:{length:'short'}}));
}
