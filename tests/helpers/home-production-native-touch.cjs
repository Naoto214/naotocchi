const assert=require('node:assert/strict');

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
  try{for(const kind of ['tap','drag']){
    await page.evaluate(([r,c])=>HomeReleaseQA.scene(r,c),[region,count]);
    await page.waitForFunction(([r,c])=>{const d=HomeReleaseQA.detail();return !d.blocked&&d.paused==='false'&&d.world.region===r&&d.world.loaded&&d.actors.length===c;},[region,count]);
    await page.evaluate(()=>{
      const frame=document.querySelector('.screen-frame'),stage=document.getElementById('castStage'),a=HomeReleaseQA.detail().actors[0];
      frame.scrollTop+=stage.getBoundingClientRect().top+a.y-a.h*.4-frame.getBoundingClientRect().top-frame.clientHeight/2;
    });
    const target=await page.evaluate(()=>{
      const q=HomeReleaseQA,d=q.detail(),a=d.actors[0],b=q.inspect().bounds[0],nav=q.inspect().scene.navigation,s=d.slots.castStage,f=document.querySelector('.screen-frame').getBoundingClientRect();
      const free=p=>d.actors.slice(1).every(c=>Math.hypot((p.x-c.x)/((a.w+c.w)*.5+10),(p.y-c.y)/((a.h+c.h)*.38+10))>=1)&&q.inspect().scene.visible(p,a);
      const from={x:s.x+a.x,y:s.y+a.y-a.h*.4};
      if(from.y<f.top||from.y>f.bottom)throw Error('Protagonist cannot be reached by touch');
      for(const distance of [45,12])for(let y=b.top;y<b.bottom;y+=4)for(let x=b.left;x<b.right;x+=4){
        const p={x,y},to={x:s.x+x,y:s.y+y};
        if(to.y<f.top+5||to.y>f.bottom-5||to.x<f.left+5||to.x>f.right-5||Math.hypot(x-a.x,y-a.y)<distance||!free(p)||!nav.valid(p))continue;
        if(d.actors.some(c=>Math.abs(x-c.x)<=Math.max(22,c.w/2)&&y>=c.y-Math.max(44,c.h)&&y<=c.y+10))continue;
        if(nav.route(a,p,b,free).length)return {a,from,to};
      }
      throw Error('No visible grounded destination for native touch');
    });
    if(kind==='tap'){
      await page.touchscreen.tap(target.from.x,target.from.y);
      assert.equal(await page.locator('[data-diorama-actor="pet:dog"]').getAttribute('aria-pressed'),'true');
      await page.touchscreen.tap(target.to.x,target.to.y);
    }else await swipe(session,target.from,target.to);
    await page.waitForFunction(a=>{const p=HomeReleaseQA.detail().actors[0];return Math.hypot(p.x-a.x,p.y-a.y)>5;},target.a,{timeout:15000});
    assert.ok((await page.evaluate(()=>HomeReleaseQA.detail())).actors.every(a=>a.safe),kind+' remains grounded');
  }}finally{await session.detach();await page.emulateMedia({reducedMotion:'reduce'});}
};
