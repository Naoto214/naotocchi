// CI runs both engines. Local managed preview uses the identical browser-check UI.
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),http=require('node:http');
const {execFileSync}=require('node:child_process'),assert=require('node:assert/strict');
if(!process.env.CI)throw new Error('Use the managed Sites preview and v22-qa.html locally; this runner is for CI.');
const region=process.env.HOME_V22_REGION||'forest';
const output=path.resolve('test-results/home-layout/v22/'+region);fs.mkdirSync(output,{recursive:true});
const root=fs.mkdtempSync(path.join(os.tmpdir(),'home-v22-'));
execFileSync('python',['tools/pages/package.py','--out',root,'--report',path.join(output,'package.json')],{stdio:'inherit'});
execFileSync(process.execPath,['tools/home-v22-qa.cjs',root],{stdio:'inherit'});
const mime={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.webp':'image/webp','.svg':'image/svg+xml','.woff2':'font/woff2'};
const server=http.createServer((req,res)=>{const file=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));if(!file.startsWith(root+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404).end();return;}res.setHeader('Content-Type',mime[path.extname(file)]||'application/octet-stream');fs.createReadStream(file).pipe(res);});
(async()=>{await new Promise(r=>server.listen(0,'127.0.0.1',r));const {chromium,webkit}=require('playwright');try{
 for(const [name,engine]of Object.entries({chromium,webkit})){const browser=await engine.launch({headless:true});try{const page=await browser.newPage({viewport:{width:1000,height:1100}});
 await page.goto(`http://127.0.0.1:${server.address().port}/home-v22-qa.html?region=${region}`);await page.frameLocator('#game').locator('[data-diorama-actor]').first().waitFor();
 await page.getByRole('button',{name:'全幅検証',exact:true}).click();// Bound each case independently and retain diagnostics if a case stalls.
 for(let completed=1;completed<=24;completed++)await page.waitForFunction(n=>Number(document.getElementById('run').dataset.completed)>=n,completed,{timeout:60000});
 await page.locator('#rawReport').waitFor({state:'attached',timeout:60000});
 const report=JSON.parse(await page.locator('#rawReport').textContent());fs.writeFileSync(path.join(output,name+'.json'),JSON.stringify(report,null,2));
 for(const width of ['320','375','390','430'])for(const time of ['day','night'])for(const count of ['1','6','28'])for(const selectedRegion of [region]){
  await page.locator('#width').selectOption(width);await page.locator('#time').selectOption(time);await page.locator('#count').selectOption(count);await page.locator('#region').selectOption(region);await page.locator('#apply').click();await page.locator('#apply:enabled').waitFor();await page.waitForTimeout(500);
  await page.locator('#game').screenshot({path:path.join(output,name+'-'+region+'-'+width+'-'+time+'-'+count+'.png')});
 }
 await page.emulateMedia({reducedMotion:'reduce'});await page.locator('#apply').click();await page.waitForTimeout(1800);
 const game=page.frames().find(f=>f.url().includes('qa-v22-game.html'));
 const reduced=await game.evaluate(()=>({reduced:matchMedia('(prefers-reduced-motion: reduce)').matches,actors:HomeV22QA.detail().actors}));assert.equal(reduced.reduced,true);assert.ok(reduced.actors.every(a=>a.safe));
 const freezeBefore=await game.evaluate(()=>HomeV22QA.environment());await page.waitForTimeout(600);const freezeAfter=await game.evaluate(()=>HomeV22QA.environment());assert.equal(freezeAfter.animationTime,freezeBefore.animationTime,'reduced motion freezes environment clock');
 const saved=await game.evaluate(()=>HomeV22QA.save());await game.goto(game.url());await game.waitForFunction(()=>window.HomeV22QA);const loaded=await game.evaluate(()=>HomeV22QA.loaded());assert.deepEqual(loaded,saved);
 const productionKeys=await page.evaluate(()=>Object.keys(localStorage).filter(k=>k.startsWith('naotocchi-save-v1')));assert.deepEqual(productionKeys,[]);
 const resumeBefore=await game.evaluate(()=>HomeV22QA.detail());await page.goto('about:blank');await page.goto(`http://127.0.0.1:${server.address().port}/home-v22-qa.html?region=${region}`);await page.frameLocator('#game').locator('[data-diorama-actor]').first().waitFor();
 fs.writeFileSync(path.join(output,name+'-lifecycle.json'),JSON.stringify({reduced,freezeBefore,freezeAfter,saved,loaded,productionKeys,resumeBefore,osSuspension:'not measured; navigation/reload only'},null,2));
 assert.equal(report.rows.length,24);assert.deepEqual(report.errors,[],name+' scenery errors');
 // Candidate must eliminate the old six-pixel rotation displacement.
 assert.ok(report.rotations.every(r=>Math.abs(r.dy)<=1&&r.noticeHeight===42&&r.speechHeight===76),name+' strict rotation');
 }finally{await browser.close();}}
 }finally{await new Promise(r=>server.close(r));fs.rmSync(root,{recursive:true,force:true});}})().catch(e=>{console.error(e);process.exitCode=1;});
