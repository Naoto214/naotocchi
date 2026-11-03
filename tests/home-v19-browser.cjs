// CI runs both engines. Local managed preview uses the identical browser-check UI.
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),http=require('node:http');
const {execFileSync}=require('node:child_process'),assert=require('node:assert/strict');
if(!process.env.CI)throw new Error('Use the managed Sites preview and v19-qa.html locally; this runner is for CI.');
const output=path.resolve('test-results/home-layout/v19');fs.mkdirSync(output,{recursive:true});
const root=fs.mkdtempSync(path.join(os.tmpdir(),'home-v19-'));
execFileSync('python',['tools/pages/package.py','--out',root,'--report',path.join(output,'package.json')],{stdio:'inherit'});
execFileSync(process.execPath,['tools/home-v19-qa.cjs',root],{stdio:'inherit'});
const mime={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.webp':'image/webp','.svg':'image/svg+xml','.woff2':'font/woff2'};
const server=http.createServer((req,res)=>{const file=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));if(!file.startsWith(root+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404).end();return;}res.setHeader('Content-Type',mime[path.extname(file)]||'application/octet-stream');fs.createReadStream(file).pipe(res);});
(async()=>{await new Promise(r=>server.listen(0,'127.0.0.1',r));const {chromium,webkit}=require('playwright');try{
 for(const [name,engine]of Object.entries({chromium,webkit})){const browser=await engine.launch({headless:true});try{const page=await browser.newPage({viewport:{width:1000,height:1100}});
 await page.goto(`http://127.0.0.1:${server.address().port}/home-v19-qa.html`);await page.frameLocator('#game').locator('[data-diorama-actor]').first().waitFor();
 await page.getByRole('button',{name:'全幅検証',exact:true}).click();// Bound each case independently and retain diagnostics if a case stalls.
 for(let completed=1;completed<=24;completed++)await page.waitForFunction(n=>Number(document.getElementById('run').dataset.completed)>=n,completed,{timeout:60000});
 await page.locator('#rawReport').waitFor({state:'attached',timeout:60000});
 const report=JSON.parse(await page.locator('#rawReport').textContent());fs.writeFileSync(path.join(output,name+'.json'),JSON.stringify(report,null,2));
 for(const count of ['6','28'])for(const region of ['forest','river_lake','city']){
  await page.locator('#width').selectOption('390');await page.locator('#count').selectOption(count);await page.locator('#region').selectOption(region);await page.locator('#apply').click();await page.waitForTimeout(2500);
  await page.locator('#game').screenshot({path:path.join(output,name+'-'+region+'-'+count+'.png')});
 }
 assert.equal(report.rows.length,24);assert.deepEqual(report.errors,[],name+' scenery errors');
 // Preserve the known baseline as a separate metric, reject any larger displacement.
 assert.ok(report.rotations.every(r=>Math.abs(r.dy)<=6&&r.noticeHeight===42&&r.speechHeight===76),name+' worsened baseline rotation');
 }finally{await browser.close();}}
 }finally{await new Promise(r=>server.close(r));fs.rmSync(root,{recursive:true,force:true});}})().catch(e=>{console.error(e);process.exitCode=1;});
