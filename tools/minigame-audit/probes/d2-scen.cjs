const {play}=require('./d2-idle.cjs'); let CAN;
const tap=(h,box,x,y,sel)=>{const n=box.querySelector(sel||CAN);h.dispatch(n,'pointerdown',{pointerId:1,clientX:x,clientY:y,button:0});};
const out=(name,r)=>console.log(name,'raw',r.raw,'counted',r.counted,'t',r.t,JSON.stringify(r.play||null));
// jenga one pull
CAN='#jgCanvas';
for (const seed of [1,2]) out('jenga 1pull',play('jenga-tower',{seed,during:(h,t,box)=>{if(t===1000)tap(h,box,150,345-16+8);}}));
// jenga middle pulls
for (const seed of [1,2,3]) out('jenga middles',play('jenga-tower',{seed,during:(h,t,box)=>{if(t>=1000&&t%1500===0){const r=(t/1500|0)-1;if(r>=0&&r<10)tap(h,box,150,345-(r+1)*16+8);}}}));
// jenga random spam
for (const seed of [1,2,3]) out('jenga random',play('jenga-tower',{seed,during:(h,t,box)=>{if(t>=1000&&t%700===0){tap(h,box,150+(Math.floor(Math.random()*3)-1)*34,345-(Math.floor(Math.random()*10)+1)*16+8);}}}));
// memory random spam
CAN='#mcCanvas';
for (const seed of [1,2,3,4,5]) out('memory random',play('memory-cards',{seed,during:(h,t,box)=>{if(t>=500&&t%300===0){tap(h,box,Math.floor(Math.random()*4)*75+37,Math.floor(Math.random()*4)*75+37);}}}));
// lights-out random spam
CAN='#loCanvas';
for (const seed of [1,2,3]) out('lights random',play('lights-out',{seed,during:(h,t,box)=>{if(t>=500&&t%300===0){const C=(300-28)/5;tap(h,box,14+Math.floor(Math.random()*5)*C+C/2,14+Math.floor(Math.random()*5)*C+C/2);}}}));
// sushi random spam
CAN='#sbCanvas';
for (const seed of [1,2,3]) out('sushi spam',play('sushi-belt',{seed,during:(h,t,box)=>{if(t>=2000&&t%200===0){tap(h,box,Math.random()*300,Math.random()<0.5?120-6:187-6);}}}));
// asteroids: spam fire only
CAN='#asCanvas';
for (const seed of [1,2,3]) out('asteroid fire spam',play('asteroids-classic',{seed,during:(h,t,box)=>{if(t>=1500&&t%300===0){tap(h,box,150,150);}}}));
// halfpipe: hold pump, tap trick periodically
