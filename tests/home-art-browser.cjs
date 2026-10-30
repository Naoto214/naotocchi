// CI runs both engines. Local managed preview uses the identical browser-check UI.
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),http=require('node:http');
const {execFileSync}=require('node:child_process'),assert=require('node:assert/strict');
if(!process.env.CI)throw new Error('Use the managed Sites preview and v22-qa.html locally; this runner is for CI.');
const region=process.env.HOME_ART_REGION||'forest';
const output=path.resolve('test-results/home-layout/art25d/'+region);fs.mkdirSync(output,{recursive:true});
const root=fs.mkdtempSync(path.join(os.tmpdir(),'home-v22-'));
execFileSync(process.execPath,['tools/home-art-build.cjs',root],{stdio:'inherit'});
const mime={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.webp':'image/webp','.svg':'image/svg+xml','.woff2':'font/woff2'};
const server=http.createServer((req,res)=>{const file=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));if(!file.startsWith(root+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404).end();return;}res.setHeader('Content-Type',mime[path.extname(file)]||'application/octet-stream');fs.createReadStream(file).pipe(res);});
(async()=>{await new Promise(r=>server.listen(0,'127.0.0.1',r));const {chromium,webkit}=require('playwright');try{
 for(const [name,engine]of Object.entries({chromium,webkit})){const browser=await engine.launch({headless:true});try{const page=await browser.newPage({viewport:{width:1000,height:1100}});
 await page.addInitScript(()=>{if(!localStorage.getItem('naotocchi-art25d-play-v1'))localStorage.setItem('naotocchi-art25d-play-v1','existing-play-save-sentinel');});
 await page.goto(`http://127.0.0.1:${server.address().port}/home-art-qa.html?region=${region}`);await page.frameLocator('#game').locator('[data-diorama-actor]').first().waitFor();await page.locator('#apply:enabled').waitFor();
 await page.getByRole('button',{name:'全幅検証',exact:true}).click();// Bound each case independently and retain diagnostics if a case stalls.
 for(let completed=1;completed<=24;completed++)await page.waitForFunction(n=>Number(document.getElementById('run').dataset.completed)>=n,completed,{timeout:60000});
 await page.locator('#rawReport').waitFor({state:'attached',timeout:60000});
 const report=JSON.parse(await page.locator('#rawReport').textContent());fs.writeFileSync(path.join(output,name+'.json'),JSON.stringify(report,null,2));
 for(const width of ['320','375','390','430'])for(const time of ['day','night'])for(const count of ['1','6','28'])for(const selectedRegion of [region]){
  await page.locator('#width').selectOption(width);await page.locator('#time').selectOption(time);await page.locator('#count').selectOption(count);await page.locator('#region').selectOption(region);await page.locator('#apply').click();await page.locator('#apply:enabled').waitFor();await page.waitForTimeout(500);
  await page.locator('#game').screenshot({path:path.join(output,name+'-'+region+'-'+width+'-'+time+'-'+count+'.png')});
 }

 // Physical pointer events, independent of the model-only moveTest above.
 await page.locator('#width').selectOption('390');await page.locator('#time').selectOption('day');await page.locator('#count').selectOption('6');await page.locator('#apply').click();await page.locator('#apply:enabled').waitFor();
 const pointerGame=page.frames().find(f=>f.url().includes('qa-art-game.html'));
 async function pointerTarget(){return pointerGame.evaluate(()=>{const q=HomeV22QA,d=q.detail(),a=d.actors[0],b=q.inspect().bounds[0],nav=q.inspect().scene.navigation;const free=p=>d.actors.slice(1).every(c=>Math.hypot((p.x-c.x)/((a.w+c.w)*.5+10),(p.y-c.y)/((a.h+c.h)*.38+10))>=1)&&q.inspect().scene.visible(p,a);for(let y=b.top;y<b.bottom;y+=12)for(let x=b.left;x<b.right;x+=12){const p={x,y};if(Math.hypot(x-a.x,y-a.y)<45||!free(p)||!nav.valid(p))continue;if(nav.route(a,p,b,free).length)return {a,p,stage:d.slots.castStage};}throw Error('No physical-pointer destination');});}
 const frameBox=await page.locator('#game').boundingBox();let target=await pointerTarget();
 const xy=p=>({x:frameBox.x+target.stage.x+p.x,y:frameBox.y+target.stage.y+p.y});let from=xy({x:target.a.x,y:target.a.y-target.a.h*.4}),to=xy(target.p);
 await page.mouse.click(from.x,from.y);await page.waitForTimeout(100);assert.equal(await pointerGame.locator('[data-diorama-actor="pet:dog"]').getAttribute('aria-pressed'),'true');
 await page.mouse.click(to.x,to.y);await page.waitForTimeout(1800);let afterPointer=await pointerGame.evaluate(()=>HomeV22QA.detail());assert.ok(Math.hypot(afterPointer.actors[0].x-target.a.x,afterPointer.actors[0].y-target.a.y)>5,'physical ground tap moves pet');
 target=await pointerTarget();from=xy({x:target.a.x,y:target.a.y-target.a.h*.4});to=xy(target.p);await page.mouse.move(from.x,from.y);await page.mouse.down();await page.mouse.move(to.x,to.y,{steps:8});await page.mouse.up();await page.waitForTimeout(1800);afterPointer=await pointerGame.evaluate(()=>HomeV22QA.detail());assert.ok(Math.hypot(afterPointer.actors[0].x-target.a.x,afterPointer.actors[0].y-target.a.y)>5,'physical drag moves pet');assert.ok(afterPointer.actors.every(a=>a.safe));
 await pointerGame.evaluate(()=>HomeV22QA.sleepLeft());assert.ok(await pointerGame.locator('.pet-expression-accent--sleeping').count(),'official sleeping expression retained');await pointerGame.evaluate(()=>HomeV22QA.wake());
 fs.writeFileSync(path.join(output,name+'-pointer.json'),JSON.stringify({tap:true,drag:true,afterPointer},null,2));
 await page.emulateMedia({reducedMotion:'reduce'});await page.locator('#apply').click();await page.locator('#apply:enabled').waitFor();await page.waitForTimeout(1800);
 const game=page.frames().find(f=>f.url().includes('qa-art-game.html'));
 const reduced=await game.evaluate(()=>({reduced:matchMedia('(prefers-reduced-motion: reduce)').matches,actors:HomeV22QA.detail().actors}));assert.equal(reduced.reduced,true);assert.ok(reduced.actors.every(a=>a.safe));
 const freezeBefore=await game.evaluate(()=>HomeV22QA.environment());await page.waitForTimeout(600);const freezeAfter=await game.evaluate(()=>HomeV22QA.environment());assert.equal(freezeAfter.animationTime,freezeBefore.animationTime,'reduced motion freezes environment clock');
 const saved=await game.evaluate(()=>HomeV22QA.save());await game.goto(game.url());await game.waitForFunction(()=>window.HomeV22QA);const loaded=await game.evaluate(()=>HomeV22QA.loaded());assert.deepEqual(loaded,saved);
 assert.equal(await page.evaluate(()=>localStorage.getItem('naotocchi-art25d-play-v1')),'existing-play-save-sentinel','QA must preserve existing real-play bytes');
 const productionKeys=await page.evaluate(()=>Object.keys(localStorage).filter(k=>k.startsWith('naotocchi-save-v1')||k.startsWith('naotocchi-home-v22-qa-v1')||k.startsWith('naotocchi-home-diorama-preview-v1')));assert.deepEqual(productionKeys,[]);
 const resumeBefore=await game.evaluate(()=>HomeV22QA.detail());await page.goto('about:blank');await page.goto(`http://127.0.0.1:${server.address().port}/home-art-qa.html?region=${region}`);await page.frameLocator('#game').locator('[data-diorama-actor]').first().waitFor();await page.locator('#apply:enabled').waitFor();
 fs.writeFileSync(path.join(output,name+'-lifecycle.json'),JSON.stringify({reduced,freezeBefore,freezeAfter,saved,loaded,productionKeys,resumeBefore,osSuspension:'not measured; navigation/reload only'},null,2));
 // Headless engine timing is a reproducible reference, never an iPhone result.
 await page.emulateMedia({reducedMotion:'no-preference'});await page.locator('#region').selectOption(region);await page.locator('#width').selectOption('390');await page.locator('#count').selectOption('28');await page.locator('#apply').click();await page.locator('#apply:enabled').waitFor();
 const perfFrame=page.frames().find(f=>f.url().includes('qa-art-game.html'));await perfFrame.evaluate(()=>HomeV22QA.live());
 const performanceSample=await perfFrame.evaluate(async()=>{const intervals=[];let last=performance.now();await new Promise(resolve=>{function tick(now){intervals.push(now-last);last=now;if(intervals.length<121)requestAnimationFrame(tick);else resolve();}requestAnimationFrame(tick);});intervals.shift();intervals.sort((a,b)=>a-b);return {sampleCount:intervals.length,medianMs:intervals[60],p95Ms:intervals[114],heapBytes:performance.memory?.usedJSHeapSize??null,visibility:document.visibilityState,renderer:HomeV22QA.environment(),images:performance.getEntriesByType('resource').filter(r=>r.name.includes('home-art-v1')).map(r=>({name:r.name.split('/').pop(),durationMs:r.duration,transferBytes:r.transferSize})),note:'Headless CI at 390px/28 actors. Not iPhone FPS, GPU memory, battery or heat.'};});
 assert.equal(performanceSample.renderer.region,region,'performance sample uses the requested region');
 fs.writeFileSync(path.join(output,name+'-performance.json'),JSON.stringify(performanceSample,null,2));
 assert.equal(report.rows.length,24);assert.deepEqual(report.errors,[],name+' scenery errors');
 // Candidate must eliminate the old six-pixel rotation displacement.
 assert.ok(report.rotations.every(r=>Math.abs(r.dy)<=1&&r.noticeHeight===42&&r.speechHeight===76),name+' strict rotation');
 }finally{await browser.close();}}
 }finally{await new Promise(r=>server.close(r));fs.rmSync(root,{recursive:true,force:true});}})().catch(e=>{console.error(e);process.exitCode=1;});
