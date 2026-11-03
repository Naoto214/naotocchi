// V11 UI regression; the V8 matrix remains intact and runs first in CI.
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const root=path.resolve(process.argv[2]),out=path.resolve('test-results/home-viewport-v11');fs.mkdirSync(out,{recursive:true});
const server=http.createServer((req,res)=>{const p=path.resolve(root,'.'+new URL(req.url,'http://localhost').pathname);if(!p.startsWith(root+'/')||!fs.existsSync(p)||!fs.statSync(p).isFile())return res.writeHead(404).end();res.setHeader('Content-Type',({'.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.html':'text/html','.png':'image/png','.webp':'image/webp','.svg':'image/svg+xml'})[path.extname(p)]||'application/octet-stream');fs.createReadStream(p).pipe(res);});
(async()=>{await new Promise(r=>server.listen(0,'127.0.0.1',r));const records=[],errors=[];let failed=false;
try{for(const engine of (process.env.HOME_LAYOUT_ENGINES||'webkit').split(',')){
 const browser=await require('playwright')[engine].launch();try{
 for(const [width,height]of [[320,568],[375,667],[390,664],[430,740],[568,320],[844,280]])for(const count of [1,28]){
  if(process.env.HOME_V11_FOCUS && (width!==375||count!==28))continue;
  const page=await browser.newPage({viewport:{width,height},hasTouch:true,reducedMotion:'reduce'}),record={engine,width,height,count};records.push(record);page.on('pageerror',e=>errors.push(e.message));
  try{
   // This runner has no audio device; exercise the browser's supported no-WebAudio fallback.
   await page.addInitScript(()=>{window.AudioContext=undefined;window.webkitAudioContext=undefined;});
   await page.goto(`http://127.0.0.1:${server.address().port}/v11-qa.html?region=home&count=${count}`);
   await page.waitForFunction(()=>document.body.dataset.homeViewportV8==='true'&&HomeReleaseQA.detail().world?.loaded);
   const inspect=()=>page.evaluate(()=>{const r=e=>e.getBoundingClientRect().toJSON(),ids=['homeEventSlot','homeCommentDock','homeInformation','careActions'];return {height:visualViewport.height,scroll:document.documentElement.scrollHeight,rects:Object.fromEntries(ids.map(id=>[id,r(document.getElementById(id))])),frame:r(document.querySelector('.screen-frame')),meters:r(document.querySelector('.home-meters')),stage:r(document.getElementById('castStage')),buttons:[...document.querySelectorAll('#careActions>button')].map(e=>{const b=r(e),hit=document.elementFromPoint(b.x+b.width/2,b.y+b.height/2);return {...b,hit:hit===e||e.contains(hit)}})};});
   const initial=await inspect();record.initial=initial;
   if(width<height){
    const meterVisibility=await page.locator('.home-meters .bar-value').evaluateAll(nodes=>nodes.map(e=>{const r=e.getBoundingClientRect(),hit=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return {id:e.id,visible:!!hit&&(hit===e||e.contains(hit))};}));
    assert.equal(meterVisibility.length,9);assert.ok(meterVisibility.every(x=>x.visible),JSON.stringify(meterVisibility));
    assert.equal(await page.locator('.home-meters').evaluate(e=>e.parentElement.id),'device');
   }
   if(count===1)assert.equal(await page.locator('.diorama-selected-label').isVisible(),false);

   assert.equal(initial.rects.homeEventSlot.height,42);assert.equal(initial.rects.homeCommentDock.height,76);
   assert.ok(initial.buttons.every(b=>b.hit&&b.bottom<=height+1));assert.equal(initial.buttons.length,9);
   assert.ok(initial.rects.homeCommentDock.bottom<=initial.rects.careActions.top);
   assert.ok(initial.scroll<=height+1,'document must not scroll');
   if(width<height){assert.ok(initial.frame.bottom<=initial.rects.homeCommentDock.top+1);assert.ok(initial.rects.homeCommentDock.bottom<=initial.meters.top+1 && initial.meters.bottom<=initial.rects.careActions.top+1);assert.ok(initial.rects.homeInformation.bottom<=initial.frame.top+1);}
   else assert.ok(initial.frame.right<=initial.rects.careActions.left);
   const settle=()=>page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
   const style=selector=>page.locator(selector).evaluate(e=>{const s=getComputedStyle(e),r=e.getBoundingClientRect(),p=e.parentElement.getBoundingClientRect();return {bg:s.backgroundColor,w:r.width,h:r.height,cx:r.x+r.width/2,pcx:p.x+p.width/2,display:s.display};});
   await page.evaluate(()=>{HomeReleaseQA.resetDisplay();HomeReleaseQA.commentCase('pet','うれしいな');});await settle();
   const short=await style('#speechBubble');assert.ok(short.w<initial.rects.homeCommentDock.width);assert.ok(Math.abs(short.cx-short.pcx)<1,'lower centered');
   const top=await style('#message');assert.ok(Math.abs(top.cx-top.pcx)<1,'upper centered');assert.equal(top.bg,short.bg);assert.equal(await page.locator('.home-meters').evaluate(e=>getComputedStyle(e).backgroundColor),'rgba(0, 0, 0, 0)');
   await page.evaluate(()=>{HomeReleaseQA.resetDisplay();HomeReleaseQA.commentCase('pet','物語のひとこと','',true);});await settle();
   assert.equal((await style('#speechBubble')).bg,short.bg);assert.equal(await page.locator('#storyFlash').isVisible(),false);
   await page.evaluate(()=>{HomeReleaseQA.resetDisplay();HomeReleaseQA.commentCase('pet','きれいな景色を見て、しばらく立ちどまっていた。'.repeat(8));});await settle();
   assert.equal((await inspect()).rects.homeCommentDock.height,76);assert.deepEqual((await inspect()).frame,initial.frame);
   await page.evaluate(()=>HomeReleaseQA.questionOverlap());
   await page.waitForFunction(()=>!document.getElementById('speechChoices').classList.contains('hidden'));
   const choices=await page.locator('#speechChoices').boundingBox(),dock=await page.locator('#homeCommentDock').boundingBox();
   assert.ok(choices.y+choices.height<=dock.y-3,'choices above comment');assert.ok(choices.y>=0);assert.deepEqual((await inspect()).frame,initial.frame);
   await page.locator('#speechChoices button').first().click();assert.equal(await page.locator('#speechChoices').isVisible(),false);
   await page.evaluate(()=>HomeReleaseQA.resetDisplay());
   const selected=()=>page.evaluate(()=>{const f=document.querySelector('.screen-frame').getBoundingClientRect(),a=document.querySelector('[data-diorama-selected="true"]')||document.querySelector('[data-diorama-actor^="pet:"]'),r=a.getBoundingClientRect();return {key:a.dataset.dioramaActor,visible:r.bottom>f.top&&r.top<f.bottom&&r.right>f.left&&r.left<f.right,rect:r.toJSON()};});
   await page.evaluate(()=>{const f=document.querySelector('.screen-frame');f.dispatchEvent(new WheelEvent('wheel',{bubbles:true}));f.scrollTop=0;});await page.waitForTimeout(1250);assert.ok((await selected()).visible,'recover after scroll');
   if(width>height){await page.locator('#homeViewportNavigation button').last().click();await page.waitForTimeout(100);}
   if(width===375 && count===28){
    record.inputs=[];
    for(const kind of ['tap','drag']){
     await page.reload();await page.waitForFunction(()=>window.HomeReleaseQA&&HomeReleaseQA.detail().world?.loaded);
     await page.evaluate(()=>HomeReleaseQA.resetDisplay());await page.waitForTimeout(150);
     const t=await page.evaluate(require('./helpers/home-production-pointer-target.cjs'),kind);
     if(kind==='tap'){await page.mouse.click(t.from.x,t.from.y);await page.mouse.click(t.to.x,t.to.y);}
     else{await page.mouse.move(t.from.x,t.from.y);await page.mouse.down();await page.mouse.move(t.to.x,t.to.y,{steps:8});await page.mouse.up();}
     await page.waitForFunction(source=>HomeReleaseInputTrace.some(t=>t.type==='move'&&t.result&&t.args[2]===source),kind==='tap'?'ground':'drag',{timeout:5000});
     assert.equal(await page.locator('.diorama-selected-label').isVisible(),true,'selected name visible in multi-actor scene');
     record.inputs.push({kind,trace:await page.evaluate(()=>HomeReleaseInputTrace.filter(t=>t.type==='move'||t.type==='select'))});
    }
    await page.setViewportSize({width:667,height:375});await page.waitForTimeout(300);assert.ok((await selected()).visible,'rotation preserves selected actor');
    await page.evaluate(()=>HomeReleaseQA.resetDisplay());
    const keys=await page.locator('[data-diorama-actor]').evaluateAll(ns=>ns.map(n=>n.dataset.dioramaActor));assert.equal(keys.length,28);
    const visited=new Set();
    for(let i=0;i<keys.length;i++){
     await page.locator('#homeViewportNavigation button').last().click();await page.waitForTimeout(40);
     const shown=await page.evaluate(()=>{const label=document.getElementById('homeViewportNavigation').getAttribute('aria-label').replace(/を表示中$/,'');const node=[...document.querySelectorAll('[data-diorama-actor]')].find(n=>n.getAttribute('aria-label')===label);if(!node)return {label};const a=node.getBoundingClientRect(),f=document.querySelector('.screen-frame').getBoundingClientRect();return {key:node.dataset.dioramaActor,visible:a.bottom>f.top&&a.top<f.bottom&&a.right>f.left&&a.left<f.right,a:a.toJSON(),f:f.toJSON()};});
     assert.ok(shown.visible,'browse actor '+JSON.stringify(shown));visited.add(shown.key);
    }
    assert.equal(visited.size,28,'all actors can be brought into the viewport');
    record.browsedActors=keys.length;
    // Physical actor selection starts the follow timer. Check beyond the old six-second cutoff.
    const a=await selected();const f=await page.locator('.screen-frame').boundingBox();
    await page.mouse.click(Math.max(f.x+2,Math.min(f.x+f.width-2,a.rect.x+a.rect.width/2)),Math.max(f.y+2,Math.min(f.y+f.height-2,a.rect.y+a.rect.height/2)));
    await page.waitForTimeout(6500);assert.ok((await selected()).visible,'selected actor remains visible after landscape follow deadline');
    await page.setViewportSize({width,height});await page.waitForTimeout(300);assert.ok((await selected()).visible,'return to portrait');
   }
   record.final=await inspect();record.selected=await selected();record.status='passed';
   await page.screenshot({path:path.join(out,`${engine}-${width}x${height}-${count}.png`)});record.status='passed';
  }catch(e){record.status='failed';record.error=e.stack;failed=true;await page.screenshot({path:path.join(out,`${engine}-${width}x${height}-${count}-failed.png`)}).catch(()=>{});}
  finally{await page.close();fs.writeFileSync(path.join(out,engine+'.json'),JSON.stringify({records,errors},null,2));}
 }
 }finally{await browser.close();}
}}finally{server.close();}assert.equal(errors.length,0,errors.join('\n'));assert.equal(failed,false,'V11 failures: see artifacts');})().catch(e=>{console.error(e);process.exitCode=1;server.close();});
