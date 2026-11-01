// Natural text geometry, using the authored game pools through the disposable
// QA entry. Existing 42px/76px assertions remain in the original suites.
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const root=path.resolve(process.argv[2]),output=path.resolve('test-results/home-production-notices');fs.mkdirSync(output,{recursive:true});
const types={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.webp':'image/webp','.svg':'image/svg+xml','.woff2':'font/woff2'};
const server=http.createServer((req,res)=>{const f=path.resolve(root,'.'+new URL(req.url,'http://local').pathname);if(!f.startsWith(root+'/')||!fs.existsSync(f)){res.writeHead(404).end();return;}res.setHeader('Content-Type',types[path.extname(f)]||'application/octet-stream');fs.createReadStream(f).pipe(res);});
const inspect=()=>{
 const rect=e=>e.getBoundingClientRect().toJSON(),slot=document.getElementById('homeEventSlot'),frame=document.querySelector('.screen-frame');
 const content=[...slot.children].filter(e=>e.getClientRects().length).map(e=>({id:e.id,rect:rect(e),client:e.clientHeight,scroll:e.scrollHeight,text:e.textContent,inner:[...e.querySelectorAll('.story-flash-text')].map(n=>({client:n.clientHeight,scroll:n.scrollHeight,rect:rect(n)}))}));
 return {slot:rect(slot),extra:parseFloat(getComputedStyle(slot).marginBottom),speech:rect(document.getElementById('speechSlot')),stage:rect(document.getElementById('castStage')),info:rect(document.getElementById('homeInformation')),frame:rect(frame),content,buttons:[...document.querySelectorAll('#careActions>button')].map(rect),pageWidth:document.documentElement.scrollWidth,world:HomeReleaseQA.detail().world};
};
(async()=>{await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port,results=[],errors=[];try{
 for(const engine of (process.env.HOME_LAYOUT_ENGINES||'chromium,webkit').split(',')){
 const browser=await require('playwright')[engine].launch();try{
 for(const width of [320,375,390,430])for(const landscape of [false,true])for(const region of ['forest','jungle','star_stop','memory_lake']){
 const page=await browser.newPage({viewport:{width,height:844},reducedMotion:'reduce'});page.on('pageerror',e=>errors.push(e.message));await page.clock.install();
 await page.goto(base+'/v5-qa.html?region='+region+'&count=6');await page.waitForFunction(()=>window.HomeReleaseQA?.detail().world?.loaded);await page.evaluate(()=>document.fonts.ready);
 // Rotate the same live document, not a separate landscape-only fixture.
 if(landscape)await page.setViewportSize({width:844,height:width});
 await page.evaluate(()=>HomeReleaseQA.noticeCase(''));await page.clock.runFor(100);
 const baseline=await page.evaluate(inspect);
 for(const kind of ['short','forest','multiline','story','court']){
 const text=await page.evaluate(k=>HomeReleaseQA.noticeCase(k),kind);await page.clock.runFor(100);
 await page.locator('#homeEventSlot').evaluate(e=>e.scrollIntoView({block:'start'}));await page.clock.runFor(50);
 const d=await page.evaluate(inspect),label=[engine,width,landscape,region,kind].join('/');
 assert.equal(d.slot.height,42,label+' original reservation');assert.equal(d.speech.height,76,label+' independent speech');
 assert.ok(d.content.length,label+' notice exists');
 for(const c of d.content){assert.ok(c.scroll<=c.client+1,label+' full outer text');assert.ok(c.inner.every(n=>n.scroll<=n.client+1),label+' full story body');assert.ok(c.rect.bottom<=d.stage.top+1,label+' no terrain overlap');assert.ok(c.rect.top>=d.info.bottom-1,label+' no name/status overlap');}
 assert.ok(d.content.some(c=>c.text.includes(text)),label+' authored text preserved');
 assert.equal(d.stage.height,baseline.stage.height,label+' intrinsic actor stage unchanged');
 assert.ok(d.speech.top>=d.stage.bottom-1,label+' no speech overlap');assert.ok(d.buttons.every((b,i)=>b.y===baseline.buttons[i].y&&b.height===baseline.buttons[i].height),label+' fixed controls');
 assert.ok(d.pageWidth<=(landscape?844:width),label+' no horizontal overflow');
 if(kind==='short')assert.equal(d.extra,0,label+' short notice');
 results.push({engine,width,landscape,region,kind,text,...d});
 if(kind==='forest'||kind==='story')await page.screenshot({path:path.join(output,[engine,width,landscape?'landscape':'portrait',region,kind].join('-')+'.png')});
 await page.clock.runFor(4300);await page.evaluate(()=>HomeReleaseQA.noticeCase(''));await page.clock.runFor(100);
 assert.equal((await page.evaluate(inspect)).extra,0,label+' returns to 42px');
 }
 await page.evaluate(()=>HomeReleaseQA.question());await page.evaluate(()=>HomeReleaseQA.noticeCase('forest'));await page.clock.runFor(100);const simultaneous=await page.evaluate(inspect);assert.equal(simultaneous.speech.height,76);assert.ok(simultaneous.content.every(c=>c.rect.bottom<=simultaneous.stage.top+1));
 await page.screenshot({path:path.join(output,[engine,width,landscape?'landscape':'portrait',region,'speech'].join('-')+'.png')});
 // Reload via resume URL: no new fixture reset. Main save sentinel is untouched.
 await page.evaluate(()=>HomeReleaseQA.save());await page.goto(base+'/v5-qa.html');await page.waitForFunction(()=>window.HomeReleaseQA?.detail().world?.loaded);assert.equal(await page.evaluate(()=>HomeReleaseQA.state().regionId),region);
 await page.close();fs.writeFileSync(path.join(output,'progress.json'),JSON.stringify({results,errors},null,2));
 }
 }finally{await browser.close();}}
 assert.deepEqual(errors,[]);fs.writeFileSync(path.join(output,'report.json'),JSON.stringify({status:'passed',results,errors},null,2));console.log('PASS natural notices',results.length);
 }finally{server.close();}})().catch(e=>{console.error(e);process.exitCode=1});
