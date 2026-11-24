const {play}=require('./common.cjs');
for (const seed of [1,2,3,4,5,6,7,8]) { let txt=null; play('dot-eater',{seed, during:(h,t,box)=>{ if(t===200){ txt=box.querySelector('#deScore').textContent; } }}); console.log(seed, txt); }
