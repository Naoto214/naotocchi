// Inserted only in the local, recorded geometry experiment. These functions
// share the native model's bounds, contacts, projection and visibility checks.
function geometryExitAudit(sc, household) {
  const nav=sc.navigation,scale=nav.intentScale, visible=(a,p)=>!sc.visible||sc.visible(p,a);
  const masks={},invalid=[],contacts=[],routeChecks=[];
  const within=(p,b)=>p.x>=b.left-1e-7&&p.x<=b.right+1e-7&&p.y>=b.top-1e-7&&p.y<=b.bottom+1e-7;
  function safeSegment(a,from,to,box) {
    return within(to,box)&&nav.segmentSafe(from,to,p=>visible(a,p))&&household.every(peer=>peer===a||
      contactSegmentSafe(from,to,peer,(a.w+peer.w)*.5+10,(a.h+peer.h)*.38+10));
  }
  for(const a of household) {
    const b=bounds(a,sc),mask=[];
    if(!nav.valid(a)||!visible(a,a)||!within(a,b))invalid.push(a.key);
    for(const peer of household)if(a.key<peer.key&&!separated(a,a,peer))contacts.push([a.key,peer.key]);
    for(const length of [3,8,16])for(let i=0;i<48;i++){
      const angle=Math.PI*i/24;
      const to={x:a.x+length*Math.cos(angle)/scale.x,y:a.y+length*Math.sin(angle)/scale.y};
      mask.push(safeSegment(a,a,to,b));
    }
    masks[a.key]=mask;
    if(a.target) {
      let from=a,ok=true;const points=[a.target,...a.route];
      for(const to of points) {
        ok=ok&&safeSegment(a,from,to,b);from=to;
      }
      routeChecks.push({key:a.key,segments:points.length,safe:ok});
    }
  }
  const lead=household.find(a=>a.kind==='pet'),long=[],otherLong=[];
  if(lead){
    const length=Math.max(40,lead.w*1.2);
    for(let i=0;i<96;i++){
      const angle=i*Math.PI/48;
      const end=limit(lead,{x:lead.x+length*Math.cos(angle),y:lead.y+length*Math.sin(angle)},sc);
      if(Math.hypot(end.x-lead.x,end.y-lead.y)<length*.8||!nav.segmentSafe(lead,end,p=>visible(lead,p)))continue;
      let free=true;
      for(let j=0,n=Math.ceil(length/3);j<=n&&free;j++){
        const p={x:lead.x+(end.x-lead.x)*j/n,y:lead.y+(end.y-lead.y)*j/n};
        free=household.every(a=>a===lead||separated(lead,p,a));
      }
      if(free){
        if(i%12===0)long.push(i/12);
        if(household.every(a=>a===lead||contactSegmentSafe(lead,end,a,(lead.w+a.w)*.5+10,(lead.h+a.h)*.38+10)))
          otherLong.push(i*3.75);
      }
    }
  }
  return {masks,invalid,contacts,routeChecks,long,otherLong};
}

function compareGeometrySync(before,after,oldScene,newScene,oldKey,newKey,clock) {
  if(!oldScene.navigation?.intentScale||!newScene.navigation?.intentScale||before.length!==after.length)return null;
  const old=geometryExitAudit(oldScene,before),held=geometryExitAudit(newScene,before),native=geometryExitAudit(newScene,after);
  const lost=(u,v)=>Object.keys(u.masks).reduce((count,key)=>count+u.masks[key].filter((x,i)=>x&&!v.masks[key][i]).length,0);
  const count=g=>Object.values(g.masks).reduce((total,mask)=>total+mask.filter(Boolean).length,0);
  const points=before.map(a=>{
    const same=after.find(x=>x.key===a.key),floor=oldScene.navigation.unproject(a),projected=newScene.navigation.project(floor);
    const sc=newScene.navigation.intentScale;
    return {key:a.key,before:[a.x,a.y],native:[same.x,same.y],previousTarget:a.target||null,
      projectedError:Math.hypot(projected.x-a.x,projected.y-a.y),
      sizeEqual:a.w===same.w&&a.h===same.h&&['left','right','top','bottom'].every(k=>a.extent?.[k]===same.extent?.[k]),
      nativeShift:Math.hypot((same.x-a.x)*sc.x,(same.y-a.y)*sc.y)};
  });
  const exactConstructor=!!oldKey&&oldKey.key===newKey?.key;
  const exactKey=!!oldKey&&oldKey.effective===newKey?.effective;
  const movable=points.every(p=>p.sizeEqual&&p.projectedError<1e-7)
    &&!held.invalid.length&&!lost(old,held)&&held.routeChecks.every(r=>r.safe)
    &&JSON.stringify(old.contacts)===JSON.stringify(held.contacts);
  const newLong=native.long.filter(r=>!held.long.includes(r));
  const reason=!exactKey?'geometry-key-changed':!movable?'feet-routes-or-exits-fail':
    newLong.length?'native-opens-reserved-exit':'equivalent-ground-and-routes';
  const summarize=g=>({availableSamples:count(g),invalid:g.invalid,contacts:g.contacts,routes:g.routeChecks,nativeLongDirections:g.long,strictLongBearings96:g.otherLong});
  return {clock,reason,strictCanKeep:reason==='equivalent-ground-and-routes',equivalentAndRetainsExisting:exactKey&&movable,
    exactConstructor,exactEffectiveGeometry:exactKey,oldKey:oldKey?.key,newKey:newKey?.key,
    oldEffective:oldKey?.effective,newEffective:newKey?.effective,points,old:summarize(old),held:summarize(held),native:summarize(native),
    oldExitsLostByHolding:lost(old,held),oldExitsLostByReseating:lost(old,native),nativeReservedExitsGained:newLong};
}
