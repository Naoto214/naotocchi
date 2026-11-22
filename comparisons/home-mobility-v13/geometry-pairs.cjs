'use strict';

// Analytical adapter for the V11 endpoint compiler. The native compiler checks
// individual ink/bounds, continuous pair clearance and all old safe directions.
function grassPairProbe(source) {
  const a=source.indexOf('    const shifts=lengths.flatMap');
  const b=source.indexOf('    for(const group of bestByOpened.values())',a);
  if(a<0||b<=a)throw Error('V11 pair enumerator anchor changed');
  return source.slice(0,a)+`    const {baySites,target,nearDistance,localRadii,localAngles}=headings;
    // Least one endpoint lies on terrain newly added by C. The other is a short
    // local adjustment of a potential blocker or of the resident it releases.
    const focus=new Set(target);
    const compact=new Map();
    for(const key of target){
      const i=bySlot.get(key);
      for(const {obstacles} of streams[i].goals)for(const k of obstacles)focus.add(base[k].key);
    }
    const locals=localRadii.flatMap(d=>Array.from({length:localAngles},(_,n)=>{
      const a=n*2*Math.PI/localAngles;return [d*Math.cos(a),d*Math.sin(a)];
    }));
    const choices=base.map((actor,i)=>{
      if(actor.kind!=='companion')return {bay:[],small:[],rawBay:0,rawSmall:0};
      const moves=baySites.map(q=>[(q.x-actor.x)*scale.x,(q.y-actor.y)*scale.y])
        .filter(([dx,dy])=>Math.hypot(dx,dy)<=nearDistance);
      return {bay:moves.map(([x,y])=>endpoint(i,x,y)).filter(Boolean),
        small:locals.map(([x,y])=>endpoint(i,x,y)).filter(Boolean),
        rawBay:moves.length,rawSmall:locals.length};
    });
    let newPairCount=0;
    for(let i=0;i<base.length;i++)for(let j=0;j<base.length;j++){
      if(i===j||!focus.has(base[i].key)&&!focus.has(base[j].key))continue;
      const a=choices[i],b=choices[j];
      counts.pairsConsidered+=a.rawBay*b.rawSmall;
      const aa=a.bay.filter(p=>p.required===null||p.required===j);
      const bb=b.small.filter(p=>p.required===null||p.required===i);
      for(const first of aa)for(const second of bb)check(first,second);
      if(i>=j)continue;
      newPairCount+=a.rawBay*b.rawBay;
      for(const first of aa)for(const second of b.bay)if(second.required===null||second.required===i)check(first,second);
    }
    counts.pairsConsidered+=newPairCount;
    counts.bothEndpointsInC=newPairCount;
    counts.focus=[...focus];
`+source.slice(b);
}
module.exports={grassPairProbe};
