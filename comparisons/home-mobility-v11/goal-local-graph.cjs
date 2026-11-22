'use strict';
const {replaceExact}=require('../home-finish-v5/native-hooks.cjs');

// Offline sensitivity to an extra turn or a key narrow heading that the short
// pivot comparison missed. Search only within this actor's observed floor.
function exploreAfterRefusal(a,goal,box,see) {
  const nav=scene.navigation,s=nav?.intentScale;
  if(actors.length<=15 || !nav?.intentAware || !s)return null;
  const distance=(p,q)=>Math.hypot((p.x-q.x)*s.x,(p.y-q.y)*s.y);
  const length=distance(a,goal);
  if(length<16)return null;
  const width=48,limit=600;
  const near=actors.filter(b=>b!==a).map(b=>({b,rx:(a.w+b.w)*.5+10,ry:(a.h+b.h)*.38+10}))
    .filter(n=>Math.abs(n.b.x-a.x)<=n.rx+width/s.x && Math.abs(n.b.y-a.y)<=n.ry+width/s.y);
  function legal(from,to){
    return to.x>=box.left && to.x<=box.right && to.y>=box.top && to.y<=box.bottom &&
      near.every(n=>contactSegmentSafe(from,to,n.b,n.rx,n.ry)) && nav.segmentSafe(from,to,see);
  }
  function finish(node) {
    const path=[];
    let cursor=node;
    while(cursor.parent){path.unshift(cursor.q);cursor=cursor.parent;}
    // Keep the furthest safe visible vertex, not one heading per discovery step.
    const simplified=[];
    for(let start=a; path.length;){
      let next=path.length-1;
      while(next>0 && !legal(start,path[next]))next--;
      start=path[next];simplified.push(start);path.splice(0,next+1);
    }
    return simplified;
  }
  const heading=Math.atan2((goal.y-a.y)*s.y,(goal.x-a.x)*s.x);
  const turnOrder=[0];
  for(let i=1;i<=12;i++){turnOrder.push(i);if(i<12)turnOrder.push(-i);}
  const directions=turnOrder.map(i=>[Math.cos(heading+i*Math.PI/12),Math.sin(heading+i*Math.PI/12)]);
  const seen=new Set(['0/0']);
  const queue=[{q:{x:a.x,y:a.y},travel:0,priority:0,parent:null}];
  let tested=0;
  while(queue.length && tested<limit){
    queue.sort((p,q)=>q.priority-p.priority);
    const current=queue.pop();
    for(const r of [12,5,2])for(const [dx,dy] of directions){
      const moved=current.travel+r;
      if(moved>64)continue;
      const q={x:current.q.x+r*dx/s.x,y:current.q.y+r*dy/s.y};
      const x=(q.x-a.x)*s.x,y=(q.y-a.y)*s.y,net=Math.hypot(x,y);
      if(net>width)continue;
      const cell=Math.round(x/2)+'/'+Math.round(y/2);
      if(seen.has(cell))continue;
      if(tested++>=limit)break;
      if(!legal(current.q,q))continue;
      seen.add(cell);
      const gain=length-distance(q,goal);
      const node={q,parent:current,travel:moved,priority:moved+distance(q,goal)-.6*net};
      if(net>=16 && gain>.75 && moved<=net*2 && near.every(n=>separated(a,q,n.b)))return finish(node);
      queue.push(node);
    }
  }
  return null;
}
function addResearchGraph(source){
  const start='    function afterRefusedWander(a,goal,box,see) {';
  let result=replaceExact(source,start,'    '+exploreAfterRefusal.toString()+'\n'+start);
  return replaceExact(result,'const checked=afterRefusedWander(a,p,safeBounds,canSee);','const checked=exploreAfterRefusal(a,p,safeBounds,canSee);');
}
module.exports={addResearchGraph};
