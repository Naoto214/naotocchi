// V10 UI regression; the V8 matrix remains intact and runs first in CI.
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const root=path.resolve(process.argv[2]),out=path.resolve('test-results/home-viewport-v10');fs.mkdirSync(out,{recursive:true});
const server=http.createServer((req,res)=>{const p=path.resolve(root,'.'+new URL(req.url,'http://localhost').pathname);if(!p.startsWith(root+'/')||!fs.existsSync(p)||!fs.statSync(p).isFile())return res.writeHead(404).end();res.setHeader('Content-Type',({'.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.html':'text/html','.png':'image/png','.webp':'image/webp','.svg':'image/svg+xml'})[path.extname(p)]||'application/octet-stream');fs.createReadStream(p).pipe(res);});
(async()=>{await new Promise(r=>server.listen(0,'127.0.0.1',r));const records=[],errors=[];let failed=false;
try{for(const engine of (process.env.HOME_LAYOUT_ENGINES||'chromium,webkit').split(',')){
 const browser=await require('playwright')[engine].launch();try{
 for(const [width,height]of [[320,568],[375,667],[390,664],[430,740],[568,320],[844,280]])for(const count of [1,6,28]){
  const page=await browser.newPage({viewport:{width,height},hasTouch:true,reducedMotion:'reduce'}),record={engine,width,height,count};records.push(record);page.on('pageerror',e=>errors.push(e.message));
  try{
   await page.goto(`http://127.0.0.1:${server.address().port}/v10-qa.html?region=home&count=${count}`);
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
   await page.evaluate(()=>HomeReleaseQA.overlap());
   const visible=()=>page.evaluate(()=>[...document.querySelectorAll('#homeCommentDock>#speechBubble,#homeCommentDock>#homeActionComment,#homeCommentDock>#homeChoiceResult,#homeCommentDock>#storyFlash')].filter(e=>getComputedStyle(e).display!=='none'&&e.getBoundingClientRect().height>0).map(e=>e.id));
   assert.deepEqual(await visible(),['storyFlash']);
   assert.equal(await page.locator('#homeEventSlot>#homeActionComment').isVisible(),true);
   await page.evaluate(()=>HomeReleaseQA.choiceReply());assert.ok((await visible()).length<=1);
   assert.equal(await page.locator('#homeEventSlot>#homeChoiceResult').isVisible(),true);
   const reply=await page.locator('#homeChoiceResult').boundingBox(),dock=await page.locator('#homeCommentDock').boundingBox();assert.ok(reply.y+reply.height<=initial.rects.homeEventSlot.bottom+1);assert.ok(reply.width<initial.rects.homeEventSlot.width);
   await page.evaluate(()=>HomeReleaseQA.commentCase('pet','きれいな景色を見て、しばらく立ちどまっていた。'.repeat(8)));
   // Clear the explicit reply without changing the source timers for the long-text sample.
   await page.waitForTimeout(5100);
   const after=await inspect();assert.deepEqual(after.frame,initial.frame);assert.deepEqual(after.rects.careActions,initial.rects.careActions);assert.equal(after.rects.homeCommentDock.height,76);
   record.visible=await visible();assert.ok(record.visible.length<=1);
   await page.evaluate(()=>HomeReleaseQA.questionOverlap());
   assert.equal(await page.locator('#speechChoices').isVisible(),true);assert.deepEqual(await visible(),['speechBubble']);
   await page.screenshot({path:path.join(out,`${engine}-${width}x${height}-${count}.png`)});record.status='passed';
  }catch(e){record.status='failed';record.error=e.stack;failed=true;await page.screenshot({path:path.join(out,`${engine}-${width}x${height}-${count}-failed.png`)}).catch(()=>{});}
  finally{await page.close();fs.writeFileSync(path.join(out,engine+'.json'),JSON.stringify({records,errors},null,2));}
 }
 }finally{await browser.close();}
}}finally{server.close();}assert.equal(errors.length,0,errors.join('\n'));assert.equal(failed,false,'V10 failures: see artifacts');})().catch(e=>{console.error(e);process.exitCode=1;server.close();});
