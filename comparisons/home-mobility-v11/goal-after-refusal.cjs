'use strict';
const {replaceExact}=require('../home-finish-v5/native-hooks.cjs');

// Evaluated as an independent comparison. Only a freshly sampled wander goal
// that failed every native movement and escape branch can reach this function.
const fallback=`    function afterRefusedWander(a,goal,box,see) {
      const nav=scene.navigation, scale=nav?.intentScale;
      if(!nav?.intentAware || !scale) return null;
      const distance=(u,v)=>Math.hypot((u.x-v.x)*scale.x,(u.y-v.y)*scale.y);
      const requested=distance(a,goal);
      if(requested<16)return null;
      const furthest=Math.min(requested,64);
      const neighbors=actors.filter(b=>b!==a).map(b=>({
        foot:b,rx:(a.w+b.w)*.5+10,ry:(a.h+b.h)*.38+10
      })).filter(n=>Math.abs(n.foot.x-a.x)<=n.rx+(furthest+9)/scale.x
            && Math.abs(n.foot.y-a.y)<=n.ry+(furthest+9)/scale.y);
      const inside=q=>q.x>=box.left&&q.x<=box.right&&q.y>=box.top&&q.y<=box.bottom;
      const clear=(from,to)=>inside(to)&&neighbors.every(n=>
        contactSegmentSafe(from,to,n.foot,n.rx,n.ry));
      const point=(from,angle,length)=>({x:from.x+Math.cos(angle)*length/scale.x,y:from.y+Math.sin(angle)*length/scale.y});
      const heading=from=>Math.atan2((goal.y-from.y)*scale.y,(goal.x-from.x)*scale.x);
      const base=heading(a);
      const turns=[base];
      for(let i=0;i<12;i++){
        const delta=(i+.5)*Math.PI/12;
        turns.push(base+delta,base-delta);
      }
      const radii=[...new Set([furthest,Math.min(furthest,40),Math.min(furthest,24),16])];
      let terrainChecks=0;
      const budget=24;
      const ground=(from,to)=>terrainChecks<budget && (++terrainChecks,nav.segmentSafe(from,to,see));
      function destination(from,angle,r,bend){
        const end=point(from,angle,r),net=distance(a,end);
        if(net<16-1e-7 || requested-distance(end,goal)<=.75 || bend+r>net*1.5 || !clear(from,end))return null;
        if(!neighbors.every(n=>separated(a,end,n.foot)) || !nav.valid(end) || !ground(from,end))return null;
        return end;
      }
      const pivots=[];
      for(const angle of turns){
        const first=point(a,angle,3);
        if(!clear(a,first))continue;
        for(const radius of radii){
          const end=destination(a,angle,radius,0);
          if(end)return [end];
        }
        if(pivots.length<4 && (!pivots.length || pivots.every(p=>distance(p,first)>1.5))
            && ground(a,first))pivots.push(first);
      }
      for(const p of pivots){
        const aim=heading(p);
        for(const turn of [0,1,-1,2,-2,3,-3,4,-4,5,-5]){
          const angle=aim+turn*Math.PI/12;
          for(const radius of radii){
            const end=destination(p,angle,radius,3);
            if(end)return [p,end];
          }
        }
      }
      return null;
    }
`;
function patchAfterRefusal(source,{shadow=false,policy='ray'}={}){
  if(!['ray','pivot'].includes(policy))throw Error('Unknown post-refusal comparison');
  const strategy=policy==='ray'?'refusedForwardRay':'afterRefusedWander';
  const helper=policy==='ray'?'    '+require('./goal-refusal-ray.cjs').refusedForwardRay.toString()+'\n':fallback;
  let s=replaceExact(source,'    function idle(a){',helper+'    const freshWander=new WeakSet();\n    function idle(a){');
  const original='if(Math.abs(p.x-a.x)<35)p.x=a.x<scene.width/2?b.right:b.left;}';
  s=replaceExact(s,original,original.slice(0,-1)+'freshWander.add(p);}');
  const permitted='      if(!path.length||(!escape&&!drag&&Math.hypot(q.x-a.x,q.y-a.y)<3)){';
  s=replaceExact(s,permitted,`      if(source==='ambient' && freshWander.has(p) && (!path.length||(!escape&&!drag&&Math.hypot(q.x-a.x,q.y-a.y)<3))){
        const checked=${strategy}(a,p,safeBounds,canSee);
        globalThis.HomeRefusedWanderAudit?.(a,p,checked,clock,scene.navigation?.intentScale);
        ${shadow?'':'if(checked){path=checked;q=path.at(-1);intentRoute=true;escape=false;}'}
      }
`+permitted);
  return s;
}
module.exports={patchAfterRefusal};
