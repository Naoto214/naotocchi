// ソリティア(games.js の makeSolitaireGame と同じ配り: 1枚めくり・山札は何度でも戻せる)の 解ける割合を 推定する。
// 深さ優先+局面メモ。ノード上限に達したものは「判定不能」
function rng(seed){let s=seed>>>0;return()=>((s=(Math.imul(s,1664525)+1013904223)>>>0)/4294967296);}
function deal(r){const S=['S','H','D','C'];const d=[];for(const s of S)for(let k=1;k<=13;k++)d.push({s,r:k,red:s==='H'||s==='D'});
for(let i=d.length-1;i>0;i--){const j=Math.floor(r()*(i+1));[d[i],d[j]]=[d[j],d[i]];}
const tab=[[],[],[],[],[],[],[]];const up=[[],[],[],[],[],[],[]];for(let c=0;c<7;c++)for(let k=0;k<=c;k++){tab[c].push(d.pop());up[c].push(k===c);} return {tab,up,stock:d};}
function solve(g,LIMIT){
 // state: tab columns (cards with up flags), stock list (as order), waste, found counts
 const st={tab:g.tab.map((c,i)=>c.map((x,k)=>({...x,u:g.up[i][k]}))),stock:g.stock.slice(),waste:[],f:{S:0,H:0,D:0,C:0}};
 const seen=new Set();let nodes=0;
 const key=()=>st.tab.map(c=>c.map(x=>x.s+x.r+(x.u?'u':'d')).join('.')).join('|')+'#'+st.stock.map(x=>x.s+x.r).join('.')+'#'+st.waste.map(x=>x.s+x.r).join('.');
 const done=()=>st.f.S+st.f.H+st.f.D+st.f.C===52;
 function rec(){ if(done())return true; if(++nodes>LIMIT)return null; const k=key(); if(seen.has(k))return false; seen.add(k);
  const moves=[];
  // to foundation from waste/tab
  const w=st.waste[st.waste.length-1];
  if(w&&st.f[w.s]===w.r-1)moves.push(['wf']);
  st.tab.forEach((c,i)=>{const t=c[c.length-1];if(t&&t.u&&st.f[t.s]===t.r-1)moves.push(['tf',i]);});
  // tab to tab (sequences)
  st.tab.forEach((c,i)=>{for(let p=0;p<c.length;p++){if(!c[p].u)continue;const card=c[p];st.tab.forEach((d,j)=>{if(i===j)return;const top=d[d.length-1];
    if(!top){if(card.r===13&&p>0)moves.push(['tt',i,p,j]);}else if(top.u&&top.r===card.r+1&&top.red!==card.red)moves.push(['tt',i,p,j]);});break;}});
  if(w)st.tab.forEach((d,j)=>{const top=d[d.length-1];if(!top?w.r===13:(top.u&&top.r===w.r+1&&top.red!==w.red))moves.push(['wt',j]);});
  moves.push(['draw']);
  for(const m of moves){const undo=apply(m);if(!undo)continue;const r=rec();undo();if(r)return true;if(r===null)return null;}
  return false;}
 function apply(m){
  if(m[0]==='wf'){const c=st.waste.pop();st.f[c.s]++;return()=>{st.f[c.s]--;st.waste.push(c);};}
  if(m[0]==='tf'){const col=st.tab[m[1]];const c=col.pop();st.f[c.s]++;const b=col[col.length-1];const flip=b&&!b.u;if(flip)b.u=true;return()=>{if(flip)b.u=false;col.push(c);st.f[c.s]--;};}
  if(m[0]==='tt'){const[,i,p,j]=m;const mv=st.tab[i].splice(p);st.tab[j].push(...mv);const b=st.tab[i][st.tab[i].length-1];const flip=b&&!b.u;if(flip)b.u=true;return()=>{if(flip)b.u=false;st.tab[j].splice(st.tab[j].length-mv.length);st.tab[i].push(...mv);};}
  if(m[0]==='wt'){const c=st.waste.pop();st.tab[m[1]].push({...c,u:true});return()=>{st.tab[m[1]].pop();st.waste.push(c);};}
  if(m[0]==='draw'){if(st.stock.length){const c=st.stock.pop();st.waste.push(c);return()=>{st.waste.pop();st.stock.push(c);};}
    if(!st.waste.length)return null;const ow=st.waste;st.stock=ow.slice().reverse();st.waste=[];return()=>{st.waste=ow;st.stock=[];};}
 }
 return rec();
}
const N=+process.argv[2]||200, LIMIT=+process.argv[3]||300000;let win=0,lose=0,unk=0;
for(let i=1;i<=N;i++){const r=solve(deal(rng(i*7919+13)),LIMIT);if(r===true)win++;else if(r===false)lose++;else unk++;}
console.log(JSON.stringify({deals:N,solvable:win,unsolvable:lose,unknown:unk}));
