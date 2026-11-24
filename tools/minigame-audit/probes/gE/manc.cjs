const {play}=require('./common.cjs');
const period=+process.argv[2]||1500;
const res=[];
for (let seed=1;seed<=30;seed++){ const r=play('mancala-kalah',{seed, during:(h,t,box)=>{ if(t%period===0){ const i=Math.floor(Math.random()*6); h.dispatch(box.querySelector('#mkCanvas'),'pointerdown',{pointerId:1,clientX:34+(i+0.5)*(244-68)/6,clientY:140}); } }}); res.push(`${r.raw}/${Math.round(r.t/1000)}s/${r.detail.decided?'D':'T'}`); }
console.log(res.join(' '));
const sc=res.map(s=>+s.split('/')[0]); console.log('<30',sc.filter(s=>s<30).length,'30-69',sc.filter(s=>s>=30&&s<70).length,'>=70',sc.filter(s=>s>=70).length);
