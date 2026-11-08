// Exercise the generated private fixture against the real Home code and images.
// Run from repo root: node tests/home-cast-sizing-browser.cjs [output-directory]
const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),http=require('node:http'),cp=require('node:child_process'),assert=require('node:assert/strict');
const fixture=fs.mkdtempSync(path.join(os.tmpdir(),'cast-preview-')),root=process.cwd(),out=path.resolve(process.argv[2]||'test-results/home-cast-sizing');
fs.mkdirSync(out,{recursive:true});cp.execFileSync(process.execPath,['tools/home-cast-size-qa.cjs',fixture]);
const mime={html:'text/html',js:'application/javascript',mjs:'application/javascript',css:'text/css',png:'image/png',webp:'image/webp',json:'application/json',svg:'image/svg+xml'};
const server=http.createServer((req,res)=>{const p=new URL(req.url,'http://localhost').pathname;
 if(p==='/save-check'){res.writeHead(200,{'content-type':'text/html'}).end('<title>local test</title>');return;}
 let file=path.join(fixture,p);if(!fs.existsSync(file))file=path.join(root,p);
 if(![root,fixture].some(dir=>file.startsWith(dir+path.sep))||!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404).end();return}
 res.setHeader('Content-Type',mime[file.split('.').pop()]||'application/octet-stream');fs.createReadStream(file).pipe(res);
});
const pointer=String(require('./helpers/home-production-pointer-target.cjs')).replace('q=HomeReleaseQA','q=HomeCastSizeQA');
(async()=>{await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;
const engines=(process.env.HOME_NAME_ENGINES||'chromium,webkit').split(',').map(x=>x.trim());
try{for(const engine of engines){const folder=path.join(out,engine);fs.mkdirSync(folder,{recursive:true});
const browser=await require('playwright')[engine].launch(),results=[],errors=[];
try{
 for(const [width,height] of [[390,844],[844,390]]){
  const page=await browser.newPage({viewport:{width,height},hasTouch:true,reducedMotion:'reduce'});page.on('pageerror',e=>errors.push(e.message));
  await page.goto(base+'/save-check');await page.evaluate(()=>localStorage.setItem('naotocchi-save-v1','origin-sentinel'));
  // The panel loads a new iframe document when the population changes and
  // updates profile/hero in place. Keep its input timing independent of CI speed.
  const start=Date.UTC(2026,0,1);
  await page.clock.install({time:new Date(start)});
  await page.clock.pauseAt(new Date(start+60000));
  for(const count of [1,2,5,10,18,28]){
   await page.goto(base+'/qa-cast.html?count='+count+'&profile=current&hero=100',{waitUntil:'domcontentloaded'});
   for(const [profile,hero] of [['current',100],['v18',105],['v1',110]]){
   if(profile!=='current')await page.evaluate(opts=>HomeCastSizeQA.set(opts),{count,profile,hero});
   // Image decoding uses real I/O. Advance camera frames until the shipped
   // world, images and requested scale are ready, then let its size tween finish.
   const deadline=Date.now()+30000;
   let ready=false;
   while(!ready&&Date.now()<deadline){
    await page.clock.runFor(50);
    ready=await page.evaluate(({count,profile})=>{const d=HomeCastSizeQA.detail();return document.body.dataset.livingHome==='art-25d'&&d.actors.length===count&&d.profile===profile&&d.actors.every(a=>a.grounded&&a.ready)&&Math.abs((d.presentation?.bodyScale??0)-NaotocchiHomeViewport.residentScale(count,profile))<.001;},{count,profile});
   }
   assert.ok(ready,'regional artwork, cast and camera ready for '+count+' '+profile);
   await page.clock.runFor(550);
   const row=await page.evaluate(()=>{
    const d=HomeCastSizeQA.detail(),bounds=document.querySelector('.screen-frame').getBoundingClientRect(),top=document.querySelector('#homeEventSlot').getBoundingClientRect().bottom,bottom=document.querySelector('#homeCommentDock').getBoundingClientRect().top;
    const safe=d.presentation.landscape?{left:d.presentation.safeLeft-4,right:d.presentation.safeRight+4,top,bottom}:{left:bounds.left,right:bounds.right,top:bounds.top,bottom:bounds.bottom};
    const visible=d.actors.filter(({ink})=>ink&&ink.left>=safe.left-1&&ink.right<=safe.right+1&&ink.top>=safe.top-1&&ink.bottom<=safe.bottom+1);
    const pet=d.actors.find(a=>a.kind==='pet'),p=pet.ink;
    const visibleArea=({left:l,top:t,right:r,bottom:b},q)=>Math.max(0,Math.min(r,q.right)-Math.max(l,q.left))*Math.max(0,Math.min(b,q.bottom)-Math.max(t,q.top));
    return {count:d.scope,profile:d.profile,hero:d.hero,scale:d.presentation.bodyScale,visible:visible.length,missing:d.actors.filter(a=>!visible.includes(a)).map(a=>({key:a.key,ink:a.ink})),safe,petBody:{width:p.right-p.left,height:p.bottom-p.top},petOverlap:d.actors.filter(a=>a!==pet&&visibleArea(p,a.ink)>1).length,legal:d.actors.every(a=>a.grounded),assets:d.actors.map(a=>a.asset),pet};
   });results.push({width,height,...row});
   console.log(width,count,profile,'body',row.scale.toFixed(2),'visible',row.visible,'overlap',row.petOverlap);
   assert.equal(row.legal,true);assert.equal(new Set(row.assets).size,count);assert.equal(row.visible,count,JSON.stringify(row.missing));
   if(profile!=='v1')continue;
   await page.screenshot({path:path.join(folder,width+'-'+count+'.png')});
   // Real touchscreen origin, actual DOM hits and controller movement. The
   // inspector chooses a legal destination; the input handler executes it.
   await page.evaluate(()=>{window.castInputTrace=[];
    document.getElementById('castStage').addEventListener('naotocchi:home-reaction',({detail})=>{
     if(detail.type==='move')window.castInputTrace.push({type:'move',source:detail.source,actor:detail.actor.key});
    });
    for(const type of ['pointerdown','pointerup','pointercancel'])document.addEventListener(type,e=>{const d=HomeCastSizeQA.detail();window.castInputTrace.push({type:e.type,pointer:e.pointerType,x:e.clientX,y:e.clientY,target:e.target.closest?.('[data-diorama-actor]')?.dataset.dioramaActor||e.target.id,blocked:d.blocked,selected:d.selected,pet:d.actors[0],metrics:d.metrics});},true);});
   const tap=await page.evaluate('('+pointer+')("drag")');
   await page.touchscreen.tap(tap.from.x,tap.from.y);assert.equal(await page.evaluate(()=>HomeCastSizeQA.detail().selected),'pet:dog');
   // Selection can trigger a camera/layout update. Measure again for the next
   // physical gesture instead of reusing a pointer origin from before the tap.
   await page.clock.runFor(100);
   assert.equal(await page.evaluate(()=>HomeCastSizeQA.detail().blocked),false);
   const target=await page.evaluate('('+pointer+')("drag")');
   await page.mouse.move(target.from.x,target.from.y);await page.mouse.down();await page.mouse.move(target.to.x,target.to.y,{steps:5});await page.mouse.up();
   const checkFiveResidentLane=width>height&&count===5;
   await page.clock.runFor(checkFiveResidentLane?1000:350);
   const outcome=await page.evaluate(()=>({pet:HomeCastSizeQA.detail().actors[0],trace:window.castInputTrace}));
   assert.ok(outcome.trace.some(e=>e.type==='move'&&e.source==='drag'&&e.actor===target.a.key),'drag must start a route for the protagonist: '+JSON.stringify(outcome.trace));
   const travel=Math.hypot(outcome.pet.x-target.a.x,outcome.pet.y-target.a.y);
   assert.ok(travel>(checkFiveResidentLane?20:1),'drag must move the protagonist: '+JSON.stringify({target,outcome}));
   results.at(-1).drag={actor:outcome.pet.key,travel};
   if(checkFiveResidentLane){
    await page.evaluate(()=>HomeCastSizeQA.set({count:5,profile:'current',hero:100}));
    await page.clock.runFor(550);
    const normal=await page.evaluate(()=>{
     const {scene,bounds}=HomeCastSizeQA.inspect(),pet=HomeCastSizeQA.detail().actors[0];
     const seat=scene.navigation.nearest(scene.navigation.initialPoint(0,5),bounds[0]);
     return {candidateLane:scene.fiveResidentExit,distance:Math.hypot(pet.x-seat.x,pet.y-seat.y)};
    });
    assert.equal(normal.candidateLane,false);
    assert.ok(normal.distance<1,'switching back restores the normal protagonist seat');
   }
   }
  }
  await page.clock.resume();
  for(const hero of [115,120]){await page.evaluate(hero=>HomeCastSizeQA.set({count:5,hero,profile:'v1'}),hero);await page.waitForTimeout(400);assert.equal(await page.evaluate(()=>HomeCastSizeQA.detail().actors.every(a=>a.grounded)),true);}
  if(width===390){
   await page.goto(base+'/qa-cast-panel.html');const f=page.frameLocator('iframe');
   await f.locator('[data-diorama-actor]').first().waitFor();
   const game=page.frames().find(frame=>frame.url().includes('qa-cast.html'));
   await page.getByLabel('主人公の足元に目印').check();
   assert.equal(await f.locator('.diorama-shadow[data-qa-role="pet"]').evaluate(e=>getComputedStyle(e).outlineStyle),'solid');
   await page.getByRole('button',{name:'年齢の選択肢を試す'}).click();
   const first=f.locator('#individualityChoices button').first();assert.equal(await first.textContent(),'近くで見てみる');
   await first.click();
   await game.waitForFunction(()=>window.NaotocchiIndividuality.data.events[0].choices[0].reactions.includes(document.getElementById('message').textContent.trim()),null,{timeout:15000});
   const originalBody=await game.locator('body').elementHandle();
   await page.locator('[name="profile"]').selectOption('v18');
   await page.locator('[name="hero"]').selectOption('115');
   await game.waitForFunction(()=>{const d=HomeCastSizeQA.detail();return d.profile==='v18'&&d.hero==='115'&&d.actors.length===5&&Math.abs(d.presentation.bodyScale-.9)<.001;});
   assert.ok(await originalBody.evaluate(body=>body===document.body),'same-population controls update the existing cast');
   await page.locator('[name="count"]').selectOption('18');
   await game.waitForURL('**/qa-cast.html?count=18&**');
   await game.waitForFunction(()=>{const d=window.HomeCastSizeQA?.detail();return d?.actors.length===18&&d.profile==='v18'&&d.hero==='115'&&d.actors.every(a=>a.grounded&&a.ready);});
  }
  await page.goto(base+'/save-check');assert.equal(await page.evaluate(()=>localStorage.getItem('naotocchi-save-v1')),'origin-sentinel');await page.close();
 }
 assert.deepEqual(errors,[]);
}finally{fs.writeFileSync(path.join(folder,'report.json'),JSON.stringify({engine,results,errors},null,2));await browser.close();}
}}finally{await new Promise(r=>server.close(r));fs.rmSync(fixture,{recursive:true,force:true});}
})().catch(e=>{console.error(e);process.exitCode=1;});
