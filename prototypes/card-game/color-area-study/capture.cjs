// Run after build.mjs. Requires an installed Playwright Chromium and Japanese fonts.
const fs=require('node:fs'),path=require('node:path');
const {pathToFileURL}=require('node:url');
const {chromium}=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES?process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/playwright':'playwright');
(async()=>{
 const out=path.join(__dirname,'images');fs.mkdirSync(out,{recursive:true});
 const browser=await chromium.launch({headless:true});
 try{
 const page=await browser.newPage({viewport:{width:2100,height:1200},deviceScaleFactor:1});
 const errors=[];page.on('pageerror',e=>errors.push(String(e)));
 await page.goto(pathToFileURL(path.join(__dirname,'comparison.html')).href);
 const checks=[];
 async function ready(){await page.waitForFunction(()=>window.studyReady);await page.evaluate(async()=>{await document.fonts.ready;await Promise.all([...document.images].map(i=>i.decode()));});}
 for(const [size,mode,layout,order] of [[600,'full','grid','normal'],[110,'full','row','normal'],[80,'full','row','normal'],[110,'compact','row','normal'],[80,'compact','row','normal'],[80,'compact','row','similar']]){
  for(const [id,value] of Object.entries({size,mode,layout,order}))await page.selectOption('#'+id,String(value));await ready();
  for(const v of ['current','a','b','ab','ab-soft']){
   const section=page.locator(`[data-variant="${v}"]`);
   await section.screenshot({path:path.join(out,`${v}-${size}-${mode}-${layout}-${order}.png`)});
   if(size===600){for(const card of await section.locator('.study-sample').all()){const id=await card.getAttribute('data-id');await card.locator('.study-card').screenshot({path:path.join(out,`${v}-${id}-600.png`)});}}
  }
  checks.push(await page.evaluate(()=>[...document.querySelectorAll('.study-card')].map(c=>{const a=c.querySelector('.card-art').getBoundingClientRect(),copy=c.querySelector('.card-copy'),title=c.querySelector('.card-heading').getBoundingClientRect();return {id:c.parentElement.dataset.id,variant:c.closest('section').dataset.variant,width:c.clientWidth,ratio:c.clientWidth/c.clientHeight,titleArtOverlap:title.bottom>a.top+.5,copyOverflow:copy?copy.scrollHeight>copy.clientHeight+1:null};})));
 }
 for(const width of [320,390,430]){await page.setViewportSize({width,height:844});await page.selectOption('#size','80');await page.selectOption('#layout','grid');await ready();await page.screenshot({path:path.join(out,`iphone-${width}.png`),fullPage:true});}
 fs.writeFileSync(path.join(__dirname,'browser-verification.json'),JSON.stringify({errors,checks,physicalIPhone:false},null,2));
 if(errors.length||checks.flat().some(c=>c.titleArtOverlap||c.copyOverflow))throw Error('Review browser-verification.json; layout or JS issue detected');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
