// This probe is inserted beside the geometry readers in an isolated model.
// Old safe rays are kept per resident. Check the affected peer only for each
// untouched seat; perform the complete native sweep for the seat that moved.
function screenSeats({feet,stages,radii:steps,angles,restricted}) {
  const residents=roster(feet);
  const before=stages.map(s=>rays({feet,sectors:s.sectors,distances:s.distances}));
  const unit=stages.map(s=>Array.from({length:s.sectors},(_,i)=>{
    const t=i*2*Math.PI/s.sectors;
    return [Math.cos(t)/scale.x,Math.sin(t)/scale.y];
  }));
  const oldPaths=stages.map((stage,level)=>residents.flatMap((a,slot)=>
    stage.distances.flatMap((d,index)=>before[level][slot].result[index].safe.map(i=>{
      const dx=unit[level][i][0]*d,dy=unit[level][i][1]*d,f=Math.min(1,.35/Math.hypot(dx,dy));
      return {a,slot,d,bearing:i,target:{x:a.x+dx,y:a.y+dy},first:{x:a.x+dx*f,y:a.y+dy*f}};
    }))));
  const counts={tested:0,invalid:0,newOrWorseContact:0,otherExitLost:0,ownExitLost:0,
    preservedButNoNewWalker:0,survived:0};
  const survivors=[],firstLost=[];
  for(let slot=0;slot<residents.length;slot++){
    const a=residents[slot], others=residents.filter(b=>b!==a);
    const candidates=restricted?restricted.filter(s=>s.key===a.key):steps.flatMap(d=>Array.from({length:angles},(_,i)=>{
      const t=i*2*Math.PI/angles;return {dx:d*Math.cos(t),dy:d*Math.sin(t)};
    }));
    for(const {dx,dy} of candidates) {
      counts.tested++;
      const q={...a,x:a.x+dx/scale.x,y:a.y+dy/scale.y};
      if(!inBox(q,a.box)||!nav.valid(q)||!a.ink(q)){counts.invalid++;continue;}
      const worsens=others.some(b=>clearance(q,q,b)+1e-9<Math.min(1,clearance(a,a,b)));
      if(worsens){counts.newOrWorseContact++;continue;}
      let lost=null;
      for(let level=0;level<stages.length&&!lost;level++){
        for(const p of oldPaths[level]){
          if(p.slot===slot){
            const target={x:p.target.x+q.x-a.x,y:p.target.y+q.y-a.y};
            const hit=decide(q,target,others);
            if(!hit || hit.length)lost={reason:'ownExitLost',who:a.key,d:p.d,bearing:p.bearing,sectors:stages[level].sectors};
          }else{
            const b=p.a;
            const [rx,ry]=radii(b,q),prior=clearance(b,b,q),first=clearance(b,p.first,q);
            if(!contactSegmentSafe(b,p.target,q,rx,ry) || prior<1 && first<1 && first<=prior+1e-6)
              lost={reason:'otherExitLost',who:b.key,d:p.d,bearing:p.bearing,sectors:stages[level].sectors};
          }
          if(lost)break;
        }
      }
      if(lost){
        counts[lost.reason]++;
        if(restricted)firstLost.push({key:a.key,dx,dy,...lost});
        continue;
      }
      const updated=feet.map((r,index)=>index===slot?[a.key,q.x,q.y,q.w,q.h]:r);
      const s=stages[0],index8=s.distances.indexOf(8);
      const after=rays({feet:updated,sectors:s.sectors,distances:[8]});
      const opened=after.filter((r,index)=>r.result[0].safe.length&&!before[0][index].result[index8].safe.length).map(r=>r.key);
      if(!opened.length){counts.preservedButNoNewWalker++;continue;}
      counts.survived++;
      survivors.push({key:a.key,dx,dy,opened});
    }
  }
  return {counts,survivors,firstLost};
}
