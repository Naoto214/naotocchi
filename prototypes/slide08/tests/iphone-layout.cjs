const {chromium}=require(process.env.SLIDE08_PLAYWRIGHT||'playwright');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROME_PATH,args:['--no-sandbox']});
 const out=path.resolve(__dirname,'../qa-iphone');fs.mkdirSync(out,{recursive:true});
 for(const [width,height] of [[390,664],[375,667],[430,740],[667,320],[844,390]]){
  const context=await browser.newContext({viewport:{width,height},isMobile:true,hasTouch:true,reducedMotion:'reduce'}),page=await context.newPage();
  await page.goto('http://127.0.0.1:8765/prototypes/naopoyo/');
  await page.locator('#dropPreview span').last().waitFor();
  const preview=await page.evaluate(()=>[...document.querySelectorAll('.mini-board')].map(b=>{const r=b.getBoundingClientRect();return [...b.children].every(c=>{const q=c.getBoundingClientRect();return q.right<=r.right+1&&q.bottom<=r.bottom+1&&Math.abs(q.width-q.height)<1})}));
  await page.screenshot({path:path.join(out,`${process.env.QA_PHASE||'after'}-entry-${width}.png`)});
  if(!process.env.CAPTURE_ONLY)assert.ok(preview.every(Boolean),'preview cells contained and square');
  await page.goto('http://127.0.0.1:8765/prototypes/slide08/player.html');
  await page.waitForFunction(()=>!document.querySelector('#start').disabled);await page.click('#start');await page.locator('#game').waitFor({state:'visible'});
  const sizes=async()=>page.evaluate(()=>{const b=document.querySelector('#board').getBoundingClientRect();return {board:[b.width,b.height],cells:[...document.querySelectorAll('#board button')].map(c=>{const r=c.getBoundingClientRect();return [r.width,r.height]}),bottom:Math.max(...['board','tools','undo'].map(id=>document.getElementById(id).getBoundingClientRect().bottom)),scroll:document.documentElement.scrollWidth>innerWidth}});
  const before=await sizes();await page.screenshot({path:path.join(out,`${process.env.QA_PHASE||'after'}-board-${width}.png`)});
  if(!process.env.CAPTURE_ONLY){assert.ok(before.cells.every(([w,h])=>Math.abs(w-h)<1),'all cells square');assert.ok(before.bottom<=height,'controls fit height');assert.equal(before.scroll,false);}
  // Images must not contribute intrinsic minimums, even if source dimensions change.
  await page.evaluate(()=>{[...document.querySelectorAll('#board img')].forEach((im,i)=>{if(i%2)im.remove();else{im.width=1200;im.height=800;}})});
  const after=await sizes();if(!process.env.CAPTURE_ONLY)assert.deepEqual(after.board,before.board);
  await page.locator('#eggs button').first().click();await page.locator('#targets button').first().click();
  const egg=await sizes();await page.screenshot({path:path.join(out,`${process.env.QA_PHASE||'after'}-egg-${width}.png`)});
  if(!process.env.CAPTURE_ONLY){assert.ok(egg.cells.every(([w,h])=>Math.abs(w-h)<1));assert.ok(egg.bottom<=height);}
  await context.close();console.log('PASS layout',width,height);
 }
 await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
