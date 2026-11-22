// Evaluate all 28 actual footprints at the start, every helper waypoint and the
// final owner foot. Cache identical arrangements shared by the different rays.
function witnessFairness({feet,recording}) {
  const cache=new Map(),all=[],reference=rays({feet,sectors:96,distances:[3,8,16]});
  const original=reference.map(r=>r.result.map(stage=>stage.safe));
  function inspect(next) {
    const hash=JSON.stringify(next.map(f=>f.slice(1,3)));
    if(cache.has(hash))return cache.get(hash);
    const r=rays({feet:next,sectors:96,distances:[3,8,16]});
    const masks=r.map(p=>p.result.map(s=>s.safe));
    cache.set(hash,masks);return masks;
  }
  function classify(at,base){
    return feet.map(([key],i)=>({key,counts:at[i].map(d=>d.length),
      closed:at[i].map((v,j)=>base[i][j].length>0&&v.length===0),
      opened:at[i].map((v,j)=>base[i][j].length===0&&v.length>0),
      originalLost:at[i].map((v,j)=>base[i][j].filter(b=>!v.includes(b)).length)}));
  }
  for(const r of recording.routes) {
    const next=feet.map(f=>f.slice()),stages=[];
    let previous=original;
    for(const hop of r.steps){
      const f=next.find(x=>x[0]===hop.who);
      for(const [x,y] of hop.ends) {
        f[1]=x;f[2]=y;
        const masks=inspect(next),relative=classify(masks,original),last=classify(masks,previous);
        stages.push({who:hop.who,to:[x,y],relativeToOpening:relative,relativeToPrevious:last.filter(p=>p.closed.some(Boolean)||p.opened.some(Boolean))});
        previous=masks;
      }
    }
    const helperIds=r.steps.slice(0,-1).map(s=>s.who),end=stages.at(-1).relativeToOpening,owner=r.steps.at(-1).who;
    all.push({degrees:r.degrees,helperIds,stages,finalLost8:end.filter(p=>p.closed[1]).map(p=>p.key),
      finalGained8:end.filter(p=>p.opened[1]).map(p=>p.key),
      bystanderEverLost8:[...new Set(stages.flatMap(s=>s.relativeToOpening.filter(p=>p.key!==owner&&!helperIds.includes(p.key)&&p.closed[1]).map(p=>p.key)))],
      helpersEverLost8:[...new Set(stages.flatMap(s=>s.relativeToOpening.filter(p=>helperIds.includes(p.key)&&p.closed[1]).map(p=>p.key)))]
    });
  }
  return {stats:{routes:all.length,uniqueArrangements:cache.size,
    bystanderEverLoses8:all.filter(r=>r.bystanderEverLost8.length).length,
    helperEverLoses8:all.filter(r=>r.helpersEverLost8.length).length,
    finalAnyoneLoses8:all.filter(r=>r.finalLost8.length).length},
    opening:classify(original,original),routes:all};
}
return {witnessFairness};
