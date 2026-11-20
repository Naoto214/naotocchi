// Actual browser rendering of the approved459 catalog; no production/UI hooks.
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const pw=require(process.env.PLAYWRIGHT_MODULE||'playwright'),root=path.resolve(__dirname,'../../..'),engine=process.env.CARD_BROWSER||'chromium';
const out=process.env.ARTIFACT_DIR||path.join(require('node:os').tmpdir(),'card459-'+engine);fs.mkdirSync(out,{recursive:true});
const ids=['W-time-ix','W-time-x','W-time-xi','W-time-xii','E-hayajimai','E-nagaiki','E-omoide-photo'];
const mime={'.html':'text/html','.mjs':'text/javascript','.js':'text/javascript','.json':'application/json','.css':'text/css','.webp':'image/webp','.png':'image/png','.svg':'image/svg+xml','.m4a':'audio/mp4'};
const server=http.createServer((req,res)=>{let pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);if(pathname.endsWith('/'))pathname+='index.html';const f=path.resolve(root,'.'+pathname);if(!f.startsWith(root+path.sep)){res.writeHead(403).end();return;}fs.readFile(f,(err,b)=>{if(err){res.writeHead(404).end();return;}res.setHeader('Content-Type',mime[path.extname(f)]||'application/octet-stream');res.end(b);});});
(async()=>{await new Promise(r=>server.listen(0,'127.0.0.1',r));const url=`http://127.0.0.1:${server.address().port}/prototypes/card-game/`;
const browser=await pw[engine].launch({headless:true,...(process.env.CARD_BROWSER_PATH?{executablePath:process.env.CARD_BROWSER_PATH}:{}),...(engine==='chromium'?{args:['--no-sandbox']}: {})});const results=[];
try{for(const width of [320,375,390,430])for(const landscape of [false,true]){
 const viewport=landscape?{width:844,height:width}:{width,height:844};const p=await browser.newPage({viewport,hasTouch:true,deviceScaleFactor:2});const errors=[];p.on('pageerror',e=>errors.push(e.message));await p.goto(url);await p.locator('#collection-open').tap();if(await p.locator('#collection-ack').isVisible())await p.locator('#collection-ack').tap();await p.locator('#collection-cover').tap();await p.evaluate(()=>document.fonts.ready);
 assert.equal(await p.locator('#collection-grid').evaluate(e=>getComputedStyle(e).gridTemplateColumns.split(' ').length),3);
 const info=await p.evaluate(async()=>{const {CATALOG}=await import('./full-catalog.mjs');const {CARD_ART}=await import('./ui-art.mjs');return {count:Object.keys(CATALOG).length,art:Object.keys(CARD_ART).length,names:Object.fromEntries(Object.entries(CATALOG).map(([id,c])=>[id,c.name]))};});assert.equal(info.count,459);assert.equal(info.art,459);
 const measurements=[];
 for(const id of ids){await p.locator('#collection-query').fill(info.names[id]);const button=p.locator(`[data-collection-card="${id}"]`);await button.waitFor();await p.waitForTimeout(120);
 for(const [mode,face] of [['list',button],['detail',p.locator('.collection-front')]]){
  if(mode==='detail'){await button.tap();await p.waitForTimeout(120);}
  await face.locator('img.dedicated-art').evaluate(img=>img.decode());
  const m=await face.locator('.v8-title').evaluate(e=>{const s=e.querySelector('span'),a=e.getBoundingClientRect(),b=s.getBoundingClientRect();return {text:s.textContent,width:b.width,available:a.width,whiteSpace:getComputedStyle(s).whiteSpace};});assert(m.width<=m.available+1,JSON.stringify({id,mode,...m}));assert.equal(m.whiteSpace,'nowrap');assert(!m.text.includes('\n'));measurements.push({id,mode,...m});
  if(mode==='list')assert.equal(await face.locator('.v10-effect').count(),0);
  if(width===390)await p.screenshot({path:path.join(out,`${id}-${mode}-${landscape?'landscape':'portrait'}.png`)});
 }
 await p.locator('#collection-flip').tap();assert.equal(await p.locator('#collection-flipper').getAttribute('data-side'),'back');await p.locator('#collection-detail-close').tap();
 }
 await p.locator('#collection-query').fill('');
 if(width===320&&!landscape){const seen=new Set();let pages=0;while(true){await p.waitForTimeout(60);for(const id of await p.locator('#collection-grid [data-collection-card]').evaluateAll(ns=>ns.map(n=>n.dataset.collectionCard)))seen.add(id);pages++;if(await p.locator('#collection-next').isDisabled())break;await p.locator('#collection-next').tap();assert(pages<60);}assert.equal(seen.size,460);assert.equal(pages,52);}
 const clocks=await p.evaluate(async()=>{const {renderClock}=await import('./life-clock-render.mjs');return [9,10,11,12].map(end=>({end,angle:renderClock({round:5,firstTime:4,secondTime:9,firstGrowth:65,secondGrowth:40,end}).match(/data-hand="5"[^>]*data-angle="([0-9]+)"/)?.[1]}));});assert.deepEqual(clocks.map(x=>Number(x.angle)),[270,300,330,0]);
 assert.deepEqual(errors,[]);results.push({width,landscape,viewport,count:459,measurements,clocks,errors});await p.close();
 }
 fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({engine,physicalIphone:false,results},null,2));console.log(JSON.stringify({engine,viewports:results.length,newCards:7,allCards:459,physicalIphone:false}));
}finally{await browser.close();server.close();}
})().catch(e=>{fs.writeFileSync(path.join(out,'error.txt'),String(e.stack));console.error(e);server.close();process.exitCode=1;});
