const perms=[];const f=(a)=>{if(a.length===4){perms.push(a.slice());return;}for(let c=0;c<6;c++)if(!a.includes(c)){a.push(c);f(a);a.pop();}};f([]);
const ans=[0,1,2,3]; const hist={}; let ge30=0;
for(const g of perms){let h=0,b=0;for(let i=0;i<4;i++){if(g[i]===ans[i])h++;else if(ans.includes(g[i]))b++;} if(h===4)continue; const s=18+h*6+b*2; hist[s]=(hist[s]||0)+1; if(s>=30)ge30++;}
console.log(perms.length, JSON.stringify(hist), 'P(>=30)', ge30/(perms.length-1));
// minimax-ish: avg guesses with simple consistent strategy
function fb(g,a){let h=0,b=0;for(let i=0;i<4;i++){if(g[i]===a[i])h++;else if(a.includes(g[i]))b++;}return h*10+b;}
let tot=0,worst=0,dist={}; for(const a of perms){ let cand=perms.slice(), n=0; while(true){ n++; // pick guess minimizing max partition among all perms
  let best=null,bs=1e9; if(cand.length===1){best=cand[0];} else for(const g of perms){const m={};for(const c of cand){const k=fb(g,c);m[k]=(m[k]||0)+1;} const mx=Math.max(...Object.values(m))- (cand.includes(g)?0.5:0); if(mx<bs){bs=mx;best=g;}}
  if(fb(best,a)===40)break; const k=fb(best,a); cand=cand.filter(c=>fb(best,c)===k);} tot+=n; worst=Math.max(worst,n); dist[n]=(dist[n]||0)+1; }
console.log('minimax avg',tot/perms.length,'worst',worst,JSON.stringify(dist));
