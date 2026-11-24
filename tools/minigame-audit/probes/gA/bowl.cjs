const {play}=require('./idle.cjs');
const pd=(h,n,x,y)=>h.dispatch(n,'pointerdown',{pointerId:1,clientX:x,clientY:y,button:0});
const pm=(h,n,x,y)=>h.dispatch(n,'pointermove',{pointerId:1,clientX:x,clientY:y,button:0});
const pu=(h,n,x,y)=>h.dispatch(n,'pointerup',{pointerId:1,clientX:x,clientY:y,button:0});
for(const dx of [-6,-3,0,3,6]){for(const fast of [true,false]){const r=[];for(const seed of [1,2,3,4,5,6]){const p=play('bowling-3d',{seed,during:(h,t,box)=>{const c=box.querySelector('#bwCanvas');const ph=t%6000;if(ph===1000){pd(h,c,150,250);if(fast){pm(h,c,150+dx/2,190);pm(h,c,150+dx,130);pu(h,c,150+dx,130);}}if(!fast&&ph===1100)pm(h,c,150+dx/2,190);if(!fast&&ph===1200){pm(h,c,150+dx,130);pu(h,c,150+dx,130);}}});r.push(p.raw);}console.log('dx',dx,fast?'fast':'slow',r.join(','));}}
