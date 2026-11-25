const {play}=require('./common.cjs');
const out=[];
for (const seed of [1,2,3,4,5,6]) { const r=play('plane-landing',{seed, during:(h,t,box)=>{ if(t===1000||t===6000||t===20000){ const n=box.querySelector('#plCanvas'); h.dispatch(n,'pointerdown',{pointerId:1,clientX:150,clientY:150,button:0}); h.dispatch(n,'pointermove',{pointerId:1,clientX:150,clientY:151}); h.dispatch(n,'pointerup',{pointerId:1,clientX:150,clientY:151}); } }}); out.push(`${r.raw} counted=${r.counted} ${JSON.stringify(r.detail)}`); }
console.log(out.join('\n'));
