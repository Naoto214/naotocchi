const {play}=require('./common.cjs');
const res=[];
for (let seed=1;seed<=40;seed++){ const r=play('sugoroku-race',{seed, during:(h,t,box)=>{ if(t%300===0){ h.dispatch(box.querySelector('#sgRoll'),'pointerdown',{pointerId:1}); } }}); res.push([r.raw, Math.round(r.t/1000)]); }
const sc=res.map(r=>r[0]).sort((a,b)=>a-b); console.log(sc.join(' ')); console.log('times', res.map(r=>r[1]).join(' '));
console.log('<30:',sc.filter(s=>s<30).length,'30-69:',sc.filter(s=>s>=30&&s<70).length,'>=70:',sc.filter(s=>s>=70).length);
