// V8 opt-in browser gate. Existing V7 tests remain unchanged.
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const pointerTarget=require('./helpers/home-production-pointer-target.cjs');
async function readyForInput(page){
 for(let elapsed=0;elapsed<10000&&await page.evaluate(()=>{const d=HomeReleaseQA.detail();return d.blocked||d.paused!=='false';});elapsed+=100)await page.clock.runFor(100);
 assert.equal(await page.evaluate(()=>{const d=HomeReleaseQA.detail();return !d.blocked&&d.paused==='false';}),true,'scene and animation loop ready for physical input');
}
const root=path.resolve(process.argv[2]),out=path.resolve('test-results/home-viewport-v8');fs.mkdirSync(out,{recursive:true});
const server=http.createServer((req,res)=>{const p=path.resolve(root,'.'+new URL(req.url,'http://localhost').pathname);if(!p.startsWith(root+'/')||!fs.existsSync(p)||!fs.statSync(p).isFile())return res.writeHead(404).end();res.setHeader('Content-Type',({'.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.html':'text/html','.png':'image/png','.webp':'image/webp','.svg':'image/svg+xml'})[path.extname(p)]||'application/octet-stream');fs.createReadStream(p).pipe(res);});
(async()=>{await new Promise(r=>server.listen(0,'127.0.0.1',r));const records=[],errors=[];let failed=false;
try{for(const engine of (process.env.HOME_LAYOUT_ENGINES||'chromium,webkit').split(',')){
const browser=await require('playwright')[engine].launch();try{
for(const [width,height]of [[320,568],[375,667],[390,844],[430,932],[568,320],[844,390]])for(const count of [1,6,28]){
 const page=await browser.newPage({viewport:{width,height},hasTouch:true,reducedMotion:'reduce'}),record={engine,width,height,count};records.push(record);page.on('pageerror',e=>errors.push(e.message));
 try{
  await page.clock.install();await page.goto('http://127.0.0.1:'+server.address().port+'/v8-qa.html?region=home&count='+count);
  // Asset loading and the renderer need live animation frames. Freezing before
  // readiness leaves the scene unable to settle while the assertion waits.
  await page.waitForFunction(n=>{const d=window.HomeReleaseQA?.detail();return d?.world?.loaded&&!d.blocked&&d.actors.length===n;},count);
  await page.evaluate(()=>document.fonts.ready);
  await page.clock.pauseAt(new Date(await page.evaluate(()=>Date.now())+100));await page.clock.runFor(100);
  // Asset/font loading can outlast an idle timer. Drain any real greeting with
  // the controlled clock before the pointer scenario; polling alone cannot
  // expire it and the controller correctly rejects input while it is showing.
  await readyForInput(page);
  const inspect=()=>page.evaluate(()=>{const r=e=>e.getBoundingClientRect().toJSON(),frame=r(document.querySelector('.screen-frame'));return {frame,notice:r(document.getElementById('homeEventSlot')),comment:r(document.getElementById('homeCommentDock')),stage:r(document.getElementById('castStage')),buttons:[...document.querySelectorAll('#careActions>button')].map(e=>{const b=r(e),hit=document.elementFromPoint(b.x+b.width/2,b.y+b.height/2);return {...b,hit:hit===e||e.contains(hit)}}),actors:HomeReleaseQA.detail().actors};});
  const projection=()=>page.evaluate(()=>{const r=document.getElementById('castStage').getBoundingClientRect(),h=document.querySelector('.home-living-world').getBoundingClientRect();return {left:r.left-h.left,top:r.top-h.top,width:r.width,height:r.height,hostWidth:h.width};});
  const originalProjection=await projection();
  const initial=await inspect();record.initial=initial;assert.equal(initial.notice.height,42);assert.equal(initial.comment.height,76);assert.equal(initial.buttons.length,9);
  assert.deepEqual(Object.values(initial.buttons.reduce((a,b)=>(a[Math.round(b.y)]=(a[Math.round(b.y)]||0)+1,a),{})),[5,4]);assert.ok(initial.buttons.every(b=>b.hit&&b.width>=44&&b.height>=44));
  assert.ok(initial.actors.every(a=>a.safe));
  record.navigation=[];
  if(width>height){for(let i=0;i<count;i++){
   await page.getByRole('button',{name:'次の住民',exact:true}).click();await page.clock.runFor(20);
   const inspectNavigation=()=>page.evaluate(()=>{const label=document.getElementById('homeViewportNavigation').getAttribute('aria-label').replace(/を表示中$/,''),actor=[...document.querySelectorAll('[data-diorama-actor]')].find(e=>e.getAttribute('aria-label')===label),v=document.querySelector('.screen-frame').getBoundingClientRect(),r=actor?.getBoundingClientRect();return {label,key:actor?.dataset.dioramaActor,actorRect:r?.toJSON(),frameRect:v.toJSON(),full:r&&r.left>=v.left-1&&r.right<=v.right+1&&r.top>=v.top-1&&r.bottom<=v.bottom+1};});
   // Native scrolling/paint delivery is asynchronous in WebKit. Keep the
   // full-actor assertion, driving frames until the requested view is visible.
   let visible=await inspectNavigation();
   for(let elapsed=0;!visible.full&&elapsed<1000;elapsed+=50){await page.clock.runFor(50);visible=await inspectNavigation();}
   record.navigation.push(visible);const translated=await projection();for(const k of ['left','top','width','height','hostWidth'])assert.ok(Math.abs(translated[k]-originalProjection[k])<1,'scroll changed terrain projection '+k);assert.ok(visible.full,'navigation must reveal entire actor '+JSON.stringify(visible));
  }assert.equal(new Set(record.navigation.map(x=>x.key)).size,count);}
  // A real pointer gesture, with deterministic clock, not a call to QA.move.
  const actor=page.locator('[data-diorama-actor^="pet:"]');await readyForInput(page);
  // Keep walkable ground visible below the protagonist, even when the sprite
  // alone already fits at the edge of the scroll frame.
  await actor.evaluate(node=>node.scrollIntoView({block:'center',inline:'nearest',behavior:'instant'}));
  await page.clock.runFor(20);
  // The painted frame can extend beyond the controller's hitbox. Select a
  // physical point shared by both, then use a reachable navigation destination.
  const target=await page.evaluate(pointerTarget,'drag'),start=target.from;record.pointer=target;
  await page.mouse.click(start.x,start.y);record.selection=await page.evaluate(()=>({blockers:HomeReleaseQA.blockers(),trace:window.HomeReleaseInputTrace.slice(-12)}));assert.equal(await actor.getAttribute('aria-pressed'),'true');
  // The selection tap can start the real greeting asynchronously. Finish that
  // interaction before beginning the separate drag assertion; otherwise its
  // input blocker can correctly cancel an already accepted walking route.
  await readyForInput(page);
  const before=await page.evaluate(()=>HomeReleaseQA.detail().actors.find(a=>a.kind==='pet'));
  const end=target.to;
  await page.mouse.move(start.x,start.y);await page.mouse.down();await page.mouse.move(end.x,end.y,{steps:5});await page.mouse.up();await page.clock.runFor(500);
  // A greeting may begin while the accepted route is animating. Let the real
  // blocker expire and resume movement instead of freezing the paused world.
  if(await page.evaluate(()=>HomeReleaseQA.detail().blocked)){await readyForInput(page);await page.clock.runFor(500);}
  const after=await page.evaluate(()=>HomeReleaseQA.detail().actors.find(a=>a.kind==='pet'));record.drag={before,after};assert.ok(after.safe);assert.ok(Math.hypot(after.x-before.x,after.y-before.y)>1,'real drag must move actor');
  const shown=await actor.evaluate(e=>{const r=e.getBoundingClientRect(),v=document.querySelector('.screen-frame').getBoundingClientRect();return r.left>=v.left-1&&r.right<=v.right+1&&r.top>=v.top-1&&r.bottom<=v.bottom+1;});assert.ok(shown,'camera reveals moved actor');
  const text='きれいな景色を見て、しばらく立ちどまっていた。'.repeat(8);await page.evaluate(t=>HomeReleaseQA.commentCase('pet',t),text);await page.clock.runFor(50);
  const long=await inspect();assert.equal(long.comment.height,76);assert.deepEqual(long.frame,initial.frame,'comment cannot change viewport');assert.deepEqual(long.buttons,initial.buttons,'comment cannot move buttons');
  const overflow=await page.locator('#homeCommentDock').evaluate(e=>({range:e.scrollHeight-e.clientHeight,text:e.textContent}));assert.ok(overflow.range>0&&overflow.text.includes(text));
  await page.locator('#homeCommentDock').evaluate(e=>{e.scrollTop=e.scrollHeight;});assert.ok(await page.locator('#homeCommentDock').evaluate(e=>e.scrollTop>0));
  // Rotate the same live scene and return, preserving stage dimensions and
  // unchanged fixed portrait geometry after the viewport event settles.
  // Resize events are delivered by the browser; let polling advance until the
  // real viewport handler has consumed both orientations before measuring.
  await page.clock.resume();
  await page.setViewportSize({width:height,height:width});await page.clock.runFor(100);
  await page.waitForFunction(([w,h])=>innerWidth===w&&innerHeight===h&&Number.parseFloat(document.documentElement.style.getPropertyValue('--app-height'))===Math.round(visualViewport?.height||innerHeight),[height,width],{polling:100});
  await page.setViewportSize({width,height});await page.clock.runFor(100);
  await page.waitForFunction(([w,h])=>innerWidth===w&&innerHeight===h&&Number.parseFloat(document.documentElement.style.getPropertyValue('--app-height'))===Math.round(visualViewport?.height||innerHeight),[width,height],{polling:100});
  await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));const returned=await inspect();assert.equal(returned.stage.width,initial.stage.width);assert.equal(returned.stage.height,initial.stage.height);assert.deepEqual(returned.frame,initial.frame);assert.equal(returned.comment.height,76);
  await page.screenshot({path:path.join(out,`${engine}-${width}x${height}-${count}.png`)});record.status='passed';
 }catch(e){record.status='failed';record.error=e.stack;failed=true;await page.screenshot({path:path.join(out,`${engine}-${width}x${height}-${count}-failed.png`)}).catch(()=>{});}finally{await page.close();fs.writeFileSync(path.join(out,engine+'.json'),JSON.stringify({records,errors},null,2));}
}
}finally{await browser.close();}}
}finally{server.close();}assert.equal(errors.length,0,errors.join('\n'));assert.equal(failed,false,'V8 browser cases failed; see artifacts');})().catch(e=>{console.error(e);process.exitCode=1;server.close();});
