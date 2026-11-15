// Comparison bootstrap regression: delay the real viewport script, call the
// early diagnostic API, then verify readiness and a rapid reload.
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const pw=require('/opt/codex/runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const dist=path.resolve(process.env.V5_PREVIEW_DIST||'/tmp/v5-runtime'),repo=path.resolve(__dirname,'../..');
const mime={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.json':'application/json','.woff2':'font/woff2','.png':'image/png','.webp':'image/webp'};
const records=[],errors=[],requests=[];let passed=false;
const server=http.createServer((req,res)=>{const file=path.join(dist,new URL(req.url,'http://localhost').pathname);if(!fs.existsSync(file)||!fs.statSync(file).isFile())return res.writeHead(404).end();res.setHeader('Content-Type',mime[path.extname(file)]||'application/octet-stream');fs.createReadStream(file).pipe(res);});
async function ready(page){await page.waitForFunction(()=>window.MovementV5Ready);await page.evaluate(()=>window.MovementV5Ready);return page.evaluate(()=>{const d=MovementQA.detail();return {pending:!!d.pending,presentation:!!d.presentation,count:d.actors.length,width:innerWidth,paused:window.__movementPaused};});}
(async()=>{await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const browser=await pw.chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox']});try{
 for(const [version,width]of [['a',320],['c',375],['d',390],['e',430]]){
  const page=await browser.newPage({viewport:{width,height:{320:568,375:812,390:844,430:932}[width]},isMobile:true,hasTouch:true});
  page.on('pageerror',error=>errors.push({version,error:String(error)}));page.on('response',response=>{if(response.status()>=400&&!response.url().endsWith('/favicon.ico'))requests.push({version,status:response.status(),url:response.url()});});
  await page.addInitScript(({version,seed})=>localStorage.setItem('naotocchi-movement-v5-'+version,JSON.stringify(seed)),{version,seed:JSON.parse(fs.readFileSync(path.join(dist,'game/release-qa-seed.json')))});
  let release,delayed=false;const gate=new Promise(resolve=>release=resolve);
  await page.route('**/home-production-touch.js*',async route=>{if(!delayed){delayed=true;await gate;}await route.continue();});
  try{
   await page.goto(`http://127.0.0.1:${server.address().port}/game/${version}/movement-${version==='a'?'a':'b'}.html?freeze=1&itemId=poop1`,{waitUntil:'commit'});
   await page.waitForFunction(()=>window.MovementQA);
   const early=await page.evaluate(()=>({viewportAPI:!!window.NaotocchiHomeViewport,detail:MovementQA.detail()}));
   assert.equal(early.viewportAPI,false,'viewport asset deliberately held');assert.equal(early.detail.pending,true,'early detail is pending, not an exception');
   release();const first=await ready(page);assert.ok(first.presentation&&!first.pending);assert.equal(first.count,4);assert.equal(first.width,width);assert.equal(first.paused,true);
   await page.reload({waitUntil:'domcontentloaded'});const reloaded=await ready(page);assert.ok(reloaded.presentation&&!reloaded.pending);assert.equal(reloaded.count,4);
   records.push({version,width,early,first,reloaded});console.log('startup passed '+version+' '+width);
  }finally{release();await page.close();}
 }
 assert.deepEqual(errors,[]);assert.deepEqual(requests,[]);passed=true;
 }finally{fs.writeFileSync(path.join(repo,'docs/qa/home-movement-v5/preview-startup-validation.json'),JSON.stringify({passed,createdAt:new Date().toISOString(),runtime:dist,build:JSON.parse(fs.readFileSync(path.join(dist,'build.json'))),method:'Four variants at 320/375/390/430px respectively. Viewport script delayed until the early diagnostic call, then normal readiness and one rapid reload.',records,errors,requests},null,2));await browser.close();server.close();}
})().catch(error=>{console.error(error);process.exitCode=1;server.close();});
