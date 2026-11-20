async ({seconds, trace, osClock, seed}) => {
  const q=window.mobilityPerf, model=q.reset(seed), rows=[...document.querySelectorAll('#castStage [data-diorama-actor]')];
  const visible=()=>rows.filter(n=>{const r=n.getBoundingClientRect(),style=getComputedStyle(n);return r.width>0&&r.height>0&&r.right>0&&r.bottom>0&&r.left<innerWidth&&r.top<innerHeight&&style.display!=='none'&&style.visibility!=='hidden'&&Number(style.opacity)>0;}).length;
  const visibleAtOpen=visible();
  const saved=model.snapshot().map(({key,x,y,w,h})=>[key,x,y,w,h]);
  const held=[], main=[], events={}, minutes=[], gaps=[];
  const reaction=({detail})=>{events[detail.type]=(events[detail.type]||0)+1;};
  const stage=document.querySelector('#castStage');stage.addEventListener('naotocchi:home-reaction',reaction);
  let worker, mainTimer,workerReady,finishWorker;
  if(trace){
    const code=`let times=[],base;onmessage=e=>{if(e.data==='finish'){postMessage(times);close();return;}if(e.data==='sync'){postMessage(performance.now());return;}postMessage('ready');setInterval(()=>times.push(performance.now()),20);};`;
    worker=new Worker(URL.createObjectURL(new Blob([code],{type:'text/javascript'})));
    workerReady=new Promise(resolve=>worker.onmessage=()=>resolve());
    worker.postMessage('start');await workerReady;const syncA=performance.now();const syncReply=new Promise(resolve=>worker.onmessage=e=>resolve(e.data));worker.postMessage('sync');const workerNow=await syncReply;const syncB=performance.now();q.workerOffset=(syncA+syncB)/2-workerNow;q.workerSync=[syncA,syncB];
    mainTimer=setInterval(()=>main.push(performance.now()),20);
  }
  if(trace||osClock){const a=performance.now();await window.markSampling(a);q.mark=[a,performance.now()];}
  q.parts={};q.count={};q.slow=[];q.active=true;
  let before=model.metrics(),previous=before,start=performance.now(),last=start,lastFrame=0,lastMinute=start,next=Math.min(seconds*1000,60000);
  const sortStats=(v,elapsed)=>{const n=[...v].sort((a,b)=>a-b),pct=p=>n[Math.max(0,Math.ceil(p*n.length)-1)];return {frames:n.length,hz:n.length*1000/elapsed,p50:pct(.5),p95:pct(.95),p99:pct(.99),max:n.at(-1),over500:n.filter(x=>x>500).length,over1000:n.filter(x=>x>1000).length};};
  let pause=false,pausedMs=0;HomeCastTrial.apply({paused:false});
  await new Promise(done=>{function frame(){const t=performance.now(),gap=t-last;gaps.push(gap);last=t;
    const blocked=stage.dataset.dioramaPaused==='true';if(blocked)pausedMs+=gap;if(blocked!==pause){held.push([t-start,blocked]);pause=blocked;}
    if(t-start>=next){const m=model.metrics();minutes.push({...sortStats(gaps.slice(lastFrame),t-lastMinute),throughMs:t-start,clock:m.clock-previous.clock,moves:m.moves-previous.moves,distance:m.distance-previous.distance});previous=m;lastFrame=gaps.length;lastMinute=t;next=Math.min(seconds*1000,next+60000);}
    if(t-start>=seconds*1000)done();else q.nativeRaf(frame);
  }q.nativeRaf(frame)});
  q.active=false;stage.removeEventListener('naotocchi:home-reaction',reaction);
  if(trace){clearInterval(mainTimer);finishWorker=new Promise(resolve=>worker.onmessage=e=>resolve(e.data));worker.postMessage('finish');}
  const end=model.metrics(),elapsed=last-start;
  return {...sortStats(gaps,elapsed),elapsedMs:elapsed,start,osMark:q.mark??null,opening:saved,intervals:gaps,minutes,clock:end.clock-before.clock,moves:end.moves-before.moves,distance:end.distance-before.distance,events,pausedMs,pauses:held,retained:rows.length===28&&rows.every(n=>n.isConnected),visibleAtOpen,visibleAtEnd:visible(),scales:['pet','partner','companion'].map(k=>HomeCastTrial.scale(k)),settings:HomeCastTrial.settings,
    diagnostics:{enabled:window.HomeMobilityDiagnostics?.enabled??false,cost:Object.fromEntries(Object.entries(q.parts).filter(([k])=>k.startsWith('diagnostics.')))},
    audit:trace?{mark:q.mark,counts:q.count,parts:q.parts,spans:q.slow.map(([label,a,b])=>[label,a-start,b-start]),main:main.map(x=>x-start),workerSync:q.workerSync,worker:(await finishWorker).map(x=>x+q.workerOffset-start)}:null};
}
