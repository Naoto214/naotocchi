const fs=require('fs'),path=require('path'),http=require('http'),assert=require('node:assert/strict');
const out=path.resolve(process.argv[2]||'../production'),dest=path.resolve('test-results/home-production');fs.mkdirSync(dest,{recursive:true});
const mime={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.webp':'image/webp','.svg':'image/svg+xml','.woff2':'font/woff2'};
const server=http.createServer((req,res)=>{let p=decodeURIComponent(new URL(req.url,'http://localhost').pathname);if(p==='/')p='/index.html';const f=path.resolve(out,'.'+p);if(!f.startsWith(out+'/')||!fs.existsSync(f)){res.writeHead(404).end();return;}res.setHeader('Content-Type',mime[path.extname(f)]||'application/octet-stream');fs.createReadStream(f).pipe(res);});
(async()=>{await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;const results=[],errors=[];try{
 for(const engineName of (process.env.HOME_RELEASE_ENGINES||'chromium,webkit').split(',')){
 const engine=require('playwright')[engineName],browser=await engine.launch({headless:true});
 try{
 const page=await browser.newPage({viewport:{width:390,height:844},reducedMotion:'reduce'});page.on('pageerror',e=>errors.push(engineName+': '+e.message));
 await page.goto(base);await page.waitForFunction(()=>window.HomeV6Egg&&document.querySelector('.home-v6-egg-world img')?.complete);await page.screenshot({path:path.join(dest,engineName+'-egg.png'),fullPage:true});assert.equal(await page.locator('.home-v6-egg-world').count(),1);
 const original=JSON.parse(fs.readFileSync(path.join(out,'release-qa-seed.json')));await page.evaluate(s=>localStorage.setItem('naotocchi-home-release-qa-v1',JSON.stringify(s)),original);
 await page.goto(base+'/release-qa.html');await page.waitForFunction(()=>window.HomeReleaseQA);
 for(const width of [320,375,390,430])for(const region of (process.env.HOME_RELEASE_REGION?[process.env.HOME_RELEASE_REGION]:['home','forest','river_lake','city','countryside','mountain','snow','sea','jungle','desert','deepsea','star_stop','memory_lake']))for(const count of [1,6,28]){
 await page.setViewportSize({width,height:844});await page.evaluate(([r,c])=>HomeReleaseQA.scene(r,c),[region,count]);
 await page.waitForFunction(([r,c])=>{const d=HomeReleaseQA.detail();return d.world?.mode==='art-25d'&&d.world.loaded&&d.world.region===r&&d.actors.length===c&&d.actors.every(a=>a.safe);},[region,count],{timeout:30000});
 const detail=await page.evaluate(()=>HomeReleaseQA.detail());assert.equal(Math.round(detail.slots.notice),42);assert.equal(Math.round(detail.slots.speech),76);assert.ok(await page.evaluate(()=>HomeReleaseQA.move()),`${region}/${width}/${count} pet exit`);
 results.push({engine:engineName,width,region,count,candidate:detail.world.candidate,safe:detail.actors.every(a=>a.safe),slots:detail.slots});
 if(width===390&&count===28)await page.screenshot({path:path.join(dest,`${engineName}-${region}-28.png`),fullPage:true});
 fs.writeFileSync(path.join(dest,'progress.json'),JSON.stringify({results,errors},null,2));
 }
 await page.setViewportSize({width:844,height:390});await page.evaluate(()=>HomeReleaseQA.scene('star_stop',28));await page.waitForFunction(()=>HomeReleaseQA.detail().actors.length===28&&HomeReleaseQA.detail().actors.every(a=>a.safe),null,{timeout:30000});
 assert.ok(await page.evaluate(()=>HomeReleaseQA.move()));
 const saved=await page.evaluate(()=>HomeReleaseQA.save());await page.reload();await page.waitForFunction(()=>window.HomeReleaseQA);const restored=await page.evaluate(()=>HomeReleaseQA.state());assert.equal(restored.regionId,saved.regionId);assert.equal(restored.companions.length,saved.companions.length);assert.equal(restored.partner.id,saved.partner.id);assert.equal(restored.lifetime.money,saved.lifetime.money);
 await page.close();
 }finally{await browser.close();}
 }
 assert.deepEqual(errors,[]);fs.writeFileSync(path.join(dest,'report.json'),JSON.stringify({status:'passed',results,errors},null,2));console.log('PASS',results.length,'matrix cases, egg, rotation and save resume');
 }catch(e){fs.writeFileSync(path.join(dest,'report.json'),JSON.stringify({status:'failed',results,errors,failure:e.stack},null,2));throw e;}finally{await new Promise(r=>server.close(r));}})().catch(e=>{console.error(e);process.exitCode=1;});
