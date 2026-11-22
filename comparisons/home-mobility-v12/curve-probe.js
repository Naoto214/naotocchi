// Native-model fixture hook for offline and local Chromium QA only. A recorded
// pose retains every foot and footprint. The scheduler starts with idle peers.
globalThis.curveProbe=(feet,goalKey,degrees,mode,radius=8,snapshot={})=>{
  clearRelief();
  waiting.clear(); crowdMisses.clear(); manualGoals.clear(); helpedAt.clear();
  clock=20; nextRecovery=0; idleAt=1e5; selected=null; paused=false;
  for(const [key,x,y,w,h] of feet){
    const b=actor(key);
    if(b.w!==w||b.h!==h)throw Error('Wrong resident footprint: '+key);
    Object.assign(b,{x,y,target:null,route:[],nextAt:1e5,manualUntil:0,yieldAfter:0,yieldFor:null,
      lastWalk:0,lastOwnWalk:0,activity:'rest',source:'ambient',pointerDrop:false,intentRoute:false,
      escapeIntent:null,ambientEscape:false,visualTarget:null,after:'rest'});
  }
  const s=scene.navigation.intentScale,a=actor(goalKey),radians=degrees*Math.PI/180;
  const before={x:a.x,y:a.y};
  const q=snapshot.original?{x:snapshot.original[0],y:snapshot.original[1]}:{
    x:a.x+radius*Math.cos(radians)/s.x,y:a.y+radius*Math.sin(radians)/s.y};
  if(snapshot.pendingHelper){
    const helper=actor(snapshot.pendingHelper);
    waiting.set(helper.key,{point:{x:helper.x,y:helper.y},feet:nearbyFeet(helper),attempted:true,expires:clock+12});
  }
  const trace=[],history=[],times=[];
  globalThis.HomeV12CurveEvent=(type,data)=>trace.push({type,...structuredClone(data)});
  let pair=null,issued,iterations=0,violations=0;
  const service=mode==='service'||mode==='drag';
  if(service){
    const source=mode==='drag'?'drag':'ambient';
    issued=move(a.key,q,source,{pointerDrop:mode==='drag'});
  }else{
    const blocked=actors.filter(b=>b!==a&&!contactSegmentSafe(a,q,b,(a.w+b.w)*.5+10,(a.h+b.h)*.38+10));
    const gen=mode==='isolated'?curvedHandoff(a,q,[{p:q,blocked}],true):intentPlan(a,q);
    let result;
    do{
      const t=performance.now();result=gen.next();times.push(performance.now()-t);
      if(++iterations>25000)throw Error('Fixture exceeded native search cap');
    }while(!result.done);
    pair=result.value;
    if(pair){
      waiting.set(a.key,{point:q,feet:nearbyFeet(a),expires:clock+12,attempted:true});
      relief={owner:a.key,point:q,expires:clock+12,search:null,pair,stage:0};
    }
  }
  let interrupted=false;
  for(let i=0;(service||pair)&&i<300;i++){
    const old=actors.map(b=>({x:b.x,y:b.y})), t=performance.now();
    const queued=typeof backgroundCurve!=='undefined'&&backgroundCurve;
    let flags={};
    if(queued&&!interrupted&&snapshot.cancelOnQueue){
      const how=snapshot.cancelOnQueue;
      if(how==='tap')select(actors.find(b=>b.key!==a.key).key);
      else if(how==='blocked')flags={blocked:true};
      else if(how==='hold')flags={heldActor:a.key};
      else if(how==='navigation')scene={...scene,navigation:{...scene.navigation}};
      else if(how==='new-intent')waiting.delete(a.key);
      else throw Error('Unknown cancellation condition '+how);
      interrupted=true;
    }
    if(snapshot.touchHelper && !interrupted && history.some(row=>row.source==='yield')){
      const helper=history.find(row=>row.source==='yield');
      interrupted=select(helper.key);
    }
    step(.05,flags);
    if(service){times.push(performance.now()-t);iterations++;}
    if(!pair)pair=relief?.pair??manualGoals.get(a.key)?.pairNext??null;
    for(let j=0;j<actors.length;j++){
      const b=actors[j],delta=Math.hypot(b.x-old[j].x,b.y-old[j].y);
      if(delta<1e-10)continue;
      const box=bounds(b,scene);
      if(delta>42*.05+1e-7||b.x<box.left||b.x>box.right||b.y<box.top||b.y>box.bottom||
        !scene.navigation.segmentSafe(old[j],b,scene.planVisibility(b))||
        actors.some(v=>v!==b&&!contactSegmentSafe(old[j],b,v,(b.w+v.w)*.5+10,(b.h+v.h)*.38+10)))violations++;
      history.push({key:b.key,x:b.x,y:b.y,source:b.source,clock});
    }
    const background=typeof backgroundCurve!=='undefined'&&backgroundCurve;
    if(!relief&&!background&&!a.target&&!manualGoals.size)break;
  }
  const vx=(a.x-before.x)*s.x,vy=(a.y-before.y)*s.y;
  const gx=(q.x-before.x)*s.x,gy=(q.y-before.y)*s.y,length=Math.hypot(gx,gy),error=Math.hypot(gx-vx,gy-vy);
  return {interrupted,found:!!pair,...(pair?{pair}:{}),issued,iters:iterations,
    max:times.length?Math.max(...times):0,total:times.reduce((x,y)=>x+y,0),original:q,from:before,
    actual:Math.hypot(vx,vy),goalError:error,gain:length-error,projected:length?(vx*gx+vy*gy)/length:0,
    stopped:clock-20,violations,history,trace};
};
