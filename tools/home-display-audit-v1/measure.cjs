// Investigation only: unchanged V5 production controller/model in its frozen QA copy.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
process.env.REACH_DIST ||= '/workspace/sites/naotocchi-movement-v5/dist';
process.env.REACH_OUT ||= '/tmp/home-display-audit-v1';
const q=require('../home-movement-v5/measure.cjs');
const counts=(process.env.AUDIT_COUNTS||'1,4,10,20,28').split(',').map(Number);
async function autonomy(page,seconds){
 await page.evaluate(()=>{
  const m=MovementQA.model(),d=MovementQA.detail();
  window.DisplayAudit={p:d.presentation,previous:m.snapshot(),elapsed:0,overlapWorsenings:0,minClearance:Infinity,inkSamples:[],actors:Object.fromEntries(m.snapshot().map(a=>[a.key,{key:a.key,kind:a.kind,distanceCss:0,stationarySeconds:0,longestStationarySeconds:0,streak:0,activeSeconds:0,plans:0,rejectedPlans:0,executionStops:0,localBlocked:0,localProbes:0,minX:Infinity,maxX:-Infinity,minY:Infinity,maxY:-Infinity}]))};
 });
 for(let t=0;t<seconds;t+=10){
  await page.evaluate(()=>{
   const m=MovementQA.model(),r=DisplayAudit,p=r.p,scene=HomeReleaseQA.inspect().scene;
   const clearance=(a,q,b)=>Math.hypot((q.x-b.x)/((a.w+b.w)*.5+10),(q.y-b.y)/((a.h+b.h)*.38+10));
   for(let i=0;i<100;i++){
    window.__reachAttempts=[];m.step(.1);const now=m.snapshot();
    // V5 records both current and reference plans; deduplicate per actor/tick.
    // Successful plans have no `accepted:true` marker. Use the model's lastWalk.
    for(const key of new Set((window.__reachAttempts||[]).map(e=>e.key))){const s=r.actors[key],a=now.find(a=>a.key===key);if(s){s.plans++;if(Math.abs(a.lastWalk-m.metrics().clock)>1e-6)s.rejectedPlans++;}}
    for(let j=0;j<now.length;j++){
     const a=now[j],old=r.previous[j],s=r.actors[a.key],distance=Math.hypot((a.x-old.x)*p.scaleX,(a.y-old.y)*p.scaleY);
     s.distanceCss+=distance;if(distance<.001){s.stationarySeconds+=.1;s.streak+=.1;s.longestStationarySeconds=Math.max(s.longestStationarySeconds,s.streak);}else s.streak=0;
     if(a.target)s.activeSeconds+=.1;
     if(old.target&&!a.target&&Math.hypot(old.target.x-old.x,old.target.y-old.y)>=.5&&distance<.001)s.executionStops++;
     s.minX=Math.min(s.minX,a.x*p.scaleX);s.maxX=Math.max(s.maxX,a.x*p.scaleX);s.minY=Math.min(s.minY,a.y*p.scaleY);s.maxY=Math.max(s.maxY,a.y*p.scaleY);
     const b=m.bounds(a);assertSafe(a.x>=b.left-.01&&a.x<=b.right+.01&&a.y>=b.top-.01&&a.y<=b.bottom+.01&&scene.navigation.valid(a),'unsafe actor '+a.key);
     for(let k=j+1;k<now.length;k++){const c=clearance(a,a,now[k]),before=clearance(old,old,r.previous[k]);r.minClearance=Math.min(r.minClearance,c);if(c<Math.min(1,before)-1e-6)r.overlapWorsenings++;}
    }
    r.previous=now;r.elapsed+=.1;
   }
   if(Math.round(r.elapsed)%30===0)for(const a of m.snapshot().filter(a=>a.kind!=='companion')){
    const s=r.actors[a.key],b=m.bounds(a);s.localProbes++;
    const safe=Array.from({length:8},(_,i)=>({x:a.x+Math.cos(i*Math.PI/4)*12/p.scaleX,y:a.y+Math.sin(i*Math.PI/4)*12/p.scaleY})).some(to=>{
     if(to.x<b.left||to.x>b.right||to.y<b.top||to.y>b.bottom||!scene.navigation.segmentSafe(a,to))return false;
     const steps=Math.ceil(Math.hypot(to.x-a.x,to.y-a.y)/3);for(let k=1;k<=steps;k++){const at={x:a.x+(to.x-a.x)*k/steps,y:a.y+(to.y-a.y)*k/steps};if(!scene.visible(at,a)||!m.snapshot().every(c=>c.key===a.key||clearance(a,at,c)>=1))return false;}return true;
    });if(!safe)s.localBlocked++;
   }
   MovementQA.step(0);
   const ink=MovementQA.inkRects().filter(r=>r.kind==='alpha-image'&&r.src.includes('/characters/'));let overlaps=0,maxFraction=0;
   for(let j=0;j<ink.length;j++)for(let k=j+1;k<ink.length;k++){const a=ink[j],b=ink[k],area=Math.max(0,Math.min(a.right,b.right)-Math.max(a.left,b.left))*Math.max(0,Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top));if(area>0){overlaps++;maxFraction=Math.max(maxFraction,area/Math.min((a.right-a.left)*(a.bottom-a.top),(b.right-b.left)*(b.bottom-b.top)));}}
   r.inkSamples.push({seconds:Math.round(r.elapsed),overlaps,maxFraction});
   function assertSafe(v,message){if(!v)throw Error(message);}
  });
  if((t+10)%100===0)console.log('autonomy '+(t+10)+' / '+seconds);
 }
 return page.evaluate(()=>({...DisplayAudit,previous:undefined,metrics:MovementQA.model().metrics()}));
}
(async()=>{const browser=await q.start();try{for(const count of counts){
 const config={...q.configFromEnv(),count},page=await q.open(browser,'e',config),detail=await page.evaluate(()=>MovementQA.detail()),records=[];
 await page.screenshot({path:path.join(q.out,`count-${count}-initial.png`)});
 const result=process.env.AUDIT_AUTONOMY_ONLY?JSON.parse(fs.readFileSync(path.join(q.out,`count-${count}.json`))):{baseCommit:'02df2efc39cd18543b9c66df281872ed1751b02c',config,detail,records};
 for(const a of (process.env.AUDIT_AUTONOMY_ONLY?[]:detail.actors))for(const edge of q.edges){
  const goal=q.goals(edge,detail.frame,config,64,a.foot,true)[0],r=await q.trial(page,detail.actors,a.key,goal,{selectedGround:true});
  const axis=['left','right'].includes(edge)?'x':'y';r.edge=edge;r.directionalProgressCss=r.actor?q.sign(edge)*(r.actor.foot[axis]-a.foot[axis]):0;
  r.diagnostic=r.actor?await q.diagnose(page,a.key,edge):null;
  if(r.directionalProgressCss<=.5&&count>1){const control=await q.trial(page,[a],a.key,goal,{selectedGround:true,origin:r.origin});r.isolatedControl={progressCss:control.actor?q.sign(edge)*(control.actor.foot[axis]-a.foot[axis]):0,input:control.input,actor:control.actor};}
  records.push(r);q.save(`count-${count}.json`,result);console.log('drag '+count+' '+a.key+' '+edge+' '+r.directionalProgressCss.toFixed(2));
 }
 await page.close();
 // Fresh fixture: drag tests never advance the autonomy clock or RNG.
 const ambient=await q.open(browser,'e',config);result.autonomy=await autonomy(ambient,Number(process.env.AUDIT_SECONDS||600));assert.equal(result.autonomy.overlapWorsenings,0);
 await ambient.screenshot({path:path.join(q.out,`count-${count}-autonomy.png`)});q.save(`count-${count}.json`,result);await ambient.close();console.log('COMPLETE '+count);
 }}finally{await browser.close();q.server.close();}})().catch(e=>{console.error(e);q.server.close();process.exitCode=1;});
