// event-time replica of games.js 9739-9790 (sugoroku). Human stops die after HUMAN_MS; d=difficulty.
function run(HUMAN_MS, d, LIMIT){ const LEN=20; const cells=Array(LEN).fill('normal'); const kinds=['plus','minus','star','rest','star','plus','minus','rest','star','plus','minus']; const slots=[]; for(let i=2;i<LEN-1;i++)slots.push(i); for(let i=slots.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[slots[i],slots[j]]=[slots[j],slots[i]];} kinds.forEach((k,i)=>cells[slots[i]]=k); cells[LEN-1]='goal';
 const P=[{pos:0,skip:0,cpu:false},{pos:0,skip:0,cpu:true},{pos:0,skip:0,cpu:true}]; let t=0, turn=0, finished=[], coins=0;
 const lerp=(a,b,x)=>a+(b-a)*x;
 function move(p,n){ const dir=Math.sign(n); for(let k=0;k<Math.abs(n);k++){ p.pos=Math.min(LEN-1,Math.max(0,p.pos+dir)); t+=230; if(p.pos===LEN-1&&dir>0) break; } }
 while(t<LIMIT){ const p=P[turn]; // rolling
   t += p.cpu ? 900+Math.random()*600 : HUMAN_MS; if(t>=LIMIT) break;
   const v = p.cpu ? (Math.random()<lerp(0.15,0.4,d) ? 4+Math.floor(Math.random()*3) : 1+Math.floor(Math.random()*6)) : 1+Math.floor(Math.random()*6);
   t+=350; move(p,v); 
   let c=cells[p.pos];
   if(c==='plus'){t+=500; move(p,2); c=cells[p.pos]==='goal'?'goal':'x';} else if(c==='minus'){t+=500; move(p,-2); c=cells[p.pos]==='goal'?'goal':'x';}
   if(c==='goal'){ finished.push(p); if(p===P[0]||finished.length>=2) break; }
   else if(c==='star'){ if(p===P[0]) coins+=3; } else if(c==='rest'){ p.skip=1; }
   t+=700; // nextTurn wait
   let found=false; for(let k=0;k<3;k++){ turn=(turn+1)%3; const q=P[turn]; if(finished.includes(q)) continue; if(q.skip>0){q.skip--; continue;} found=true; break; } if(!found) break;
 }
 const meFin=finished.includes(P[0]); return {timeout:t>=LIMIT, meFin, t};
}
for (const [H,d,L] of [[600,0.3,50000],[1000,0.3,50000],[600,0.55,50000],[600,0.3,60000],[600,0.3,35000]]) { let to=0, fin=0, N=20000; for(let i=0;i<N;i++){const r=run(H,d,L); if(r.timeout) to++; if(r.meFin) fin++;} console.log(`human=${H}ms d=${d} limit=${L/1000}s: timeout ${(to/N*100).toFixed(1)}%, player reached goal ${(fin/N*100).toFixed(1)}%`); }
