const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');

async function swipe(session,from,to){
  await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[from]});
  for(let step=1;step<=10;step++){
    await session.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:from.x+(to.x-from.x)*step/10,y:from.y+(to.y-from.y)*step/10}]});
    await new Promise(resolve=>setTimeout(resolve,16));
  }
  await session.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
}

exports.scroll=async page=>{
  const session=await page.context().newCDPSession(page);
  try{
    await page.locator('.screen-frame').evaluate(e=>{e.scrollTop=0;});
    await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
    const box=await page.locator('.screen-frame').evaluate(e=>{const r=e.getBoundingClientRect(),stage=document.getElementById('castStage').getBoundingClientRect();return {x:r.left+r.width/2,y:stage.top+100,top:stage.top+20,range:e.scrollHeight-e.clientHeight};});
    const hit=await page.evaluate(({x,y})=>{let e=document.elementFromPoint(x,y);const path=[];for(;e;e=e.parentElement)path.push({tag:e.tagName,id:e.id,classes:e.className,action:getComputedStyle(e).touchAction,overflow:getComputedStyle(e).overflowY,top:e.scrollTop,range:e.scrollHeight-e.clientHeight});return path;},box);
    assert.ok(box.range>40,'native central scroll fixture overflows');
    await page.evaluate(()=>{window.__touchTrace=[];for(const type of ['touchstart','touchmove','touchend','pointercancel'])document.addEventListener(type,event=>window.__touchTrace.push({type,prevented:event.defaultPrevented,target:event.target.id,scroll:document.querySelector('.screen-frame').scrollTop,dy:event.touches?.[0]?.clientY}),{passive:true});});
    await swipe(session,{x:box.x,y:box.y},{x:box.x,y:Math.max(box.top,box.y-110)});
    await page.waitForFunction(()=>document.querySelector('.screen-frame').scrollTop>20,null,{timeout:5000}).catch(async error=>{throw new Error(error.message+'; touch path: '+JSON.stringify(hit)+'; events: '+JSON.stringify(await page.evaluate(()=>window.__touchTrace)));});
    assert.equal(await page.evaluate(()=>scrollY),0,'native swipe does not move the page');
  }finally{await session.detach();}
};

exports.actors=async(page,region,count)=>{
  await page.emulateMedia({reducedMotion:'no-preference'});
  const session=await page.context().newCDPSession(page);
  const viewport=page.viewportSize(),records=[];
  const output=path.resolve('test-results/home-production-native');
  fs.mkdirSync(output,{recursive:true});
  const save=()=>fs.writeFileSync(path.join(output,`${viewport.width}x${viewport.height}-${region}-${count}.json`),JSON.stringify(records,null,2));
  await page.evaluate(()=>{
    if(window.__homeNativeTrace)return;
    window.__homeNativeTrace=[];
    for(const type of ['pointerdown','pointerup','pointercancel','lostpointercapture'])document.addEventListener(type,event=>{
      const detail=HomeReleaseQA.detail();
      window.__homeNativeTrace.push({type,at:performance.now(),blockers:HomeReleaseQA.blockers?.(),x:event.clientX,y:event.clientY,target:event.target.id||event.target.tagName,
        actor:event.target.closest?.('[data-diorama-actor]')?.dataset.dioramaActor,
        selected:document.querySelector('[data-diorama-selected="true"]')?.dataset.dioramaActor,
        pet:detail.actors[0],blocked:detail.blocked,stage:detail.slots.castStage});
      if(window.__homeNativeTrace.length>32)window.__homeNativeTrace.shift();
    },true);
  });
  try{for(const kind of ['tap','drag']){
    const record={kind,status:'preparing'};records.push(record);
    try{
    await page.evaluate(()=>{window.__homeNativeTrace.length=0;window.HomeReleaseInputTrace.length=0;});
    await page.waitForFunction(()=>{const a=HomeReleaseQA.detail().actors[0];return !a.target||a.source==='ambient';},null,{timeout:15000});
    await page.evaluate(([r,c])=>HomeReleaseQA.scene(r,c),[region,count]);
    await page.waitForFunction(([r,c])=>{const d=HomeReleaseQA.detail();return !d.blocked&&d.paused==='false'&&d.world.region===r&&d.world.loaded&&d.actors.length===c;},[region,count]);
    await page.evaluate(()=>{
      const frame=document.querySelector('.screen-frame'),stage=document.getElementById('castStage'),a=HomeReleaseQA.detail().actors[0];
      frame.scrollTop+=stage.getBoundingClientRect().top+a.y-a.h*.4-frame.getBoundingClientRect().top-frame.clientHeight/2;
    });
    // DOM hit testing can see a new scroll offset before Chromium's touch
    // compositor does. Let the viewport paint before choosing physical points.
    await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
    await page.waitForFunction(()=>{const d=HomeReleaseQA.detail();return !d.blocked&&d.paused==='false';},null,{timeout:15000});
    const searchStarted=Date.now();
    let target;
    try{target=await page.evaluate(require('./home-production-pointer-target.cjs'),kind);}
    finally{record.searchDurationMs=Date.now()-searchStarted;}
    record.beforeInput=await page.evaluate(()=>({at:performance.now(),blockers:HomeReleaseQA.blockers?.(),detail:HomeReleaseQA.detail()}));
    record.target=target;record.status='input';
    if(kind==='tap'){
      await page.touchscreen.tap(target.from.x,target.from.y);
      assert.equal(await page.locator('[data-diorama-actor="pet:dog"]').getAttribute('aria-pressed'),'true');
      await page.touchscreen.tap(target.to.x,target.to.y);
    }else await swipe(session,target.from,target.to);
    const moved=await page.waitForFunction(({a,source})=>{const p=HomeReleaseQA.detail().actors[0];return p.source===source&&Math.hypot(p.x-a.x,p.y-a.y)>5?p:false;},{a:target.a,source:kind==='tap'?'ground':'drag'},{timeout:15000});
    record.observedMovement=await moved.jsonValue();await moved.dispose();
    assert.ok((await page.evaluate(()=>HomeReleaseQA.detail())).actors.every(a=>a.safe),kind+' remains grounded');
    await page.waitForFunction(()=>{const a=HomeReleaseQA.detail().actors[0];return !a.target||a.source==='ambient';},null,{timeout:15000});
    record.status='passed';
    }catch(error){record.status='failed';record.error=error.message;throw error;}
    finally{
      record.observation=await page.evaluate(()=>({detail:HomeReleaseQA.detail(),trace:window.__homeNativeTrace,inputTrace:window.HomeReleaseInputTrace,
        frame:document.querySelector('.screen-frame').getBoundingClientRect().toJSON(),bounds:HomeReleaseQA.inspect().bounds})).catch(()=>null);
      save();
    }
  }}finally{await session.detach();await page.emulateMedia({reducedMotion:'reduce'});}
};
