const {play}=require('./idle.cjs');
const seeds=[1,2,3,4,5,6,7,8];
function run(label,id,during){const r=[];for(const seed of seeds){const p=play(id,{seed,during});r.push(`${p.raw}@${(p.t/1000).toFixed(1)}s c${p.counted}`);}console.log(label,'|',r.join(' | '));}
const pd=(h,n,x,y,id=1)=>h.dispatch(n,'pointerdown',{pointerId:id,clientX:x,clientY:y,button:0});
const pm=(h,n,x,y,id=1)=>h.dispatch(n,'pointermove',{pointerId:id,clientX:x,clientY:y,button:0});
const pu=(h,n,x,y,id=1)=>h.dispatch(n,'pointerup',{pointerId:id,clientX:x,clientY:y,button:0});
const which=process.argv[2];
if(!which||which==='archery'){
// straight down full pull, no wind correction, each 3s
run('archery straight-down','archery-3d',(h,t,box)=>{const c=box.querySelector('#arCanvas');const ph=t%3000;if(ph===200)pd(h,c,150,150);if(ph===400)pm(h,c,150,200);if(ph===600)pm(h,c,150,270);if(ph===800)pu(h,c,150,270);});
}
if(!which||which==='fb'){
run('fallingblock harddrop spam','falling-block-puzzle',(h,t,box)=>{if(t>700&&t%200===0){const b=box.querySelector('#fbDrop');b.onpointerdown({preventDefault(){}});}});
run('fallingblock rotate every 1s','falling-block-puzzle',(h,t,box)=>{if(t>700&&t%1000===0){const b=box.querySelector('#fbRotate');b.onpointerdown({preventDefault(){}});}});
}
if(!which||which==='dh'){
run('downhill jump every 1s','downhill-snow',(h,t,box)=>{if(t>700&&t%1000===0){const b=box.querySelector('#dhJump');pd(h,b,0,0);}});
}
if(!which||which==='road'){
run('road tap center every 2s','road-themed',(h,t,box)=>{if(t%2000===0){const c=box.querySelector('#lrCanvas');pd(h,c,150,150);pu(h,c,150,150);}});
run('road-city tap center every 2s','road-city',(h,t,box)=>{if(t%2000===0){const c=box.querySelector('#lrCanvas');pd(h,c,150,150);pu(h,c,150,150);}});
}
if(!which||which==='bowl'){
run('bowling straight swipe','bowling-3d',(h,t,box)=>{const c=box.querySelector('#bwCanvas');const ph=t%6000;if(ph===1000)pd(h,c,150,250);if(ph===1100)pm(h,c,150,200);if(ph===1200){pm(h,c,150,120);pu(h,c,150,120);}});
}
if(!which||which==='stack'){
run('stack tap every 1.3s','stack-themed',(h,t,box)=>{if(t>700&&t%1300===0){const b=box.querySelector('#stDrop');pd(h,b,0,0);}});
}
if(!which||which==='crane'){
run('crane quick taps','crane-game-3d',(h,t,box)=>{const c=box.querySelector('#crMove');const ph=t%5000;if(ph===500){pd(h,c,0,0);}if(ph===600)pu(h,c,0,0);if(ph===1000)pd(h,c,0,0);if(ph===1100)pu(h,c,0,0);});
}
if(!which||which==='climb'){
run('climb spam grab 0.5s','downhill-mountain',(h,t,box)=>{if(t>700&&t%500===0){pd(h,box.querySelector('#climbGo'),0,0);}});
}
if(!which||which==='bk'){
run('breakout idle','breakout-classic',null);
}
