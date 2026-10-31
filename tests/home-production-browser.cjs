const fs=require('fs'),path=require('path'),http=require('http'),assert=require('node:assert/strict');
const out=path.resolve(process.argv[2]||'../production'),dest=path.resolve('test-results/home-production');fs.mkdirSync(dest,{recursive:true});
const mime={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.webp':'image/webp','.svg':'image/svg+xml','.woff2':'font/woff2'};
const server=http.createServer((req,res)=>{let p=decodeURIComponent(new URL(req.url,'http://localhost').pathname);if(p==='/')p='/index.html';const f=path.resolve(out,'.'+p);if(!f.startsWith(out+'/')||!fs.existsSync(f)){res.writeHead(404).end();return;}res.setHeader('Content-Type',mime[path.extname(f)]||'application/octet-stream');fs.createReadStream(f).pipe(res);});
(async()=>{await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;const results=[],errors=[],inputs=[];const saveInputs=()=>fs.writeFileSync(path.join(dest,'inputs.json'),JSON.stringify(inputs,null,2));try{
 for(const engineName of (process.env.HOME_RELEASE_ENGINES||'chromium,webkit').split(',')){
 const engine=require('playwright')[engineName],browser=await engine.launch({headless:true});
 try{
 const page=await browser.newPage({viewport:{width:390,height:844},reducedMotion:'reduce'});page.on('pageerror',e=>errors.push(engineName+': '+e.message));
 await page.goto(base);await page.waitForFunction(()=>window.HomeV6Egg&&document.querySelector('.home-v6-egg-world img')?.complete);await page.screenshot({path:path.join(dest,engineName+'-egg.png'),fullPage:true});assert.equal(await page.locator('.home-v6-egg-world').count(),1);
 for(let tap=0;tap<5;tap++){await page.locator('#playWithBtn').click();await page.waitForTimeout(120);}
 await page.waitForFunction(()=>!document.querySelector('.home-v6-egg-world')&&document.body.dataset.livingHome==='art-25d');
 const original=JSON.parse(fs.readFileSync(path.join(out,'release-qa-seed.json')));await page.evaluate(s=>localStorage.setItem('naotocchi-home-release-qa-v1',JSON.stringify(s)),original);
 await page.goto(base+'/release-qa.html');await page.waitForFunction(()=>window.HomeReleaseQA);
 for(const width of [320,375,390,430])for(const region of (process.env.HOME_RELEASE_REGION?[process.env.HOME_RELEASE_REGION]:['home','forest','river_lake','city','countryside','mountain','snow','sea','jungle','desert','deepsea','star_stop','memory_lake']))for(const count of [1,6,28]){
 await page.setViewportSize({width,height:844});await page.evaluate(([r,c])=>HomeReleaseQA.scene(r,c),[region,count]);
 await page.waitForFunction(([r,c])=>{const d=HomeReleaseQA.detail();return !d.blocked&&d.paused==='false'&&d.world?.mode==='art-25d'&&d.world.loaded&&d.world.region===r&&d.actors.length===c&&d.actors.every(a=>a.safe);},[region,count],{timeout:30000});
 const detail=await page.evaluate(()=>HomeReleaseQA.detail());assert.equal(Math.round(detail.slots.notice),42);assert.equal(Math.round(detail.slots.speech),76);assert.ok(await page.evaluate(()=>HomeReleaseQA.move()),`${region}/${width}/${count} pet exit: ${JSON.stringify(detail)}`);
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
 await page.waitForFunction(([r,c])=>{const d=HomeReleaseQA.detail();return !d.blocked&&d.paused==='false'&&d.world.region===r&&d.world.loaded&&d.actors.length===c;},[inputRegion,inputCount]);
 for(const kind of ['tap','drag']){
 await page.waitForFunction(()=>{const d=HomeReleaseQA.detail();return !d.blocked&&d.paused==='false';},null,{timeout:15000});
 const input={engine:engineName,region:inputRegion,count:inputCount,kind,before:await page.evaluate(()=>HomeReleaseQA.detail()),status:'started'};inputs.push(input);saveInputs();
 try{
 const t=await page.evaluate(targetFn),from={x:t.stage.x+t.a.x,y:t.stage.y+t.a.y-t.a.h*.4},to={x:t.stage.x+t.p.x,y:t.stage.y+t.p.y};
 input.from=from;input.to=to;input.selectionMs=t.selectionMs;saveInputs();
 if(kind==='tap'){await page.mouse.click(from.x,from.y);await page.waitForTimeout(100);assert.equal(await page.locator('[data-diorama-actor="pet:dog"]').getAttribute('aria-pressed'),'true');await page.mouse.click(to.x,to.y);}
 else{await page.mouse.move(from.x,from.y);await page.mouse.down();await page.mouse.move(to.x,to.y,{steps:8});await page.mouse.up();}
 await page.waitForFunction(({a,source})=>{const p=HomeReleaseQA.detail().actors[0];return p.source===source&&Math.hypot(p.x-a.x,p.y-a.y)>5;},{a:t.a,source:kind==='tap'?'ground':'drag'},{timeout:15000});
 assert.ok((await page.evaluate(()=>HomeReleaseQA.detail())).actors.every(a=>a.safe),kind+' stays grounded');
 await settled();
 input.status='passed';
 }catch(error){input.status='failed';input.error=error.message;await page.screenshot({path:path.join(dest,`${engineName}-${inputRegion}-${inputCount}-${kind}-failure.png`)}).catch(()=>{});throw error;}
 finally{input.after=await page.evaluate(()=>HomeReleaseQA.detail()).catch(()=>null);input.trace=await page.evaluate(()=>window.HomeReleaseInputTrace).catch(()=>null);saveInputs();}
 }
 }
 const questionStarted=await page.evaluate(()=>HomeReleaseQA.question());assert.ok(questionStarted,'existing conversation accepts prepared healthy fixture: '+JSON.stringify(await page.evaluate(()=>HomeReleaseQA.conversationStatus())));await page.locator('#speechChoices [data-choice]').first().click();await page.waitForFunction(()=>document.getElementById('speechChoices').classList.contains('hidden'));
 await page.locator('#menuBtn').click();await page.locator('#menuOverlay').waitFor({state:'visible'});assert.equal(await page.locator('#menuOverlay .menu-grid > :is(button,a)').count(),12);await page.locator('#menuCloseBtn').click();
 await page.emulateMedia({reducedMotion:'reduce'});await page.waitForFunction(()=>matchMedia('(prefers-reduced-motion: reduce)').matches);await page.waitForTimeout(100);const clock=await page.evaluate(()=>HomeReleaseQA.detail().world.animationTime);assert.ok(Number.isFinite(clock),'real environment clock');await page.waitForTimeout(500);assert.equal(await page.evaluate(()=>HomeReleaseQA.detail().world.animationTime),clock);
 await page.setViewportSize({width:844,height:390});await page.evaluate(()=>HomeReleaseQA.scene('star_stop',28));await page.waitForFunction(()=>{const d=HomeReleaseQA.detail();return !d.blocked&&d.paused==='false'&&d.world.region==='star_stop'&&d.world.loaded&&d.actors.length===28&&d.actors.every(a=>a.safe);},null,{timeout:30000});
 assert.ok(await page.evaluate(()=>HomeReleaseQA.move()));
 const saved=await page.evaluate(()=>HomeReleaseQA.save());await page.reload();await page.waitForFunction(()=>window.HomeReleaseQA);const restored=await page.evaluate(()=>HomeReleaseQA.state());assert.equal(restored.regionId,saved.regionId);assert.equal(restored.companions.length,saved.companions.length);assert.equal(restored.partner.id,saved.partner.id);assert.equal(restored.lifetime.money,saved.lifetime.money);
 await page.close();
 }finally{await browser.close();}
 }
 assert.deepEqual(errors,[]);fs.writeFileSync(path.join(dest,'report.json'),JSON.stringify({status:'passed',results,errors},null,2));console.log('PASS',results.length,'matrix cases, egg, rotation and save resume');
 }catch(e){fs.writeFileSync(path.join(dest,'report.json'),JSON.stringify({status:'failed',results,errors,failure:e.stack},null,2));throw e;}finally{await new Promise(r=>server.close(r));}})().catch(e=>{console.error(e);process.exitCode=1;});
