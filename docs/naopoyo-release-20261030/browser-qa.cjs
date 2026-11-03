const {chromium}=require('playwright'),fs=require('fs'),path=require('path'),http=require('http'),assert=require('assert/strict');
const root=path.resolve(process.env.QA_ROOT||'/tmp/naopoyo-pages'),out=path.resolve(process.env.QA_OUT||'docs/naopoyo-release-20261030/browser');fs.mkdirSync(out,{recursive:true});
const mime={'.html':'text/html','.mjs':'text/javascript','.js':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.webp':'image/webp','.svg':'image/svg+xml'};
(async()=>{
 const server=http.createServer((req,res)=>{let rel=decodeURIComponent(req.url.split('?')[0]);if(rel.endsWith('/'))rel+='index.html';const file=path.resolve(root,'.'+rel);if(!file.startsWith(root+'/')){res.writeHead(403);return res.end()}fs.readFile(file,(err,b)=>{res.writeHead(err?404:200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream'});res.end(err?'missing':b)})});await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;
 const browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'/tmp/naopoyo-chromium',args:['--no-sandbox','--disable-dev-shm-usage'],headless:true});
 const results={browser:await browser.version(),root,checks:[],layouts:[],errors:[]};
 const check=(name,value)=>{assert.ok(value,name);results.checks.push(name)};
 try{
  const context=await browser.newContext({viewport:{width:390,height:750},reducedMotion:'reduce'}),page=await context.newPage();
  page.on('pageerror',e=>results.errors.push(String(e)));page.on('response',r=>{if(r.status()>=400&&!r.url().includes('favicon'))results.errors.push(r.status()+' '+r.url())});
  // Empty storage: normal entry remains chapter1 and chapter2 12 is locked.
  await page.goto(base+'/prototypes/naopoyo/');await page.waitForFunction(()=>window.pilot);
  check('official portal opens preserved chapter1',page.url().includes('chapter1'));
  await page.goto(base+'/prototypes/naopoyo-chapter2/');await page.waitForFunction(()=>window.pilot);
  check('normal progression starts chapter1 and forbids chapter2 before clear',await page.evaluate(()=>pilot.session.stage.id==='light-arrival'&&!pilot.progress.allowed('komorebi-fall')));
  const seed=await page.evaluate(async()=>{const {stages}=await import('./stages.mjs');const old='naopoyo.komorebi.recombine-once.20261028.v1';const raw=JSON.stringify({version:1,current:stages[0].id,unlocked:stages.map(s=>s.id),cleared:[],boards:{},hints:{},read:[]});localStorage.setItem(old,raw);localStorage.setItem('naopoyo.chapter1.20261023.v1.cleared.light-owl-trial','1');localStorage.setItem('card-save-release-sentinel','unchanged');return {old,raw}});
  await page.reload();await page.waitForFunction(()=>window.pilot);await page.evaluate(()=>pilot.choose('komorebi-fall'));if(await page.locator('#dialog').evaluate(d=>d.open))await page.click('#close');
  const initial=await page.evaluate(()=>JSON.stringify(pilot.session.state));
  const cell=async(x,y)=>{const b=await page.locator('#board').boundingBox();return {x:b.x+(x+.5)*b.width/8,y:b.y+(y+.5)*b.height/8}};
  const drag=async(a,b)=>{await page.mouse.move(a.x,a.y);await page.mouse.down();await page.mouse.move(b.x,b.y,{steps:8});await page.mouse.up()};
  const p=await cell(1,2),to=await cell(2,2);await drag(p,to);
  check('real pointer input counts one cell as one move',await page.locator('#moves').textContent()==='1手');
  const moved=await page.evaluate(()=>JSON.stringify(pilot.session.state));await page.reload();await page.waitForFunction(()=>window.pilot);if(await page.locator('#dialog').evaluate(d=>d.open))await page.click('#close');
  check('normal saved board restores after reload',await page.evaluate(()=>JSON.stringify(pilot.session.state))===moved);
  await page.click('#undo');check('Undo restores board and needs no start action',await page.evaluate(initial=>JSON.stringify(pilot.session.state)===initial&&!pilot.session.paused,initial));
  check('normal pause controls and white cover are absent',await page.locator('#pause,#paused').count()===0);
  // Exact pointer stroke fixture, using the production app and session.
  await page.evaluate(()=>{const q=pilot.session;q.stage={...q.stage,gravity:false,walls:[],gates:[],spikes:[],exits:[],actors:[{id:'a',species:'dog',level:8,x:0,y:7}]};q.retry()});
  await drag(await cell(0,7),await cell(5,7));check('one held stroke counts five moves',await page.locator('#moves').textContent()==='5手');await page.click('#undo');check('one Undo restores the entire five-cell stroke',await page.locator('#moves').textContent()==='0手');
  await page.click('#retry');await page.click('#close').catch(()=>{});
  // Return to a canonical stage before examples; no fixture board is reused.
  await page.evaluate(async()=>{pilot.session.stage=(await import('./stages.mjs')).stages[0];pilot.session.retry();pilot.progress.data.boards={};localStorage.removeItem(pilot.progress.actualKey+'.board.komorebi-fall');localStorage.removeItem(pilot.progress.actualKey);});await page.reload();await page.waitForFunction(()=>window.pilot);
  for(let n=11;n<=20;n++){
   await page.evaluate(async n=>{const {stages}=await import('./stages.mjs');pilot.choose(stages.find(s=>s.number===n).id)},n);if(await page.locator('#dialog').evaluate(d=>d.open))await page.click('#close');
   const before=await page.evaluate(()=>({state:JSON.stringify(pilot.session.state),history:JSON.stringify(pilot.session.history),clears:JSON.stringify(pilot.progress.data.cleared)}));
   await page.click('#example');if(await page.locator('#exampleConfirm').count())await page.click('#exampleConfirm');await page.waitForFunction(()=>document.querySelector('[data-next]')&&!document.querySelector('[data-next]').disabled,{},{timeout:5000}).catch(async e=>{console.log(await page.evaluate(async()=>{let why;try{const {ExampleReplay}=await import('./example-replay.mjs');const d=await (await fetch('./examples/'+pilot.session.stage.number+'.json')).json();new ExampleReplay(pilot.session.stage,d.path)}catch(e){why=e.stack}return {id:pilot.session.stage.id,number:pilot.session.stage.number,info:document.querySelector('.example-info')?.textContent,why}}));throw e});
   await page.click('[data-next]');await page.click('[data-prev]');check(n+' example previous/next controls',await page.locator('.example-count').textContent().then(t=>t.includes(' 0 /')));
   await page.click('[data-next]');await page.click('[data-close]');await page.click('#example');await page.waitForFunction(()=>document.querySelector('.example-count')?.textContent.includes(' 1 /'));
   check(n+' example cursor survives close/reopen',true);
   await page.click('[data-reset]');await page.click('[data-play]');
   if(n===20){await page.waitForFunction(()=>Number(document.querySelector('.example-count')?.textContent.match(/おてほん (\d+)/)?.[1])>=2);await page.click('[data-play]');const count=await page.locator('.example-count').textContent();await page.waitForTimeout(1900);check('stage20 autoplay pauses without advancing',await page.locator('.example-count').textContent()===count);await page.click('[data-play]')}
   // Speed up browser time, preserving actual requestAnimationFrame / production clock.
   // Playwright clock runs the real timer callbacks; no replay state is fabricated.
   if(n===11)await page.clock.install();for(let i=0;i<[5,5,10,11,23,38,26,19,78,97][n-11]+2;i++)await page.clock.fastForward(2000);
   const expected=[5,5,10,11,23,38,26,19,78,97][n-11];await page.waitForFunction(expected=>document.querySelector('.example-count')?.textContent.includes(` ${expected} / ${expected}手`),expected,{timeout:15000});
   console.log('example',n);check(n+' example autoplay reaches final rescue',await page.locator('.example-info').textContent().then(t=>t.includes('おわり')));
   if(n===20){check('stage20 97 moves and 16/16 rescue',await page.locator('.example-count').textContent().then(t=>t.includes('97 / 97手')&&t.includes('16 / 16')));await page.screenshot({path:out+'/stage20-finished.png'})}
   await page.click('[data-close]');check(n+' example preserves normal board/history/progress',await page.evaluate(b=>JSON.stringify(pilot.session.state)===b.state&&JSON.stringify(pilot.session.history)===b.history&&JSON.stringify(pilot.progress.data.cleared)===b.clears,before));
  }
  // Layout of the actual shipped normal app and example dialog.
  for(const [width,height] of [[320,480],[375,667],[390,650],[430,750],[844,390],[390,480]]){
   await page.setViewportSize({width,height});await page.evaluate(()=>window.dispatchEvent(new Event('resize')));
   const data=await page.evaluate(()=>{const rect=e=>{const r=e.getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height}};return {scroll:document.documentElement.scrollWidth>innerWidth,board:rect(document.querySelector('#board')),buttons:[...document.querySelectorAll('main button')].filter(e=>e.getBoundingClientRect().width).map(rect)}});
   check(`${width}x${height} normal board visible`,!data.scroll&&data.board.w>0&&data.board.y>=0&&data.board.y+data.board.h<=height);
   await page.click('#example');await page.waitForFunction(()=>document.querySelector('.example-count')?.textContent.includes('手'));
   const controls=await page.locator('.example-controls').boundingBox();check(`${width}x${height} example controls visible`,controls.y>=0&&controls.y+controls.height<=height);await page.screenshot({path:out+`/layout-${width}x${height}.png`});await page.click('[data-close]');results.layouts.push({width,height,...data});
  }
  check('legacy save and unrelated storage untouched',await page.evaluate(seed=>localStorage.getItem(seed.old)===seed.raw&&localStorage.getItem('card-save-release-sentinel')==='unchanged',seed));
  check('no browser module/asset/runtime errors',results.errors.length===0);
  results.status='passed';
 }catch(e){results.status='failed';results.failure=String(e);throw e}finally{fs.writeFileSync(out+'/results.json',JSON.stringify(results,null,2));await browser.close();server.close()}
 console.log(JSON.stringify({status:results.status,checks:results.checks.length,layouts:results.layouts.length}));
})().catch(e=>{console.error(e);process.exitCode=1});
