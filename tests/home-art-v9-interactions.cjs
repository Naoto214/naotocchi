// CI runs both engines. Local managed preview uses the identical browser-check UI.
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),http=require('node:http');
const {execFileSync}=require('node:child_process'),assert=require('node:assert/strict');
if(!process.env.CI)throw new Error('Use the managed Sites preview and v22-qa.html locally; this runner is for CI.');
const candidate=process.env.HOME_V9_CANDIDATE||'water-g';
const region=candidate==='sea-b2'?'sea':'river_lake';
const output=path.resolve('test-results/home-art-v9-interactions/'+region);fs.mkdirSync(output,{recursive:true});
const root=fs.mkdtempSync(path.join(os.tmpdir(),'home-v22-'));
for(const version of [7,8,9])execFileSync(process.execPath,['tools/home-v'+version+'-build.cjs',root],{stdio:'inherit'});
const mime={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.webp':'image/webp','.svg':'image/svg+xml','.woff2':'font/woff2'};
const server=http.createServer((req,res)=>{const file=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));if(!file.startsWith(root+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404).end();return;}res.setHeader('Content-Type',mime[path.extname(file)]||'application/octet-stream');fs.createReadStream(file).pipe(res);});
(async()=>{await new Promise(r=>server.listen(0,'127.0.0.1',r));const {chromium,webkit}=require('playwright');try{
 for(const [name,engine]of Object.entries({chromium,webkit})){const browser=await engine.launch({headless:true});try{const page=await browser.newPage({viewport:{width:1000,height:1100}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(require('./helpers/home-v9-play-sentinel.cjs'),`http://127.0.0.1:${server.address().port}`);
 await page.goto(`http://127.0.0.1:${server.address().port}/home-v9-qa.html?region=${region}&candidate=${candidate}`);await page.frameLocator('#game').locator('[data-diorama-actor]').first().waitFor();await page.locator('#apply:enabled').waitFor();
 // Physical pointer events, independent of the model-only moveTest above.
 await page.locator('#width').selectOption('390');await page.locator('#time').selectOption('day');await page.locator('#count').selectOption('6');await page.locator('#apply').click();await page.locator('#apply:enabled').waitFor();
 const pointerGame=page.frames().find(f=>f.url().includes('qa-home-v9-game.html'));
 assert.equal(await pointerGame.evaluate(()=>HomeV22QA.environment().candidate),candidate);
 const findGroundTarget=require('./helpers/home-ground-target.cjs');
 async function pointerTarget(){return pointerGame.evaluate(findGroundTarget);}
 const frameBox=await page.locator('#game').boundingBox();let target=await pointerTarget();
 const xy=p=>({x:frameBox.x+target.stage.x+p.x,y:frameBox.y+target.stage.y+p.y});let from=xy({x:target.a.x,y:target.a.y-target.a.h*.4}),to=xy(target.p);
 await page.mouse.click(from.x,from.y);await page.waitForTimeout(100);assert.equal(await pointerGame.locator('[data-diorama-actor="pet:dog"]').getAttribute('aria-pressed'),'true');
 await page.mouse.click(to.x,to.y);await page.waitForTimeout(1800);let afterPointer=await pointerGame.evaluate(()=>HomeV22QA.detail());assert.ok(Math.hypot(afterPointer.actors[0].x-target.a.x,afterPointer.actors[0].y-target.a.y)>5,'physical ground tap moves pet');
 target=await pointerTarget();from=xy({x:target.a.x,y:target.a.y-target.a.h*.4});to=xy(target.p);await page.mouse.move(from.x,from.y);await page.mouse.down();await page.mouse.move(to.x,to.y,{steps:8});await page.mouse.up();await page.waitForTimeout(1800);afterPointer=await pointerGame.evaluate(()=>HomeV22QA.detail());assert.ok(Math.hypot(afterPointer.actors[0].x-target.a.x,afterPointer.actors[0].y-target.a.y)>5,'physical drag moves pet');assert.ok(afterPointer.actors.every(a=>a.safe));
 await pointerGame.evaluate(()=>HomeV22QA.sleepLeft());assert.ok(await pointerGame.locator('.pet-expression-accent--sleeping').count(),'official sleeping expression retained');await pointerGame.evaluate(()=>HomeV22QA.wake());
 fs.writeFileSync(path.join(output,name+'-pointer.json'),JSON.stringify({tap:true,drag:true,afterPointer},null,2));
 await page.emulateMedia({reducedMotion:'reduce'});await page.locator('#apply').click();await page.locator('#apply:enabled').waitFor();await page.waitForTimeout(1800);
 const game=page.frames().find(f=>f.url().includes('qa-home-v9-game.html'));
 const reduced=await game.evaluate(()=>({reduced:matchMedia('(prefers-reduced-motion: reduce)').matches,actors:HomeV22QA.detail().actors}));assert.equal(reduced.reduced,true);assert.ok(reduced.actors.every(a=>a.safe));
 const freezeBefore=await game.evaluate(()=>HomeV22QA.environment());await page.waitForTimeout(600);const freezeAfter=await game.evaluate(()=>HomeV22QA.environment());assert.equal(freezeAfter.animationTime,freezeBefore.animationTime,'reduced motion freezes environment clock');
 const saved=await game.evaluate(()=>HomeV22QA.save());await game.goto(game.url());await game.waitForFunction(()=>window.HomeV22QA);const loaded=await game.evaluate(()=>HomeV22QA.loaded());assert.deepEqual(loaded,saved);
 assert.equal(await page.evaluate(()=>localStorage.getItem('naotocchi-home-v9-play-v1')),'existing-play-save-sentinel','QA must preserve existing real-play bytes');
 const productionKeys=await page.evaluate(()=>Object.keys(localStorage).filter(k=>k.startsWith('naotocchi-save-v1')||k.startsWith('naotocchi-home-v22-qa-v1')||k.startsWith('naotocchi-home-diorama-preview-v1')));assert.deepEqual(productionKeys,[]);
 const resumeBefore=await game.evaluate(()=>HomeV22QA.detail());await page.goto('about:blank');await page.goto(`http://127.0.0.1:${server.address().port}/home-v9-qa.html?region=${region}&candidate=${candidate}`);await page.frameLocator('#game').locator('[data-diorama-actor]').first().waitFor();await page.locator('#apply:enabled').waitFor();
 fs.writeFileSync(path.join(output,name+'-lifecycle.json'),JSON.stringify({reduced,freezeBefore,freezeAfter,saved,loaded,productionKeys,resumeBefore,osSuspension:'not measured; navigation/reload only'},null,2));
 // Headless engine timing is a reproducible reference, never an iPhone result.
 await page.emulateMedia({reducedMotion:'no-preference'});await page.locator('#region').selectOption(region);await page.locator('#width').selectOption('390');await page.locator('#count').selectOption('28');await page.locator('#apply').click();await page.locator('#apply:enabled').waitFor();
 const perfFrame=page.frames().find(f=>f.url().includes('qa-home-v9-game.html'));await perfFrame.evaluate(()=>HomeV22QA.live());
 const performanceSample=await perfFrame.evaluate(async()=>{const intervals=[];let last=performance.now();await new Promise(resolve=>{function tick(now){intervals.push(now-last);last=now;if(intervals.length<121)requestAnimationFrame(tick);else resolve();}requestAnimationFrame(tick);});intervals.shift();intervals.sort((a,b)=>a-b);return {sampleCount:intervals.length,medianMs:intervals[60],p95Ms:intervals[114],heapBytes:performance.memory?.usedJSHeapSize??null,visibility:document.visibilityState,renderer:HomeV22QA.environment(),images:performance.getEntriesByType('resource').filter(r=>/assets\/home-(v[6789]|art)/.test(r.name)).map(r=>({name:r.name.split('/').pop(),durationMs:r.duration,transferBytes:r.transferSize})),note:'Headless CI at 390px/28 actors. Not iPhone FPS, GPU memory, battery or heat.'};});
 assert.equal(performanceSample.renderer.region,region,'performance sample uses the requested region');
 fs.writeFileSync(path.join(output,name+'-performance.json'),JSON.stringify(performanceSample,null,2));

 // Verify that special worlds are actually present in the comparison capture.
 const capture=await perfFrame.evaluate(()=>{const c=HomeV22QA.captureBackground(),d=c.getContext('2d').getImageData(0,0,c.width,c.height).data;let opaque=0;const colors=new Set();for(let i=0;i<d.length;i+=64){if(d[i+3])opaque++;colors.add(d[i]+','+d[i+1]+','+d[i+2]);}return{opaque,colors:colors.size};});assert.ok(capture.opaque>100&&capture.colors>50,'nonblank background capture');
 fs.writeFileSync(path.join(output,name+'-capture.json'),JSON.stringify(capture));await page.locator('#game').screenshot({path:path.join(output,name+'-28.png')});assert.deepEqual(errors,[]);

 }finally{await browser.close();}}
 }finally{await new Promise(r=>server.close(r));fs.rmSync(root,{recursive:true,force:true});}})().catch(e=>{console.error(e);process.exitCode=1;});
