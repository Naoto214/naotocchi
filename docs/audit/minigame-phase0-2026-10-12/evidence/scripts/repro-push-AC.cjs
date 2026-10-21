// push-puzzle: クリア直後の 1.2秒 待ちの間に「もどす→同じ手」を くりかえすと solved が多重加算されるかの再現
process.chdir('/home/user/naotocchi');
const vm=require('node:vm');
const {harness}=require('/home/user/naotocchi/tests/helpers/runtime-harness.cjs');
const L0=['#######', '#  #  #', '# $   #', '#  #$ #', '# @  ##', '#  ## #', '#######'];
const G0=[[1,1],[1,4]];
// BFS solver
function solve(L,G){const N=7;let st={p:null,b:[]};L.forEach((r,y)=>[...r].forEach((c,x)=>{if(c==='@')st.p=[x,y];if(c==='$')st.b.push([x,y]);}));
 const wall=(x,y)=>L[y][x]==='#';const key=s=>s.p+'|'+s.b.map(b=>b+'').sort().join(';');
 const goal=s=>G.every(([gy,gx])=>s.b.some(([bx,by])=>bx===gx&&by===gy));
 const q=[[st,[]]];const seen=new Set([key(st)]);
 while(q.length){const [s,path]=q.shift();if(goal(s))return path;
  for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){const nx=s.p[0]+dx,ny=s.p[1]+dy;if(wall(nx,ny))continue;let b=s.b.map(v=>v.slice());const bi=b.findIndex(([bx,by])=>bx===nx&&by===ny);
   if(bi>=0){const bx=nx+dx,by=ny+dy;if(wall(bx,by)||b.some(([x,y])=>x===bx&&y===by))continue;b[bi]=[bx,by];}
   const ns={p:[nx,ny],b};const k=key(ns);if(seen.has(k))continue;seen.add(k);q.push([ns,path.concat([[dx,dy]])]);}}
 return null;}
const path=solve(L0,G0);console.log('level0 solution length',path.length);
const ctxStub=new Proxy({},{get:(t,k)=>k in t?t[k]:(k==='measureText'?()=>({width:10}):(k==='createLinearGradient'||k==='createRadialGradient')?()=>({addColorStop(){}}):()=>{}),set:(t,k,v)=>{t[k]=v;return true;}});const h=harness({canvasContext:ctxStub});vm.runInContext('Math.random=()=>0.5',h.sandbox);
const game=h.api.games.find(g=>g.id==='push-puzzle');const scores=[];
h.api.startMinigame({id:game.id,start(c,done){game.start(c,s=>{scores.push(s);done(s);});}});
const area=h.get('minigameOverlay');const canvas=area.querySelector('#pzCanvas');const undo=area.querySelector('#pzUndo');
h.advance(50);
function sw(dx,dy){h.dispatch(canvas,'pointerdown',{pointerId:1,clientX:100,clientY:100});h.dispatch(canvas,'pointerup',{pointerId:1,clientX:100+dx*40,clientY:100+dy*40});h.advance(130);}
for(const [dx,dy] of path)sw(dx,dy);
console.log('after solve level header:',area.querySelector('#pzLevel').textContent);
const last=path[path.length-1];
for(let i=0;i<2;i++){h.dispatch(undo,'pointerdown',{pointerId:2});h.advance(20);sw(last[0],last[1]);}
h.advance(3000);
console.log('header after waits:',area.querySelector('#pzLevel').textContent,'scores',JSON.stringify(scores));
