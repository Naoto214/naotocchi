// A fresh ordinary walk reached the original planner's final refusal. Test a
// small fan of straight walking segments, using the original contact ellipses,
// actor bounds, visibility and continuous terrain checks.
function refusedForwardRay(a,goal,box,see) {
  const nav=scene.navigation,s=nav?.intentScale;
  if(!nav?.intentAware||!s)return null;
  const dx=(goal.x-a.x)*s.x,dy=(goal.y-a.y)*s.y;
  const requested=Math.hypot(dx,dy);
  if(requested<16)return null;
  const heading=Math.atan2(dy,dx);
  const radius=Math.min(requested,40);
  const nearby=actors.filter(b=>b!==a && Math.abs(b.x-a.x)<=(a.w+b.w)*.5+10+radius/s.x
                                    && Math.abs(b.y-a.y)<=(a.h+b.h)*.38+10+radius/s.y);
  let terrainChecks=0;
  function endpoint(angle,r){
    const x=a.x+r*Math.cos(angle)/s.x,y=a.y+r*Math.sin(angle)/s.y;
    if(x<box.left||x>box.right||y<box.top||y>box.bottom||
       requested-Math.hypot((goal.x-x)*s.x,(goal.y-y)*s.y)<=.75)return null;
    const q={x,y};
    for(const b of nearby){
      if(!separated(a,q,b)||!contactSegmentSafe(a,q,b,(a.w+b.w)*.5+10,(a.h+b.h)*.38+10))return null;
    }
    if(terrainChecks>=8)return null;
    terrainChecks++;
    return nav.valid(q)&&nav.segmentSafe(a,q,see)?q:null;
  }
  // Lead toward the requested goal. An endpoint is always at least 16 CSS px
  // from the original foot, even when a longer segment is obstructed.
  for(let i=0;i<17 && terrainChecks<8;i++){
    const degrees=i===0?0:Math.ceil(i/2)*(i%2?10:-10);
    const angle=heading+degrees*Math.PI/180;
    const q=endpoint(angle,16);
    if(q)return [radius>16 && endpoint(angle,radius) || q];
  }
  return null;
}
module.exports={refusedForwardRay};
