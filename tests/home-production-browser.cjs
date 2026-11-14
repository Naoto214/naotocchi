const fs=require('fs'),path=require('path'),http=require('http'),assert=require('node:assert/strict');
const out=path.resolve(process.argv[2]||'../production'),dest=path.resolve(process.env.HOME_RELEASE_OUTPUT||'test-results/home-production');fs.mkdirSync(dest,{recursive:true});
const mime={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.webp':'image/webp','.svg':'image/svg+xml','.woff2':'font/woff2'};
const server=http.createServer((req,res)=>{let p=decodeURIComponent(new URL(req.url,'http://localhost').pathname);if(p==='/')p='/index.html';const f=path.resolve(out,'.'+p);if(!f.startsWith(out+'/')||!fs.existsSync(f)){res.writeHead(404).end();return;}res.setHeader('Content-Type',mime[path.extname(f)]||'application/octet-stream');fs.createReadStream(f).pipe(res);});
(async()=>{await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;const results=[],errors=[],inputs=[];const saveInputs=()=>fs.writeFileSync(path.join(dest,'inputs.json'),JSON.stringify(inputs,null,2));try{
 for(const engineName of (process.env.HOME_RELEASE_ENGINES||'chromium,webkit').split(',')){
 const engine=require('playwright')[engineName],browser=await engine.launch({headless:true});
 try{
 const page=await browser.newPage({viewport:{width:390,height:844},reducedMotion:'reduce'});await page.clock.install();page.on('pageerror',e=>errors.push(engineName+': '+e.message));
 await page.goto(base);await page.waitForFunction(()=>window.HomeV6Egg&&document.querySelector('.home-v6-egg-world img')?.complete);await page.screenshot({path:path.join(dest,engineName+'-egg.png'),fullPage:true});assert.equal(await page.locator('.home-v6-egg-world').count(),1);
 for(let tap=0;tap<5;tap++){await page.locator('#playWithBtn').click();await page.waitForTimeout(120);}
 await page.waitForFunction(()=>!document.querySelector('.home-v6-egg-world')&&document.body.dataset.livingHome==='art-25d');
 const original=JSON.parse(fs.readFileSync(path.join(out,'release-qa-seed.json')));await page.evaluate(s=>localStorage.setItem('naotocchi-home-release-qa-v1',JSON.stringify(s)),original);
 // beforeunload legitimately saves the old scene. Reset only explicitly
 // marked input fixtures, in the new document before application startup.
 await page.addInitScript(seed=>{
  if(!location.pathname.endsWith('/current-production-qa.html')||sessionStorage.getItem('home-release-reset-fixture')!=='1')return;
  localStorage.setItem('naotocchi-home-release-qa-v1',JSON.stringify(seed));
  sessionStorage.removeItem('home-release-reset-fixture');
 },original);
 await page.goto(base+'/current-production-qa.html');await page.waitForFunction(()=>window.HomeReleaseQA);
 for(const width of [320,375,390,430])for(const region of (process.env.HOME_RELEASE_REGION?[process.env.HOME_RELEASE_REGION]:['home','forest','river_lake','city','countryside','mountain','snow','sea','jungle','desert','deepsea','star_stop','memory_lake']))for(const count of [1,6,28]){
 await page.setViewportSize({width,height:844});await page.evaluate(([r,c])=>HomeReleaseQA.scene(r,c),[region,count]);
 await page.waitForFunction(([r,c])=>{const d=HomeReleaseQA.detail();return !d.blocked&&d.paused==='false'&&d.world?.mode==='art-25d'&&d.world.loaded&&d.world.region===r&&d.actors.length===c&&d.actors.every(a=>a.safe);},[region,count],{timeout:30000});
 const detail=await page.evaluate(()=>HomeReleaseQA.detail());assert.deepEqual(detail.layout,{viewport:'12',display:'18'},'regional matrix uses the shipped home');assert.equal(Math.round(detail.slots.notice),42);assert.equal(Math.round(detail.slots.speech),76);assert.ok(await page.evaluate(()=>HomeReleaseQA.move()),`${region}/${width}/${count} pet exit: ${JSON.stringify(detail)}`);
 results.push({engine:engineName,width,region,count,candidate:detail.world.candidate,safe:detail.actors.every(a=>a.safe),slots:detail.slots});
 if(width===390&&count===28)await page.screenshot({path:path.join(dest,`${engineName}-${region}-28.png`),fullPage:true});
 fs.writeFileSync(path.join(dest,'progress.json'),JSON.stringify({results,errors},null,2));
 }
 await page.setViewportSize({width:390,height:844});await page.emulateMedia({reducedMotion:'no-preference'});
 const inputRegion=process.env.HOME_RELEASE_REGION||'river_lake';
 const targetFn=require('./helpers/home-production-pointer-target.cjs');
 // Matrix moves and physical inputs share a live model. Finish the preceding
 // manual move before changing the cast or measuring the next pointer origin.
 const settled=()=>page.waitForFunction(()=>{const a=HomeReleaseQA.detail().actors[0];return !a.target||a.source==='ambient';},null,{timeout:15000});
 for(const inputCount of [6,28]){
 await settled();
 await page.evaluate(([r,c])=>HomeReleaseQA.scene(r,c),[inputRegion,inputCount]);
 await page.waitForFunction(([r,c])=>{const d=HomeReleaseQA.detail();return !d.blocked&&d.paused==='false'&&d.world?.region===r&&d.world.loaded&&d.actors.length===c;},[inputRegion,inputCount]);
 for(const kind of ['tap','drag']){
 // Each physical-input case starts on a fresh live page. Otherwise the idle
 // greeting scheduled during preceding screenshots/moves can legitimately
 // block pointerdown. The native matrix separately verifies fresh 28-actor
 // tap and drag fixtures, including the crowded 320px viewport.
 // Keep the sampled cast still only during candidate selection + physical
 // event delivery. Slow browser protocol round trips must not let a resident
 // walk into a ground-tap point between sampling and pointerdown.
 const input={engine:engineName,region:inputRegion,count:inputCount,kind,status:'preparing'};inputs.push(input);saveInputs();
 try{
 await page.evaluate(()=>sessionStorage.setItem('home-release-reset-fixture','1'));
 await page.reload();await page.waitForFunction(()=>window.HomeReleaseQA);
 input.fixture=await page.evaluate(()=>{const s=HomeReleaseQA.state();return {region:s.regionId,companions:s.companions.length,partner:!!s.partner,reset:sessionStorage.getItem('home-release-reset-fixture')};});saveInputs();
 assert.deepEqual(input.fixture,{region:original.regionId,companions:original.companions.length,partner:!!original.partner,reset:null},'physical input starts from the original QA save');
 // Fast-forward once with enough margin for a slow protocol round trip;
 // pauseAt rejects a past timestamp. Create the cast only after pausing:
 // syncing an already populated scene retains residents that have wandered
 // during this clock jump and can legitimately close the initial exit route.
 await page.clock.pauseAt(new Date(await page.evaluate(()=>Date.now())+10000));
 await page.evaluate(([r,c])=>HomeReleaseQA.scene(r,c),[inputRegion,inputCount]);
 // A decoded daypart is published by draw(). Drive a frame while waiting
 // for real image I/O, then leave the clock paused for physical input.
 const readyDeadline=Date.now()+15000;
 let ready=false;
 do {
  await page.clock.runFor(16);
  ready=await page.evaluate(([r,c])=>{const d=HomeReleaseQA.detail();return d.world?.loaded&&d.world.region===r&&d.actors.length===c&&!d.blocked&&d.paused==='false';},[inputRegion,inputCount]);
  if(!ready)await new Promise(resolve=>setTimeout(resolve,50));
 } while(!ready&&Date.now()<readyDeadline);
 assert.ok(ready,'decoded regional scene and cast ready before physical input');
 // Image decode and V18 body/camera fitting can span several animation
 // frames. Wait for stable model dimensions AND presentation before mapping
 // the physical pointer; an earlier snapshot can use the previous body size.
 let previousGeometry='',stableFrames=0;
 for(let frame=0;frame<20&&stableFrames<3;frame++){
  await page.clock.runFor(50);
  const geometry=await page.evaluate(()=>JSON.stringify({actors:HomeReleaseQA.detail().actors.map(({key,x,y,w,h})=>({key,x,y,w,h})),presentation:window.NaotocchiHomeViewport?.residentPresentation?.()}));
  stableFrames=geometry===previousGeometry?stableFrames+1:0;previousGeometry=geometry;
 }
 assert.equal(stableFrames,3,'V18 cast and camera settle before physical input');
 input.before=await page.evaluate(()=>HomeReleaseQA.detail());assert.deepEqual(input.before.layout,{viewport:'12',display:'18'},'physical input uses the shipped home');input.status='started';saveInputs();
 const t=await page.evaluate(targetFn,kind),{from,to}=t;
 input.target=t;input.from=from;input.to=to;input.selectionMs=t.selectionMs;saveInputs();
 if(kind==='tap'){await page.mouse.click(from.x,from.y);await page.waitForTimeout(100);assert.equal(await page.locator('[data-diorama-actor="pet:dog"]').getAttribute('aria-pressed'),'true');await page.mouse.click(to.x,to.y);}
 else{await page.mouse.move(from.x,from.y);await page.mouse.down();await page.mouse.move(to.x,to.y,{steps:8});await page.mouse.up();}
 await page.clock.resume();
 await page.waitForFunction(({a,source})=>{const p=HomeReleaseQA.detail().actors[0];return p.source===source&&Math.hypot(p.x-a.x,p.y-a.y)>5;},{a:t.a,source:kind==='tap'?'ground':'drag'},{timeout:15000});
 assert.ok((await page.evaluate(()=>HomeReleaseQA.detail())).actors.every(a=>a.safe),kind+' stays grounded');
 await settled();
 input.status='passed';
 }catch(error){input.status='failed';input.error=error.message;await page.screenshot({path:path.join(dest,`${engineName}-${inputRegion}-${inputCount}-${kind}-failure.png`)}).catch(()=>{});throw error;}
 finally{await page.clock.resume();input.after=await page.evaluate(()=>HomeReleaseQA.detail()).catch(()=>null);input.trace=await page.evaluate(()=>window.HomeReleaseInputTrace).catch(()=>null);saveInputs();}
 }
 }
 const stopInput={engine:engineName,region:'home',count:28,kind:'question-blocks-drag',viewport:{width:844,height:600},status:'started'};inputs.push(stopInput);saveInputs();
 try{
 // The conversation block is shared across regions. Use the home fixture
 // with a verified free route; regional movement is exercised above.
 // Portrait choices cover the protagonist; use the exposed landscape cast
 // to exercise the controller block with a pointer that actually reaches it.
 await page.setViewportSize(stopInput.viewport);
 // The preceding drag ends at a different seat and ambient residents keep
 // moving. Start the blocking comparison from the same fresh, reachable cast
 // as the successful physical inputs, then hold it still through delivery.
 await page.evaluate(()=>sessionStorage.setItem('home-release-reset-fixture','1'));
 await page.reload();await page.waitForFunction(()=>window.HomeReleaseQA);
 await page.clock.pauseAt(new Date(await page.evaluate(()=>Date.now())+10000));
 await page.evaluate(([r,c])=>HomeReleaseQA.scene(r,c),[stopInput.region,28]);
 // The renderer is imported asynchronously. A paused rAF cannot publish a
 // decoded daypart; advance real frames just as the physical-input setup does.
 const stopReadyDeadline=Date.now()+15000;let stopReady=false;
 do {
  await page.clock.runFor(16);
  stopReady=await page.evaluate(r=>{const d=HomeReleaseQA.detail();return d.world?.loaded&&d.world.region===r&&d.actors.length===28&&!d.blocked&&d.paused==='false';},stopInput.region);
  if(!stopReady)await new Promise(resolve=>setTimeout(resolve,50));
 } while(!stopReady&&Date.now()<stopReadyDeadline);
 assert.ok(stopReady,'decoded home and unblocked cast ready before question');
 await page.clock.runFor(50);
 const questionStarted=await page.evaluate(()=>HomeReleaseQA.question());assert.ok(questionStarted,'existing conversation accepts prepared healthy fixture: '+JSON.stringify(await page.evaluate(()=>HomeReleaseQA.conversationStatus())));
 await page.clock.runFor(50);
 const blockedTarget=await page.evaluate(targetFn,'drag');stopInput.target=blockedTarget;
 const blockedBefore=await page.evaluate(()=>({detail:HomeReleaseQA.detail(),traceIndex:HomeReleaseInputTrace.length,blockers:HomeReleaseQA.blockers()}));stopInput.before=blockedBefore;saveInputs();
 assert.ok(blockedBefore.detail.blocked,'question holds movement');
 await page.screenshot({path:path.join(dest,`${engineName}-${stopInput.region}-question-blocks-drag.png`)});
 await page.mouse.move(blockedTarget.from.x,blockedTarget.from.y);await page.mouse.down();await page.mouse.move(blockedTarget.to.x,blockedTarget.to.y,{steps:8});await page.mouse.up();
 // Advance real animation callbacks while the question owns the block.
 await page.clock.runFor(150);
 const blockedAfter=await page.evaluate(index=>({detail:HomeReleaseQA.detail(),trace:HomeReleaseInputTrace.slice(index)}),blockedBefore.traceIndex);stopInput.after=blockedAfter;saveInputs();
 assert.ok(blockedAfter.trace.some(t=>t.type==='pointerdown'&&t.actor==='pet:dog'&&t.blocked),'blocked pointerdown reaches protagonist');
 assert.ok(blockedAfter.trace.some(t=>t.type==='pointerup'),'blocked gesture completes');
 assert.equal(blockedAfter.detail.actors[0].x,blockedBefore.detail.actors[0].x,'question blocks drag x');assert.equal(blockedAfter.detail.actors[0].y,blockedBefore.detail.actors[0].y,'question blocks drag y');
 assert.ok(!blockedAfter.trace.some(t=>t.type==='move'&&t.result),'question must not accept a route');
 await page.locator('#speechChoices [data-choice]').first().click();await page.waitForFunction(()=>document.getElementById('speechChoices').classList.contains('hidden'));stopInput.status='passed';
 }catch(error){stopInput.status='failed';stopInput.error=error.message;stopInput.detail=await page.evaluate(()=>HomeReleaseQA.detail()).catch(()=>null);await page.screenshot({path:path.join(dest,`${engineName}-home-question-failure.png`)}).catch(()=>{});throw error;}
 finally{stopInput.trace=await page.evaluate(()=>window.HomeReleaseInputTrace).catch(()=>null);saveInputs();await page.clock.resume();}
 await page.setViewportSize({width:390,height:844});
 await page.locator('#menuBtn').click();await page.locator('#menuOverlay').waitFor({state:'visible'});assert.equal(await page.locator('#menuOverlay .menu-grid > :is(button,a)').count(),12);await page.locator('#menuCloseBtn').click();
 await page.emulateMedia({reducedMotion:'reduce'});await page.waitForFunction(()=>matchMedia('(prefers-reduced-motion: reduce)').matches&&document.getElementById('castStage').dataset.dioramaReduced==='true');await page.waitForTimeout(100);const clock=await page.evaluate(()=>HomeReleaseQA.detail().world.animationTime);assert.ok(Number.isFinite(clock),'real environment clock');await page.waitForTimeout(500);assert.equal(await page.evaluate(()=>HomeReleaseQA.detail().world.animationTime),clock);
 await page.setViewportSize({width:844,height:390});await page.evaluate(()=>HomeReleaseQA.scene('star_stop',28));await page.waitForFunction(()=>{const d=HomeReleaseQA.detail();return !d.blocked&&d.paused==='false'&&d.world?.region==='star_stop'&&d.world.loaded&&d.actors.length===28&&d.actors.every(a=>a.safe);},null,{timeout:30000});
 assert.ok(await page.evaluate(()=>HomeReleaseQA.move()));
 assert.equal(await page.evaluate(()=>sessionStorage.getItem('home-release-reset-fixture')),null,'save resume never resets the fixture');
 const saved=await page.evaluate(()=>HomeReleaseQA.save());await page.reload();await page.waitForFunction(()=>window.HomeReleaseQA);const restored=await page.evaluate(()=>HomeReleaseQA.state());assert.equal(restored.regionId,saved.regionId);assert.equal(restored.companions.length,saved.companions.length);assert.equal(restored.partner.id,saved.partner.id);assert.equal(restored.lifetime.money,saved.lifetime.money);
 await page.close();
 }finally{await browser.close();}
 }
 assert.deepEqual(errors,[]);fs.writeFileSync(path.join(dest,'report.json'),JSON.stringify({status:'passed',results,errors},null,2));console.log('PASS',results.length,'matrix cases, egg, rotation and save resume');
 }catch(e){fs.writeFileSync(path.join(dest,'report.json'),JSON.stringify({status:'failed',results,errors,failure:e.stack},null,2));throw e;}finally{await new Promise(r=>server.close(r));}})().catch(e=>{console.error(e);process.exitCode=1;});
