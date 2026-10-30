// CI runs both engines. Local managed preview uses the identical browser-check UI.
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),http=require('node:http');
const {execFileSync}=require('node:child_process'),assert=require('node:assert/strict');
if(!process.env.CI)throw new Error('Use the managed Sites preview and v18-qa.html locally; this runner is for CI.');
const output=path.resolve('test-results/home-layout/v18');fs.mkdirSync(output,{recursive:true});
const root=fs.mkdtempSync(path.join(os.tmpdir(),'home-v18-'));
execFileSync('python',['tools/pages/package.py','--out',root,'--report',path.join(output,'package.json')],{stdio:'inherit'});
execFileSync(process.execPath,['tools/home-v18-qa.cjs',root],{stdio:'inherit'});
const mime={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.webp':'image/webp','.svg':'image/svg+xml','.woff2':'font/woff2'};
const server=http.createServer((req,res)=>{const file=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));if(!file.startsWith(root+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404).end();return;}res.setHeader('Content-Type',mime[path.extname(file)]||'application/octet-stream');fs.createReadStream(file).pipe(res);});
(async()=>{await new Promise(r=>server.listen(0,'127.0.0.1',r));const {chromium,webkit}=require('playwright');try{
 for(const [name,engine]of Object.entries({chromium,webkit})){const browser=await engine.launch({headless:true});try{const page=await browser.newPage({viewport:{width:1000,height:1100}});
 await page.goto(`http://127.0.0.1:${server.address().port}/v18-qa.html`);await page.frameLocator('#game').locator('[data-diorama-actor]').first().waitFor();
 // Keep the original strict geometry assertion; capture ancestors on both baseline and candidate.
 const rotationDiagnostic=[];
 for(const version of ['v18-before.html','qa-v18-game.html']){
  await page.locator('#version').selectOption(version);await page.locator('#width').selectOption('375');await page.locator('#height').selectOption('844');
  rotationDiagnostic.push(await page.evaluate(async()=>{await boot();await actions['短文9']();await wait(500);const before=inspect();await actions['縦横復帰']();await wait(500);return {version:document.getElementById('version').value,before,after:inspect()};}));
 }
 fs.writeFileSync(path.join(output,name+'-rotation.json'),JSON.stringify(rotationDiagnostic,null,2));
 await page.getByRole('button',{name:'自動検証',exact:true}).click();await page.locator('#rawReport').waitFor({state:'attached',timeout:240000});
 const report=JSON.parse(await page.locator('#rawReport').textContent());fs.writeFileSync(path.join(output,name+'.json'),JSON.stringify(report,null,2));
 await page.locator('#width').selectOption('320');for(const action of ['短文8','短文9','実機通知','長文','2択','返答','Reaction','長い名前']){await page.getByRole('button',{name:action,exact:true}).click();await page.waitForTimeout(650);await page.screenshot({path:path.join(output,name+'-'+action+'.png'),fullPage:true});}
 assert.equal(report.rows.length,155);assert.deepEqual(report.errors,[],name+' DOM layout errors');
 }finally{await browser.close();}}
 }finally{await new Promise(r=>server.close(r));fs.rmSync(root,{recursive:true,force:true});}})().catch(e=>{console.error(e);process.exitCode=1;});
