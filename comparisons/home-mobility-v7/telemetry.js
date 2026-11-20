// Owner comparison only. Native hooks call this observer after decisions and
// before committed motion. It never chooses destinations or mutates residents.
(() => {
  if(window.HomeMobilityDiagnostics)return;
  let model=null,gateReader=null,arm=null,active=false,wallStart=0,modelStart=null;
  let gateAt=0,gateList=[],gateRefresh=0,pausedWall=0,blockedModel=0,command=0,modelTime=0;
  const residents=new Map(),totals={},transitions=[],observations=[];
  const now=()=>performance.now()/1000;
  const add=(map,key,value=1)=>{map[key]=(map[key]||0)+value;};
  function row(key){
    if(!residents.has(key))residents.set(key,{key,ambientRequests:0,ambientPlans:0,ambientFailures:0,ambientStarts:0,ambientArrivals:0,
      dragRequests:0,dragPlans:0,dragFailures:0,dragStarts:0,dragArrivals:0,waits:0,retries:0,yieldsGiven:0,yieldsReceived:0,
      yieldOffers:0,yieldSuccesses:0,singleOffers:0,sequentialOffers:0,sequentialStages:0,yieldPhysicalStarts:0,yieldArrivals:0,failureEpisodes:0,recoveredEpisodes:0,
      recoveredSameSource:0,actualDistance:0,ambientDistance:0,dragDistance:0,yieldDistance:0,escapePlans:0,escapeStarts:0,escapeArrivals:0,escapeDistance:0,stationaryMax:0,
      lastMove:null,lastSource:null,nearest:null,overlaps:[],blockingPeers:{},directObstructions:{},startContactPeers:{},
      goalContactPeers:{},stepVetoes:{},waitReasons:{},choices:{},stateSeconds:{},vetoCount:0,activeSeconds:0,
      failuresAtOriginOverlap:0,failuresOffTerrain:0,failuresOutsideBounds:0,failuresAtOcclusion:0,
      failureSamples:[],recoverySamples:[],_episode:null,_dragCommand:0,_startedCommand:null,_offerCommand:null,
      _settledOffer:null,_firstHop:null,_yieldHopPending:false,_lastObservation:null});
    return residents.get(key);
  }
  function timeline(clock,type,key,more={}){
    if(observations.length<6000)observations.push({clock:relative(clock),type,key,...more});
  }
  function relative(clock){if(modelStart===null)modelStart=clock;return Math.max(0,clock-modelStart);}
  function geometry(a,b,point=a){
    const rx=(a.w+b.w)/2+10,ry=(a.h+b.h)*.38+10;
    return {key:b.key,distance:Math.hypot(point.x-b.x,point.y-b.y),clearance:Math.hypot((point.x-b.x)/rx,(point.y-b.y)/ry)};
  }
  function crossing(a,p,b){
    const rx=(a.w+b.w)/2+10,ry=(a.h+b.h)*.38+10;
    const x=(a.x-b.x)/rx,y=(a.y-b.y)/ry,dx=(p.x-a.x)/rx,dy=(p.y-a.y)/ry,dot=x*dx+y*dy;
    if(x*x+y*y<1)return dot<0;
    const t=Math.max(0,Math.min(1,-dot/(dx*dx+dy*dy||1)));
    return (x+t*dx)**2+(y+t*dy)**2<1;
  }
  function gateSample(time,list){
    const delta=Math.max(0,time-gateAt);
    if(gateList.length){pausedWall+=delta;for(const k of gateList)add(totals,k,delta);}
    gateAt=time;
    const changed=gateList.join('|')!==list.join('|');
    gateList=list;
    if(changed&&transitions.length<1700)transitions.push({wallSeconds:time-wallStart,reasons:[...list]});
  }
  const api={
    get enabled(){return active;},
    enable(){if(!active){active=true;gateAt=wallStart=now();const s=model?.();if(s)modelStart=s.clock;}return true;},
    bindModel(version,fn){model=fn;arm=version;},
    bindGates(fn){gateReader=fn;},
    frame(busy,trialPaused,pending,reduced){
      if(!active)return;
      const t=now(),current=gateList.length>0;
      if(t-gateRefresh<.25&&current===(busy||trialPaused||pending||document.hidden))return;
      gateRefresh=t;
      const list=busy&&gateReader?gateReader():[];
      if(trialPaused)list.push('trial-paused');if(pending)list.push('camera-fit');if(document.hidden)list.push('hidden');
      if(busy&&!list.length)list.push('presentation-blocked');
      gateSample(t,[...new Set(list)].sort());
    },
    blockedTick(dt){blockedModel+=dt;},
    tick(dt,clock,actors,goals,flags){
      if(modelStart===null)modelStart=clock-dt;
      modelTime=relative(clock);
      if(!dt)return;
      for(const a of actors){
        const r=row(a.key);r.activeSeconds+=dt;
        const state=a.target?'walking-'+a.source:a.key===flags.heldActor?'held':goals.has(a.key)?'manual-pending':
          clock<a.manualUntil?'manual-hold':flags.reducedMotion?'reduced-motion':flags.autonomy===false?'autonomy-disabled':a.activity||'rest';
        add(r.stateSeconds,state,dt);
      }
    },
    request(key,source,goal,retry,clock){
      const r=row(key),type=source==='ambient'?'ambient':source==='drag'?'drag':source;
      if(type==='ambient')r.ambientRequests++;
      if(type==='drag'&&!retry){r.dragRequests++;r._dragCommand=++command;timeline(clock,'drag-request',key,{command:r._dragCommand,goal:[goal.x,goal.y]});}
      if(retry){r.retries++;api.wait({key},'replan');}
      return {key,type,goal,retry,clock,planned:false};
    },
    result(q,accepted,a,actors,clock,classify){
      if(!a)return;
      const r=row(q.key),prefix=q.type;
      if(!['ambient','drag'].includes(prefix))return;
      if(!q.planned){if(!accepted)api.wait(a,'preplanning-policy');return;}
      if(accepted){
        r[prefix+'Plans']++;r._firstHop=prefix;if(prefix==='ambient'&&a.ambientEscape)r.escapePlans++;
        timeline(clock,'planned',q.key,{source:prefix,retry:q.retry,command:prefix==='drag'?r._dragCommand:null,escape:!!a.ambientEscape&&prefix==='ambient'});
        return;
      }
      r[prefix+'Failures']++;
      if(!r._episode){r.failureEpisodes++;r._episode={start:relative(clock),source:prefix,failures:0};}
      r._episode.failures++;
      const peers=actors.filter(b=>b!==a),start=peers.filter(b=>geometry(a,b).clearance<1).map(b=>b.key);
      const goal=peers.filter(b=>geometry(a,b,q.goal).clearance<1).map(b=>b.key);
      const line=peers.filter(b=>crossing(a,q.goal,b)).map(b=>b.key);
      start.forEach(k=>add(r.startContactPeers,k));goal.forEach(k=>add(r.goalContactPeers,k));line.forEach(k=>add(r.directObstructions,k));
      const facts=classify(),b=facts.box,out=q.goal.x<b.left||q.goal.x>b.right||q.goal.y<b.top||q.goal.y>b.bottom;
      r.failuresAtOriginOverlap+=Number(!!start.length);r.failuresOutsideBounds+=Number(out);
      r.failuresOffTerrain+=Number(!facts.terrain);r.failuresAtOcclusion+=Number(!facts.visible);
      const sample={clock:relative(clock),source:prefix,from:[a.x,a.y],to:[q.goal.x,q.goal.y],start,goal,line,outsideBounds:out,terrain:facts.terrain,visible:facts.visible};
      if(r.failureSamples.length<8)r.failureSamples.push(sample);
      timeline(clock,'plan-failed',q.key,sample);
    },
    hop(a,p,clock){
      const d=Math.hypot(p.x-a.x,p.y-a.y);if(d<=1e-8)return;
      const r=row(a.key),t=relative(clock),source=a.source;
      r.stationaryMax=Math.max(r.stationaryMax,t-(r.lastMove??0));r.lastMove=t;r.lastSource=source;
      r.actualDistance+=d;if(['ambient','drag','yield'].includes(source))r[source+'Distance']+=d;
      if(source==='ambient'&&r._firstHop==='ambient'){r.ambientStarts++;if(a.ambientEscape)r.escapeStarts++;timeline(clock,'first-step',a.key,{source});}
      if(source==='ambient'&&a.ambientEscape)r.escapeDistance+=d;
      if(source==='drag'&&r._startedCommand!==r._dragCommand){r.dragStarts++;r._startedCommand=r._dragCommand;timeline(clock,'first-step',a.key,{source,command:r._dragCommand});}
      if(source==='yield'&&r._yieldHopPending){r.yieldPhysicalStarts++;r._yieldHopPending=false;}
      if(source==='drag'&&r._offerCommand===r._dragCommand&&r._settledOffer!==r._dragCommand&&clock<=(model()?.manualGoals.get(a.key)?.expires??-Infinity)){
        r.yieldSuccesses++;r._settledOffer=r._dragCommand;
      }
      r._firstHop=null;
      if(r._episode&&(source==='ambient'||source==='drag')){
        r.recoveredEpisodes++;
        if(source===r._episode.source)r.recoveredSameSource++;
        const item={...r._episode,end:t,via:source};
        if(r.recoverySamples.length<8)r.recoverySamples.push(item);
        timeline(clock,'recovery',a.key,item);r._episode=null;
      }
    },
    arrival(a,clock){
      const r=row(a.key);if(['ambient','drag','yield'].includes(a.source))r[a.source+'Arrivals']++;
      if(a.source==='ambient'&&a.ambientEscape)r.escapeArrivals++;
      timeline(clock,'arrival',a.key,{source:a.source,command:a.source==='drag'?r._dragCommand:null});
    },
    wait(a,reason){const r=row(a.key);r.waits++;add(r.waitReasons,reason);},
    choice(a,name){add(row(a.key).choices,name);},
    yielded(a,b,clock,kind,stage){
      const r=row(a.key),peer=row(b.key);r.yieldsReceived++;peer.yieldsGiven++;peer._yieldHopPending=true;
      if(r._offerCommand!==r._dragCommand)r.yieldOffers++;
      if(kind==='sequential'){r.sequentialStages++;if(stage===1)r.sequentialOffers++;}else r.singleOffers++;
      r._offerCommand=r._dragCommand;timeline(clock,'yield-offer',a.key,{peer:b.key,kind,stage,command:r._dragCommand});
    },
    veto(a,p,actors,clock,isVisible,terrain,continuous){
      const r=row(a.key);r.vetoCount++;
      if(!isVisible)add(r.stepVetoes,'visibility');if(!terrain)add(r.stepVetoes,'terrain');
      const ids=[];
      for(const b of actors){
        if(a===b)continue;
        const from=geometry(a,b).clearance,end=geometry(a,b,p).clearance;
        const contact=end<1&&!(from<1&&end>from+1e-6)||continuous&&crossing(a,p,b);
        if(contact){ids.push(b.key);add(r.blockingPeers,b.key);}
      }
      if(ids.length)add(r.stepVetoes,'contact');
      timeline(clock,'step-veto',a.key,{peer:ids,terrain,isVisible});
    },
    read(){
      if(!active)return {enabled:false,arm,residents:[]};
      const s=model?.(),t=now();
      const elapsed=s?relative(s.clock):modelTime;
      const delta=Math.max(0,t-gateAt),reasonTimes={...totals};
      gateList.forEach(k=>add(reasonTimes,k,delta));
      const list=(s?.actors||[]).map(a=>{
        const r=row(a.key),peers=s.actors.filter(b=>b!==a).map(b=>geometry(a,b)).sort((x,y)=>x.distance-y.distance);
        const age=Math.max(0,elapsed-(r.lastMove??0));
        const data=Object.fromEntries(Object.entries(r).filter(([k])=>!k.startsWith('_')));
        return {...data,kind:a.kind,id:a.id,x:a.x,y:a.y,w:a.w,h:a.h,activity:a.activity,source:a.source,lastMovedAgo:age,
          stationaryMax:Math.max(r.stationaryMax,age),nearest:peers[0]||null,overlaps:peers.filter(p=>p.clearance<1),openFailure:r._episode&&{...r._episode}};
      });
      return {enabled:true,arm,wallSeconds:t-wallStart,modelSeconds:elapsed,pausedSeconds:pausedWall+(gateList.length?delta:0),
        gateReasons:reasonTimes,currentGateReasons:[...gateList],blockedModelSeconds:blockedModel,residents:list,eventsRetained:observations.length};
    },
    events(){return {events:observations.slice(),gateTransitions:transitions.slice()};}
  };
  // Hidden documents may stop receiving native animation frames altogether.
  document.addEventListener('visibilitychange',()=>{
    if(!active)return;
    const reasons=gateList.filter(reason=>reason!=='hidden');
    if(document.hidden)reasons.push('hidden');
    gateSample(now(),reasons.sort());gateRefresh=0;
  });
  window.HomeMobilityDiagnostics=Object.freeze(api);
  if(new URLSearchParams(location.search).get('diagnostics')==='1')api.enable();
})();
