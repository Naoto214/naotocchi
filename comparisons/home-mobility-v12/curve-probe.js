// Installed solely in the isolated saved-pose browser test.
globalThis.curveProbe=(feet,goalKey,degrees,mode)=>{
 const s=scene.navigation.intentScale;
 for(const [key,x,y,w,h] of feet){
   const b=actor(key);if(b.w!==w||b.h!==h)throw Error('wrong cast');
   Object.assign(b,{x,y,target:null,route:[],nextAt:1e5,manualUntil:0,yieldAfter:0,yieldFor:null,lastWalk:0,lastOwnWalk:0,activity:'rest',source:'ambient'});
 }
 clearRelief();waiting.clear();crowdMisses.clear();manualGoals.clear();helpedAt.clear();selected=null;clock=20;paused=false;
 const a=actor(goalKey),angle=degrees*Math.PI/180;
 const q={x:a.x+8*Math.cos(angle)/s.x,y:a.y+8*Math.sin(angle)/s.y};
 const blocked=actors.filter(b=>b!==a&&!contactSegmentSafe(a,q,b,(a.w+b.w)*.5+10,(a.h+b.h)*.38+10));
 const trace=[];globalThis.HomeV12CurveEvent=(type,row)=>trace.push({type,...structuredClone(row)});
 const times=[],before={x:a.x,y:a.y},pts=actors.map(b=>[b.key,b.x,b.y]);let iters=0;
 const p={p:q,blocked};
 const gen=mode==='native'?intentPlan(a,q):curvedHandoff(a,q,[p],true);
 let complete;
 do{const start=performance.now();complete=gen.next();times.push(performance.now()-start);if(++iters>25000)throw Error('work ceiling');}while(!complete.done);
 const pair=complete.value;
 if(!pair)return {found:false,iters,max:Math.max(...times),total:times.reduce((a,b)=>a+b,0),trace};
 const history=[];let violations=0;
 waiting.set(a.key,{point:q,feet:nearbyFeet(a),expires:clock+12,attempted:true});
 relief={owner:a.key,point:q,expires:clock+12,search:null,pair,stage:0};
 for(let i=0;i<180;i++){
   const old=actors.map(b=>({x:b.x,y:b.y}));
   step(.05);
   for(let n=0;n<actors.length;n++){
     const b=actors[n];const delta=Math.hypot(b.x-old[n].x,b.y-old[n].y);
     if(delta<1e-10)continue;
     const box=bounds(b,scene),others=actors.filter(v=>v!==b);
     if(delta>42*.05+1e-7||b.x<box.left||b.x>box.right||b.y<box.top||b.y>box.bottom||
       !scene.navigation.segmentSafe(old[n],b,scene.planVisibility(b))||
       others.some(v=>!contactSegmentSafe(old[n],b,v,(b.w+v.w)*.5+10,(b.h+v.h)*.38+10)))violations++;
     history.push({key:b.key,x:b.x,y:b.y,source:b.source,clock});
   }
   if(!relief&&!a.target)break;
 }
 return {found:true,pair,iters,max:Math.max(...times),total:times.reduce((a,b)=>a+b,0),actual:Math.hypot((a.x-before.x)*s.x,(a.y-before.y)*s.y),goalError:Math.hypot((a.x-q.x)*s.x,(a.y-q.y)*s.y),violations,history,trace};
};
