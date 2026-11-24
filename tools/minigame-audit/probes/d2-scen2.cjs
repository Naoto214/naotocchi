const {play}=require('./d2-idle.cjs');
const ev=(h,n,type,x,y,id=1)=>h.dispatch(n,type,{pointerId:id,clientX:x,clientY:y,button:0});
const out=(name,r)=>console.log(name,'raw',r.raw,'counted',r.counted,'t',r.t,JSON.stringify(r.play||null));
const S=process.argv[2]||'all'; const seeds=[1,2,3,4,5,6];
if(S==='all'||S==='ast') for (const seed of seeds) out('asteroid fire spam 300ms',play('asteroids-classic',{seed,during:(h,t,box)=>{if(t>=1500&&t%300===0)ev(h,box.querySelector('#asCanvas'),'pointerdown',150,150);}}));
if(S==='all'||S==='sushi') for (const seed of seeds) out('sushi spam',play('sushi-belt',{seed,during:(h,t,box)=>{if(t>=2000&&t%200===0)ev(h,box.querySelector('#sbCanvas'),'pointerdown',Math.random()*300,Math.random()<0.5?114:181);}}));
if(S==='all'||S==='hp') for (const iv of [100,200,400]) for (const seed of [1,2,3]) out('halfpipe pump+mash '+iv,play('halfpipe-skate',{seed,during:(h,t,box)=>{if(t===1000)ev(h,box.querySelector('#hpPump'),'pointerdown',0,0,7); if(t>=1000&&t%iv===0)ev(h,box.querySelector('#hpCanvas'),'pointerdown',100,100,2);}}));
if(S==='all'||S==='hp') for (const seed of [1,2,3]) out('halfpipe pump only',play('halfpipe-skate',{seed,during:(h,t,box)=>{if(t===1000)ev(h,box.querySelector('#hpPump'),'pointerdown',0,0,7);}}));
if(S==='all'||S==='vox') for (const seed of [1,2,3]) out('voxel swipe down',play('voxel-mine',{seed,during:(h,t,box)=>{const c=box.querySelector('#vmCanvas');if(t>=1500&&t%400===0){ev(h,c,'pointerdown',150,100);ev(h,c,'pointermove',150,140);}}}));
if(S==='all'||S==='dj') for (const seed of [1,2,3]) out('doodle wiggle',play('doodle-jump',{seed,during:(h,t,box)=>{const c=box.querySelector('#djCanvas');if(t===1000)ev(h,c,'pointerdown',150,200);if(t>1000&&t%200===0)ev(h,c,'pointermove',150+Math.sin(t/700)*60,200);}}));
if(S==='all'||S==='cu') {
  const throwAt=(len)=>(h,t,box)=>{const c=box.querySelector('#cuCanvas');if(t>=1000&&t%2500===0){ev(h,c,'pointerdown',150,420);ev(h,c,'pointermove',150,420-len);ev(h,c,'pointerup',150,420-len);}};
  for (const id of ['curling-ice','curling-winter']) {
   for (const seed of seeds) out(id+' aim button',play(id,{seed,during:throwAt(321/2.4)}));
   for (const seed of seeds) out(id+' weak throws',play(id,{seed,during:throwAt(25)}));
  }
}
if(S==='all'||S==='dom') for (const seed of [1,2,3]) out('domino push immediately',play('domino-run',{seed,during:(h,t,box)=>{if(t%2000===0&&t>0)ev(h,box.querySelector('#dmPush'),'pointerdown',0,0);}}));
