// Closing the gesture guide must preserve settled terrain and actor geometry.
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const root=path.resolve(process.argv[2]),output=path.resolve('test-results/home-production-guide');
fs.mkdirSync(output,{recursive:true});
const mime={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.webp':'image/webp','.svg':'image/svg+xml'};
const server=http.createServer((req,res)=>{const file=path.resolve(root,'.'+new URL(req.url,'http://localhost').pathname);if(!file.startsWith(root+'/')||!fs.existsSync(file)){res.writeHead(404).end();return;}res.setHeader('Content-Type',mime[path.extname(file)]||'application/octet-stream');fs.createReadStream(file).pipe(res);});
(async()=>{await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const results=[];
try{for(const engine of (process.env.HOME_LAYOUT_ENGINES||'chromium,webkit').split(',')){
 const browser=await require('playwright')[engine].launch();
 try{for(const [width,height]of [[320,568],[375,667],[390,844],[430,932],[667,375]])for(const count of [1,6,28]){
  const page=await browser.newPage({viewport:{width,height},reducedMotion:'reduce'});
  try{
   await page.goto(`http://127.0.0.1:${server.address().port}/release-qa.html`);
   await page.waitForFunction(()=>window.HomeReleaseQA);
   await page.evaluate(count=>HomeReleaseQA.scene('home',count),count);
   await page.waitForFunction(count=>{const d=HomeReleaseQA.detail();return !d.blocked&&d.world?.loaded&&d.actors.length===count;},count);
   await page.locator('#homeGuideDismissBtn').scrollIntoViewIfNeeded();
   await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
   const inspect=()=>page.evaluate(()=>{const d=HomeReleaseQA.detail();return {stage:d.slots.castStage,actors:d.actors.map(a=>({key:a.key,x:a.x,y:a.y,w:a.w,h:a.h,ground:a.ground})),notice:d.slots.notice,speech:d.slots.speech};});
   const before=await inspect();await page.locator('#homeGuideDismissBtn').click();await page.waitForTimeout(250);
   const after=await inspect();results.push({engine,width,height,count,before,after});
   fs.writeFileSync(path.join(output,'report.json'),JSON.stringify(results,null,2));
   assert.equal(await page.locator('#homeGuideDismissBtn').isVisible(),false,'dismissed guide stays hidden');
   assert.equal(after.stage.height,before.stage.height,'closing guide must not resize terrain');
   assert.equal(after.stage.y,before.stage.y,'closing guide must not translate terrain');
   assert.deepEqual(after.actors,before.actors,'closing guide preserves character and ground coordinates');
   assert.equal(after.notice,42);assert.equal(after.speech,76);
  }finally{await page.close();}
 }}finally{await browser.close();}
}console.log('PASS guide dismissal stability',results.length);
}finally{server.close();}})().catch(error=>{console.error(error);process.exitCode=1;});
