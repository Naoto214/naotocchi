async ([seed,steps]) => {
  const [actors,scene]=finishPerf.scene;
  const saved=()=>JSON.stringify(Object.keys(localStorage).sort().map(k=>[k,localStorage.getItem(k)]));
  const beforeSave=saved(),events=[],replay=[],contacts=[],commands=[],inputMs=[];
  let state=seed,calls=0,yields=0,tick=0;
  const random=()=>{calls++;state=(Math.imul(1664525,state)+1013904223)>>>0;return state/4294967296;};
  const model=NaotocchiHomeDioramaModel.createModel({random,onEvent:e=>events.push([tick,e])});
  model.sync(actors,scene);let previous=model.snapshot();
  const start=performance.now();
  for(tick=0;tick<steps;tick++){
    const held=tick>=120&&tick<135?previous[0].key:null;
    if(tick===38||tick===138){
      const a=previous[tick===38?0:previous.length-1],b=model.bounds(a);
      const at=performance.now();
      commands.push([tick,model.select(a.key),model.move(a.key,{x:tick===38?b.right:b.left,y:(b.top+b.bottom)/2},'tap')]);
      inputMs.push(performance.now()-at);
    }
    model.step(.1,{blocked:tick===90,reducedMotion:tick>=228&&tick<232,heldActor:held});
    const snapshot=model.snapshot();let touching=0;
    for(let i=0;i<snapshot.length;i++){
      const a=snapshot[i];if(previous[i].target&&!a.target&&a.activity==='look')yields++;
      for(let j=0;j<i;j++){
        const b=snapshot[j];if(Math.hypot((a.x-b.x)/((a.w+b.w)*.5+10),(a.y-b.y)/((a.h+b.h)*.38+10))<1)touching++;
      }
    }
    // V5 adds a boolean to distinguish a real pointer drop. This replay has
    // only taps. Assert it stays inactive, then compare every pre-existing field.
    for(const actor of snapshot){
      if(actor.pointerDrop!==undefined && actor.pointerDrop!==false)throw Error('Unexpected drop in tap replay');
      delete actor.pointerDrop;
    }
    replay.push([snapshot,model.metrics(),model.selected(),calls]);contacts.push(touching);previous=snapshot;
  }
  const elapsedMs=performance.now()-start;
  const hash=async v=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(v)))),b=>b.toString(16).padStart(2,'0')).join('');
  return {digest:await hash([replay,events,commands,contacts]),contactDigest:await hash(contacts),eventDigest:await hash(events),metrics:model.metrics(),elapsedMs,rngCalls:calls,commands,inputMs,yields,maxOverlappingPairs:Math.max(...contacts),saveStable:beforeSave===saved(),storageKeys:Object.keys(localStorage).length,events:events.reduce((n,[,e])=>(n[e.type]=(n[e.type]||0)+1,n),{})};
}
