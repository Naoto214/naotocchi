// Run in GitHub Actions with Chromium/WebKit. Desktop WebKit is not an iPhone.
const fs=require('fs'),path=require('path'),http=require('http'),assert=require('node:assert/strict');
const out=path.resolve(process.argv[2]),baseSource=path.resolve(process.argv[3]),dest=path.resolve(process.env.F2J3_OUTPUT||'test-results/f2j3');
fs.mkdirSync(dest,{recursive:true});
const mime={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.webp':'image/webp','.svg':'image/svg+xml','.woff2':'font/woff2'};
const server=http.createServer((req,res)=>{const p=decodeURIComponent(new URL(req.url,'http://local').pathname),f=path.resolve(out,'.'+(p==='/'?'/index.html':p));if(!f.startsWith(out+'/')||!fs.existsSync(f)||!fs.statSync(f).isFile()){res.writeHead(404).end();return;}res.setHeader('Content-Type',mime[path.extname(f)]||'application/octet-stream');fs.createReadStream(f).pipe(res);});
const results=[],errors=[];const write=()=>fs.writeFileSync(path.join(dest,'results.json'),JSON.stringify({results,errors},null,2));
(async()=>{await new Promise(r=>server.listen(0,'127.0.0.1',r));const url='http://127.0.0.1:'+server.address().port;
try{for(const engine of (process.env.F2J3_ENGINE||'chromium,webkit').split(',')){
 const browser=await require('playwright')[engine].launch({headless:true});
 try{
 for(const scene of ['forest-current','forest-f2','jungle-current','jungle-j3'])for(const width of [320,375,390,430])for(const count of [1,6,28]){
  const page=await browser.newPage({viewport:{width,height:844},reducedMotion:'reduce'});const row={engine,scene,width,count};results.push(row);
  page.on('pageerror',e=>errors.push({scene,width,count,message:e.message}));
  try{
   await page.goto(url+'/play.html?scene='+scene+'&count='+count);
   await page.waitForFunction(c=>{const d=window.HomeReleaseQA?.detail();return d&&!d.blocked&&d.world?.loaded&&d.actors.length===c&&d.actors.every(a=>a.safe);},count,{timeout:40000});
   const d=await page.evaluate(()=>HomeReleaseQA.detail());
   assert.equal(d.world.candidate,scene==='forest-current'?'forest-waterfall':scene==='jungle-current'?'jungle':scene);
   assert.ok(d.actors.every(a=>a.safe));
   assert.equal(Math.round(d.slots.notice),42);assert.equal(Math.round(d.slots.speech),76);
   assert.equal(await page.locator('#careActions button').count(),9);
   row.ground=true;row.candidate=d.world.candidate;
   if(width===390)await page.screenshot({path:path.join(dest,`${scene}-${count}.png`),fullPage:true});
   row.exit=await page.evaluate(()=>HomeReleaseQA.move());assert.ok(row.exit,'protagonist safe exit');
   // Finish the model route before changing dimensions; movement rules untouched.
   await page.evaluate(()=>{for(let i=0;i<250;i++)F2J3QA.model.step(.1,{blocked:false,reducedMotion:true});});
   await page.setViewportSize({width:844,height:width});
   await page.waitForFunction(()=>{const s=document.getElementById('castStage').getBoundingClientRect(),d=HomeReleaseQA.detail();return s.width>400&&d.actors.every(a=>a.safe);},null,{timeout:10000});
   row.rotation=true;
   await page.setViewportSize({width,height:844});
   await page.waitForFunction(w=>{const s=document.getElementById('castStage').getBoundingClientRect(),d=HomeReleaseQA.detail();return s.width<=w&&d.actors.every(a=>a.safe);},width,{timeout:10000});
   if(width===390&&['forest-f2','jungle-j3'].includes(scene)){
    for(const kind of ['tap','drag']){
     await page.reload();await page.waitForFunction(()=>{const d=window.HomeReleaseQA?.detail();return d&&!d.blocked&&d.world?.loaded&&d.actors.every(a=>a.safe);},null,{timeout:40000});
     const t=await page.evaluate(require(path.join(baseSource,'tests/helpers/home-production-pointer-target.cjs')),kind);
     await page.mouse.click(t.from.x,t.from.y);
     if(kind==='tap')await page.mouse.click(t.to.x,t.to.y);else{await page.mouse.move(t.from.x,t.from.y);await page.mouse.down();await page.mouse.move(t.to.x,t.to.y,{steps:8});await page.mouse.up();}
     await page.waitForFunction(()=>HomeReleaseInputTrace.some(t=>t.type==='move'&&t.result),null,{timeout:10000});
     assert.ok(await page.evaluate(()=>HomeReleaseQA.detail().actors.every(a=>a.safe)));
     row[kind]=true;
    }
    row.autonomy=await page.evaluate(()=>{const model=F2J3QA.model;model.cancel();for(let i=0;i<1200;i++)model.step(.1,{blocked:false,reducedMotion:false});return {metrics:model.metrics(),safe:HomeReleaseQA.detail().actors.every(a=>a.safe)};});
    assert.ok(row.autonomy.safe);assert.ok(row.autonomy.metrics.distance>0);
   }
   row.status='passed';
  }catch(e){row.status='failed';row.error=e.stack;await page.screenshot({path:path.join(dest,`FAIL-${scene}-${width}-${count}.png`),fullPage:true}).catch(()=>{});throw e;}
  finally{write();await page.close();}
 }
 // Gallery must not create games or load missing files.
 const g=await browser.newPage();await g.goto(url);assert.equal(await g.locator('iframe').count(),0);assert.equal(await g.locator('article').count(),4);await g.close();
 }finally{await browser.close();}
}assert.equal(errors.length,0);console.log('F2J3 browser results',results.length,'passed');}finally{write();server.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
