// Lower bounds only. Enumerate individual legal helper strokes, without moving a third resident.
function reliefCertificate({feet,key}) {
  const list=roster(feet), owner=list.find(a=>a.key===key),slots=new Map(list.map((a,i)=>[a.key,i]));
  const bit=a=>1 << slots.get(a.key);
  const ownerBit=bit(owner), cache=new Map();
  const displacements=[1,3,6,8,12,16,24];
  const nbits=n=>{let sum=0;while(n){n&=n-1;sum++;}return sum;};
  const members=m=>list.filter(a=>m & bit(a)).map(a=>a.key);
  function leg(a,angle,r){
    const dx=r*Math.cos(angle)/scale.x,dy=r*Math.sin(angle)/scale.y,f=Math.min(1,.35/Math.hypot(dx,dy));
    return {a,q:{...a,x:a.x+dx,y:a.y+dy},first:{x:a.x+f*dx,y:a.y+f*dy}};
  }
  function touches(path,b){
    const {a,q,first}=path,[rx,ry]=radii(a,b),prior=clearance(a,a,b),initial=clearance(a,first,b);
    return !contactSegmentSafe(a,q,b,rx,ry)||(prior<1 && initial<1 && initial<=prior+1e-6);
  }
  function strokes(helper) {
    if(cache.has(helper.key))return cache.get(helper.key);
    const out=[];
    for(const r of displacements)for(let i=0;i<48;i++){
      const path=leg(helper,i*Math.PI/24,r),blockers=decide(helper,path.q,list.filter(b=>b!==helper));
      if(blockers===null)continue;
      const obstruction=blockers.reduce((mask,b)=>mask|bit(b),0);
      out.push({q:path.q,obstruction});
    }
    cache.set(helper.key,out);return out;
  }
  const counts={offGround:0,independent:0,directThreeOrMore:0,indirectThreeOrMore:0,
    noClearingStrokeEvenBeforePeerCooperation:0,lowerBoundOneOrTwo:0};
  const directions=[];
  for(let i=0;i<96;i++){
    const ray=leg(owner,i*Math.PI/48,8), direct=decide(owner,ray.q,list.filter(a=>a!==owner));
    if(direct===null){counts.offGround++;continue;}
    const row={degrees:i*3.75,direct:direct.map(a=>a.key)};
    directions.push(row);
    if(!direct.length){counts.independent++;row.minimumDistinct=0;continue;}
    const original=direct.reduce((m,a)=>m|bit(a),0);
    if(direct.length>=3){counts.directThreeOrMore++;row.minimumDistinct=direct.length;row.basis="direct";continue;}
    const masks=[];row.helpers=[];
    for(const helper of direct) {
      let clearGround=0,avoidsOwner=0,independentlyFree=0;
      const sets=new Set(),needed=new Map();
      for(const s of strokes(helper)){
        if(touches(ray,s.q))continue;
        clearGround++;
        if(s.obstruction & ownerBit)continue;
        avoidsOwner++;
        if(!s.obstruction)independentlyFree++;
        sets.add(s.obstruction & ~original);
        for(const p of members(s.obstruction & ~original))needed.set(p,(needed.get(p)||0)+1);
      }
      // A superset cannot lower the distinct-body count; discard it to bound pair combinations.
      const minimal=[...sets].filter(m=>![...sets].some(n=>n!==m && (n&m)===n));
      masks.push(minimal);row.helpers.push({key:helper.key,clearGround,avoidsOwner,independentlyFree,
        externalObstructions:minimal.map(members),frequentObstacles:[...needed].sort((a,b)=>b[1]-a[1]).slice(0,3)});
    }
    if(masks.some(a=>!a.length)){counts.noClearingStrokeEvenBeforePeerCooperation++;row.minimumDistinct=null;continue;}
    const other=masks[1]??[0];
    let best=29,witness=null;
    for(const a of masks[0])for(const b of other){
      const group=original|a|b,count=nbits(group);
      if(count<best){best=count;witness=group;}
    }
    row.minimumDistinct=best;row.smallestObstructionSet=members(witness);
    if(best>=3)counts.indirectThreeOrMore++;else counts.lowerBoundOneOrTwo++;
  }
  return {key,counts,directions};
}
return {reliefCertificate};
