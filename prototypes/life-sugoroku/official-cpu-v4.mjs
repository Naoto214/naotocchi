export function rng(seed) { let a=seed>>>0; return ()=>{a=(a+0x6d2b79f5)>>>0;let t=Math.imul(a^a>>>15,1|a);t^=t+Math.imul(t^t>>>7,61|t);return ((t^t>>>14)>>>0)/4294967296;}; }
// Row chasing enumerates all first rows and chooses a minimum legal solution.
export function solveLights(board) {
 let best=null;
 for(let mask=0;mask<32;mask++) { const b=board.map(Boolean), p=[];
 const press=(i)=>{p.push(i);const x=i%5,y=i/5|0;for(const [dx,dy] of [[0,0],[1,0],[-1,0],[0,1],[0,-1]]){const X=x+dx,Y=y+dy;if(X>=0&&X<5&&Y>=0&&Y<5)b[Y*5+X]=!b[Y*5+X];}};
 for(let x=0;x<5;x++)if(mask>>x&1)press(x);
 for(let y=1;y<5;y++)for(let x=0;x<5;x++)if(b[(y-1)*5+x])press(y*5+x);
 if(!b.some(Boolean)&&(!best||p.length<best.length))best=p;
 } return best||[];
}
export function createCpu(seed,difficulty='normal',gameId='') {
 const random=rng((seed>>>0)^0x91e10da5), easy=difficulty==='easy'; let next=18,held=false,lastGame=null,nextLights=null,missTrial=false,reactAt=0;
 const legacyQuick=['eat','dodge','clean','charge','jump','button','coins','flee','slice','defend'];
 return ({frame,current,board,gauges=[],send})=>{
 const emit=(type,x,y)=>send({type,x,y});
 const tap=(x,y)=>{emit('pointerdown',x,y);emit('pointerup',x,y);};
 if(gauges.length){
  if(frame<next)return;next=frame+(easy?70:55)+Math.floor(random()*30);
  const visible=gauges.filter(g=>g.cursor>=g.lo&&g.cursor<=g.hi);
  if(visible.length&&random()>=(easy?.25:.08)){const g=visible[0];tap(g.x,g.y);}return;
 }
 // Lights thinking is independent of quick-game reaction cadence.
 if(board?.length===25){
 const delay=()=> (easy?180:120)+Math.floor(random()*(easy?121:91));
 if(nextLights===null){nextLights=frame+delay();return;}
 if(frame<nextLights)return;nextLights=frame+delay();
 const p=solveLights(board);if(p.length){const i=random()<(easy?.15:.035)?Math.floor(random()*25):p[0];tap(14+(i%5+.5)*58.4,14+((i/5|0)+.5)*58.4);}return;
 }
 if(frame<next)return; next=frame+(easy?14:6)+Math.floor(random()*(easy?12:6));
 if(!current)return;if(current.game!==lastGame){held=false;lastGame=current.game;if(gameId&&!legacyQuick.includes(gameId)){missTrial=random()<(easy?.3:.1);reactAt=frame+(easy?40:18)+Math.floor(random()*(easy?35:18));}}
 if(missTrial||frame<reactAt)return;
 const t=current.game.target?.();if(!t||t.ready===false)return;
 if(random()<(easy?.18:.025))return;
 const x=t.x??160,y=t.y??150;
 if(t.kind==='hold'){if(!held){emit('pointerdown',x,y);held=true;}else if(t.release){emit('pointerup',x,y);held=false;}return;}
 if(t.kind==='follow'){emit('pointerdown',x,y);emit('pointermove',x,y);emit('pointerup',x,y);return;}
 if(t.kind==='drag'){emit('pointerdown',x,y);const to=t.to||{x:x+65,y};for(let i=1;i<=6;i++)emit('pointermove',x+(to.x-x)*i/6,y+(to.y-y)*i/6);emit('pointerup',to.x,to.y);return;}
 if(t.kind==='swipe'){const [dx,dy]=({left:[-80,0],right:[80,0],up:[0,-80],down:[0,80]})[t.dir];emit('pointerdown',160,150);emit('pointermove',160+dx,150+dy);emit('pointerup',160+dx,150+dy);return;}
 if(t.kind==='tap')tap(x,y);
 };
}
