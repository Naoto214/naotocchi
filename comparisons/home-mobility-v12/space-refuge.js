// Minimum sampled displacement to an endpoint that would clear one named ray.
// Tests the endpoint in situ; it may be unreachable by a helper walking there.
function refuge({feet,key,spacing=.5}){
  const all=roster(feet),owner=all.find(a=>a.key===key);
  const degrees=key==='companion:tanuki'?180:288.75,angle=degrees*Math.PI/180;
  const goal={...owner,x:owner.x+8*Math.cos(angle)/scale.x,y:owner.y+8*Math.sin(angle)/scale.y};
  const hit=decide(owner,goal,all.filter(a=>a!==owner));
  if(hit?.length!==1)throw Error('The archived pose no longer has one direct blocker');
  const helper=hit[0],peers=all.filter(a=>a!==helper);
  const thresholds=[0,1,2,3,4,8,16,24,32,48,80,160,Infinity];
  const classes=['floorAndInk','clearsOwnerRay','noNewOrWorseContact','atMostOneOtherMustMove'];
  const stats=Object.fromEntries(classes.map(c=>[c,{nodes:0,minCss:null,foot:null,byRadius:new Array(thresholds.length).fill(0)}]));
  const detailed=new Map();
  const before=peers.map(b=>Math.min(1,clearance(helper,helper,b)));
  const account=(c,p,dist)=>{
    const item=stats[c];item.nodes++;
    if(item.minCss===null||item.minCss>dist){item.minCss=dist;item.foot=[p.x,p.y];}
    item.byRadius[thresholds.findIndex(v=>dist<=v+1e-6)]++;
  };
  const h=helper.box;
  for(let ix=Math.ceil((h.left-helper.x)*scale.x/spacing);ix<=Math.floor((h.right-helper.x)*scale.x/spacing);ix++){
    for(let iy=Math.ceil((h.top-helper.y)*scale.y/spacing);iy<=Math.floor((h.bottom-helper.y)*scale.y/spacing);iy++){
      const p={...helper,x:helper.x+ix*spacing/scale.x,y:helper.y+iy*spacing/scale.y};
      if(!nav.valid(p)||!helper.ink(p))continue;
      const dist=Math.hypot(ix*spacing,iy*spacing);account('floorAndInk',p,dist);
      if(decide(owner,goal,[p])?.length!==0)continue;
      account('clearsOwnerRay',p,dist);
      const affected=peers.filter((other,k)=>clearance(helper,p,other)+1e-6<before[k]);
      if(affected.length===0)account('noNewOrWorseContact',p,dist);
      if(affected.length===0||affected.length===1&&affected[0]!==owner) {
        account('atMostOneOtherMustMove',p,dist);
        const shape=affected.map(o=>o.key).join('-')||'none';
        let group=detailed.get(shape);
        if(!group){group={nodes:0,minCss:Infinity,foot:null};detailed.set(shape,group);}
        group.nodes++;
        if(dist<group.minCss){group.minCss=dist;group.foot=[p.x,p.y];}
      }
    }
  }
  return {key,helper:helper.key,degrees,spacing,stats,origin:[helper.x,helper.y],radiusUpper:thresholds.map(x=>Number.isFinite(x)?x:null),
    sampledHoldingPlaces:Object.fromEntries(detailed)};
}
return {refuge};
