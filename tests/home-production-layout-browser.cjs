// Actual production DOM/CSS, seeded saves. No navigation/actor-layout mocks.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
let html;require('./visual-qa.cjs')().configureServer({middlewares:{use(_p,h){h({},{setHeader(){},end(s){html=s;}});}}});
const source=html.match(/<script>([\s\S]*?)<\/script>/)[1];
const fixtures=vm.runInNewContext(source.slice(0,source.indexOf('const mount='))+'\nfixtures');
const output=path.resolve('test-results/home-production-layout');fs.mkdirSync(output,{recursive:true});
(async()=>{
 const server=await (await import('vite')).createServer({server:{host:'127.0.0.1',port:5193,strictPort:true}});await server.listen();
 const results=[],errors=[];
 try{for(const name of (process.env.HOME_LAYOUT_ENGINES||'chromium,webkit').split(',')){
 const browser=await require('playwright')[name].launch();try{
 for(const [width,height,fixture,insets] of [[320,640,'care_attention_low_life'],[320,568,'care_attention_critical'],[375,667,'alone'],[390,844,'world_sea_full'],[430,932,'alone'],[568,320,'care_attention_critical'],[667,375,'alone'],[844,390,'care_attention_low_life'],[932,430,'world_sea_full'],[390,844,'alone',{top:59,bottom:34}],[844,390,'alone',{left:59,right:59,bottom:21}]]){
 const context=await browser.newContext({viewport:{width,height},reducedMotion:'reduce',hasTouch:true,isMobile:true});const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
 if(insets)await require('./helpers/browser-route.cjs').guardedRoute(context,'**/*.css?*',name+'-safe-area',errors,async route=>{const response=await route.fetch();await route.fulfill({response,body:(await response.text()).replace(/env\(safe-area-inset-(top|right|bottom|left)\)/g,(_,edge)=>(insets[edge]||0)+'px')});});
 await page.addInitScript(s=>localStorage.setItem('naotocchi-save-v1',JSON.stringify(s)),fixtures[fixture]);
 await page.goto('http://127.0.0.1:5193');await page.waitForFunction(()=>document.body.dataset.livingHome==='art-25d');await page.evaluate(()=>document.fonts.ready);
 await page.waitForFunction(()=>{const actor=document.querySelector('[data-diorama-actor^="pet:"]'),frame=document.querySelector('.screen-frame');if(!actor)return false;const a=actor.getBoundingClientRect(),f=frame.getBoundingClientRect();return Math.min(a.bottom,f.bottom)-Math.max(a.top,f.top)>=Math.min(24,a.height*.5);},null,{timeout:5000});
 const measure=()=>page.evaluate(()=>{const rect=e=>{let r=e.getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height,b:r.bottom,right:r.right}};const frame=document.querySelector('.screen-frame');return {width:innerWidth,height:innerHeight,pageWidth:document.documentElement.scrollWidth,pageHeight:document.documentElement.scrollHeight,frame:{...rect(frame),scroll:frame.scrollTop,range:frame.scrollHeight-frame.clientHeight},buttons:[...document.querySelectorAll('#careActions>button')].map(e=>{const r=rect(e),hit=document.elementFromPoint(r.x+r.w/2,r.y+r.h/2);return {id:e.id,...r,hit:hit===e||e.contains(hit)}}),stage:rect(document.getElementById('castStage')),speech:rect(document.getElementById('speechSlot')),notice:rect(document.getElementById('homeEventSlot')),meters:rect(document.querySelector('.home-meters')),zoom:getComputedStyle(document.body).zoom}});
 const before=await measure();results.push({name,width,height,fixture,before});fs.writeFileSync(path.join(output,'progress.json'),JSON.stringify(results,null,2));await page.screenshot({path:path.join(output,`${name}-${width}x${height}-entry.png`)});
 assert.equal(before.buttons.length,9);assert.ok(before.buttons.every(b=>b.hit&&b.w>=44&&b.h>=44&&b.y>=0&&b.b<=height),`${name}/${width} care buttons must remain visible and physically tappable: ${JSON.stringify(before.buttons)}`);
 if(insets)assert.ok(before.buttons.every(b=>b.b<=height-(insets.bottom||0)&&b.x>=(insets.left||0)&&b.right<=width-(insets.right||0)),'care controls respect safe area');
 assert.equal(before.notice.h,42);assert.equal(before.speech.h,76);assert.ok(before.stage.h>=380);assert.ok(before.speech.y>=before.stage.b-1);assert.ok(before.meters.y>=before.speech.b-1,'speech and meters cannot overlap');assert.ok(before.pageHeight<=height+1);assert.ok(before.pageWidth<=width+1);assert.equal(before.zoom,'1');
 await page.locator('.screen-frame').evaluate(e=>{e.scrollTop=e.scrollHeight;});await page.waitForTimeout(100);const after=await measure();assert.deepEqual(after.buttons,before.buttons,'scrolling keeps all care controls fixed');assert.ok(after.meters.b<=after.frame.b+1,'meters reachable');assert.equal(await page.evaluate(()=>scrollY),0);if(before.frame.range>1)assert.ok(after.frame.scroll>0,'central content can scroll');
 await page.screenshot({path:path.join(output,`${name}-${width}x${height}.png`)});if(width===320&&height===640){if(name==='chromium')await require('./helpers/home-production-native-touch.cjs').scroll(page);await require('./helpers/home-production-touch-check.cjs')(page);}if(width===568)await require('./helpers/home-production-touch-check.cjs').focus(page);await context.close();
 }
 }finally{await browser.close();}}
 assert.deepEqual(errors,[]);console.log('PASS fixed care layout',results.length);fs.writeFileSync(path.join(output,'report.json'),JSON.stringify({status:'passed',results,errors},null,2));
 }finally{await server.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
