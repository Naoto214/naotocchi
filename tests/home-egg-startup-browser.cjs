// Hold the optional 3D dependency: DOM readiness, egg and warming must still work.
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const root=process.cwd(),out=path.resolve('.work-output/egg-startup');fs.mkdirSync(out,{recursive:true});
const mime={'.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.html':'text/html','.png':'image/png','.webp':'image/webp','.svg':'image/svg+xml','.json':'application/json'};
const server=http.createServer((req,res)=>{const p=path.resolve(root,'.'+new URL(req.url,'http://localhost').pathname.replace(/\/$/,'/index.html'));
 if(!p.startsWith(root+path.sep)||!fs.existsSync(p)||!fs.statSync(p).isFile())return res.writeHead(404).end();
 res.setHeader('Content-Type',mime[path.extname(p)]||'application/octet-stream');fs.createReadStream(p).pipe(res);
});
(async()=>{await new Promise(r=>server.listen(0,'127.0.0.1',r));const records=[];
 try{for(const engine of (process.env.HOME_NAME_ENGINES||'chromium,webkit').split(',')){
 const browser=await require('playwright')[engine].launch(engine==='chromium'&&process.env.CHROMIUM_EXECUTABLE?{executablePath:process.env.CHROMIUM_EXECUTABLE}:{});
 try{const page=await browser.newPage({viewport:{width:393,height:720},hasTouch:true});const errors=[];page.on('pageerror',e=>errors.push(e.message));
 let release;const gate=new Promise(r=>release=r);
 const requested=page.waitForRequest('**/meguru-3d.mjs*',{timeout:15000});
 // The egg canvas now loads from its own optional world module. Hold both
 // dependencies so the original game and the fallback art are exercised together.
 const sceneryRequested=page.waitForRequest('**/home-production-world.mjs*',{timeout:15000});
 await page.route(/\/(meguru-3d|home-production-world)\.mjs(?:\?|$)/,async route=>{await gate;await route.continue();});
 try{
 await page.goto(`http://127.0.0.1:${server.address().port}/`,{waitUntil:'domcontentloaded',timeout:15000});
 await page.waitForFunction(()=>window.HomeV6Egg&&document.body.dataset.homeV6Egg==='true');
 await Promise.all([requested,sceneryRequested]);assert.equal(await page.locator('#petSprite').isVisible(),true);
 assert.equal(await page.locator('.home-v6-egg-world .home-art-canvas').count(),0);
 assert.match(await page.locator('.home-v6-egg-world').evaluate(e=>e.style.backgroundImage),/home-interior-c/);
 await page.locator('#playWithBtn').tap();
 assert.equal(await page.locator('#message').innerText(),'たまごが、ほんのりあたたかい。');
 release();await page.waitForFunction(()=>document.querySelector('.home-v6-egg-world .home-art-canvas')?.width>0);
 // WebKit font readiness can wait on the deliberately held module request.
 // Keep all pre-release visibility/tap assertions above; capture after release.
 await page.screenshot({path:path.join(out,engine+'-resumed.png')});
 // Finish the original warming flow after background readiness.
 for(let i=0;i<4;i++){await page.locator('#playWithBtn').tap();await page.waitForTimeout(150);}
 await page.waitForFunction(()=>!document.querySelector('.home-v6-egg-world')&&document.body.dataset.livingHome==='art-25d');
 assert.deepEqual(errors,[]);records.push({engine,status:'passed',domReadyBefore3D:true,warmingBefore3D:true,backgroundResumed:true,hatched:true});
 console.log(engine,'egg startup passed');
 }finally{release();await page.close();}
 }finally{await browser.close();}
 }}finally{server.close();fs.writeFileSync(path.join(out,'results.json'),JSON.stringify(records,null,2));}
})().catch(e=>{console.error(e);process.exitCode=1;server.close();});
