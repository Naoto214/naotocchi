// Each policy consumes only visible drawing observations and emits ordinary
// pointer events. Memory and reaction randomness are separate from game RNG.
export function createNormalCpuV6(gameId,difficulty,random){
 const easy=difficulty==='easy',clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
 let next=35,trace=null,traceIndex=0,traceOffset=0,held=false,lastHead='';
 const memory=new Map();
 const text=(o)=>o.filter(i=>i.kind==='text'&&!i.clipped);
 const arc=(o,color,r)=>o.flatMap(i=>i.kind==='fill'&&i.fill===color?i.path.filter(p=>p.kind==='arc'&&Math.abs(p.r-r)<.01):[]);
 return ({frame,visible=[],send})=>{
  const emit=(type,x,y)=>send({type,x,y});
  const tap=(x,y)=>{emit('pointerdown',x,y);emit('pointerup',x,y);};
  const drag=(a,b)=>{emit('pointerdown',a.x,a.y);emit('pointermove',b.x,b.y);emit('pointerup',b.x,b.y);};
  if(frame<next)return;
  next=frame+(easy?16:8);
  if(gameId.startsWith('stack-')){
   const crane=visible.find(i=>i.kind==='stroke'&&i.stroke==='#555555'&&i.path.length===2);
   const guide=visible.find(i=>i.kind==='stroke'&&i.stroke==='rgba(255,255,255,.35)'&&i.path.length===4);
   if(!crane||!guide)return;
   const cx=crane.path[0].x,target=(guide.path[0].x+guide.path[2].x)/2;
   if(Math.abs(cx-target)<(easy?19:10)&&random()>(easy?.2:.08)){
    tap(160,180);next=frame+(easy?160:125)+Math.floor(random()*70);
   }
  }else if(gameId==='fruit-slice'){
   next=frame+(easy?90:55)+Math.floor(random()*30);
   const objs=text(visible).filter(i=>i.font==='36px sans-serif'&&i.alpha===1&&i.x>20&&i.x<300&&i.y>20&&i.y<350);
   const fruit=objs.find(i=>i.text!=='💣'&&!objs.some(b=>b.text==='💣'&&Math.hypot(i.x-b.x,i.y-b.y)<52));
   if(fruit&&random()>(easy?.3:.12))drag({x:fruit.x-8,y:fruit.y},{x:fruit.x+8,y:fruit.y});
  }else if(gameId==='sushi-belt'){
   next=frame+(easy?80:40)+Math.floor(random()*30);
   const ts=text(visible),need=ts.filter(t=>t.y===36&&t.alpha===1&&t.font==='20px sans-serif').map(t=>t.text);
   const p=ts.find(t=>need.includes(t.text)&&t.alpha===1&&t.y>90&&t.y<200&&t.x>20&&t.x<300);
   if(p&&random()>(easy?.25:.08))tap(p.x,p.y);
  }else if(gameId==='line-trace'){
   next=frame+(easy?3:2);
   if(!trace){
    const line=visible.find(i=>i.kind==='stroke'&&i.stroke==='#6b7280'&&i.path.length===161);
    if(!line)return;trace=line.path;traceIndex=0;traceOffset=(random()-.5)*(easy?18:7);
    emit('pointerdown',trace[0].x,trace[0].y);return;
   }
   traceIndex=Math.min(160,traceIndex+2);const p=trace[traceIndex];
   emit('pointermove',p.x+traceOffset+Math.sin(traceIndex*.18)*(easy?5:2),p.y+traceOffset);
   if(traceIndex===160){emit('pointerup',p.x+traceOffset,p.y+traceOffset);trace=null;next=frame+130;}
  }else if(gameId==='memory-cards'){
   next=frame+(easy?95:60)+Math.floor(random()*25);
   const cards=text(visible).filter(t=>t.x>0&&t.x<320&&t.y>0&&t.y<320&&/^(42|28)px /.test(t.font));
   const idx=t=>Math.floor(t.y/80)*4+Math.floor(t.x/80);
   const done=new Set(visible.filter(t=>t.kind==='strokeRect'&&t.stroke==='#2a9d8f').map(idx));
   const face=cards.filter(t=>t.text!=='?'&&!done.has(idx(t)));
   for(const t of cards)if(t.text!=='?'&&t.alpha===1)memory.set(idx(t),t.text);
   if(face.length>=2)return;
   const closed=cards.filter(t=>t.text==='?'&&!done.has(idx(t)));
   if(!closed.length)return;
   let chosen;
   if(face.length===1)chosen=closed.find(t=>memory.get(idx(t))===face[0].text);
   else chosen=closed.find(t=>memory.has(idx(t))&&closed.some(q=>idx(q)!==idx(t)&&memory.get(idx(q))===memory.get(idx(t))));
   if(easy&&random()<.35)chosen=null;
   chosen??=closed.find(t=>!memory.has(idx(t)))??closed[Math.floor(random()*closed.length)];
   tap(chosen.x,chosen.y);
  }else if(gameId==='air-hockey'){
   const puck=arc(visible,'#222222',9)[0];
   const mine=visible.flatMap(i=>i.kind==='fill'?i.path.filter(p=>p.kind==='arc'&&p.r===17&&p.y>232&&i.fill==='rgba(0,0,0,.25)'):[])[0];
   if(!puck||!mine)return;
   if(!held){emit('pointerdown',mine.x-2,mine.y-3);held=true;}
   const error=(random()-.5)*(easy?45:16);
   const target={x:clamp(puck.x+error,17,303),y:clamp(puck.y+(puck.y>mine.y-25?40:12),255,435)};
   emit('pointermove',target.x,target.y);
   next=frame+(easy?18:9);
  }else if(gameId==='breakout-classic'){
   const ball=arc(visible,'#ffe27a',5).sort((a,b)=>b.y-a.y)[0];
   const paddle=text(visible).find(t=>t.font==='12px sans-serif'&&t.y===374);
   if(!ball||!paddle)return;
   const error=(random()-.5)*(easy?95:30),desired=clamp(ball.x+error,32,288);
   drag({x:paddle.x,y:374},{x:paddle.x+(desired-paddle.x)/1.15,y:374});
   next=frame+(easy?20:9);
  }else if(gameId==='snake-classic'){
   // Body cells are the rounded paths drawn tail-to-head; no hidden food read.
   const cells=visible.filter(i=>i.kind==='fill'&&i.path.length>3&&i.path[0].kind==='move'&&i.path[1]?.kind==='line')
    .map(i=>i.path).filter(p=>Math.abs(Math.max(...p.map(x=>x.x))-Math.min(...p.map(x=>x.x))-(320/15-2))<.1)
    .map(p=>[Math.floor(Math.min(...p.map(x=>x.x))/(320/15)),Math.floor(Math.min(...p.map(x=>x.y))/(320/15))]);
   if(cells.length<3)return;
   const head=cells.at(-1),key=head.join(',');if(key===lastHead)return;
   const neck=cells.at(-2),dir=[head[0]-neck[0],head[1]-neck[1]];
   lastHead=key;
   // A missed reaction leaves the last legal direction intact; no state or score edits.
   if(random()<(easy?.16:.055))return;
   const food=text(visible).find(t=>t.text==='🍎'),goal=food?[Math.floor(food.x/(320/15)),Math.floor(food.y/(320/15))]:[7,7];
   const blocked=new Set(cells.slice(1).map(p=>p.join(',')));
   const directions=[[1,0],[0,1],[-1,0],[0,-1]].filter(d=>d[0]!==-dir[0]||d[1]!==-dir[1]);
   const valid=(x,y)=>x>=0&&x<15&&y>=0&&y<15&&!blocked.has(x+','+y);
   const distance=(start)=>{const q=[[...start,0]],seen=new Set([start.join(',')]);for(let at=0;at<q.length;at++){const [x,y,n]=q[at];if(x===goal[0]&&y===goal[1])return n;for(const [dx,dy]of [[1,0],[0,1],[-1,0],[0,-1]]){const X=x+dx,Y=y+dy,k=X+','+Y;if(valid(X,Y)&&!seen.has(k)){seen.add(k);q.push([X,Y,n+1]);}}}return 999;};
   const choices=directions.map(d=>({d,x:head[0]+d[0],y:head[1]+d[1]})).filter(p=>valid(p.x,p.y));
   choices.sort((a,b)=>distance([a.x,a.y])-distance([b.x,b.y]));
   if(!choices.length)return;
   const d=choices[random()<(easy?.28:.16)?Math.floor(random()*choices.length):0].d;
   drag({x:160,y:160},{x:160+40*d[0],y:160+40*d[1]});next=frame+3;
  }
 };
}
