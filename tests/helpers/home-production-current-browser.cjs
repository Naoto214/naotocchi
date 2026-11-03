// The historical V7-V10 regressions cannot validate the shipped V18 layout.
// This companion gate uses the unmodified body flags from index.html and the
// same production renderer; only state seeding and read-only evidence are QA.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');

function assertStableRect(actual,expected,label){
 // Chromium can differ by 0.00012 CSS px between identical layout samples.
 // Permit one 1/64 CSS-pixel layout unit; real shifts (even 0.1px) still fail.
 for(const key of ['x','y','top','right','bottom','left','width','height']){
  assert.ok(Number.isFinite(actual[key])&&Number.isFinite(expected[key])&&Math.abs(actual[key]-expected[key])<=1/64,
   `${label}: layout moved ${key}: ${expected[key]} -> ${actual[key]}`);
 }
}

module.exports=async function currentProduction(browser,engine,base,out){
 const records=[],errors=[];
 const inspect=()=>{
  const rect=id=>document.getElementById(id).getBoundingClientRect().toJSON();
  const frame=document.querySelector('.screen-frame');
  return {viewport:document.body.dataset.homeViewportVersion,display:document.body.dataset.homeDisplayVersion,
   notice:rect('homeEventSlot'),comment:rect('homeCommentDock'),speech:rect('speechSlot'),controls:rect('careActions'),frame:frame.getBoundingClientRect().toJSON(),
   scroll:{width:document.documentElement.scrollWidth,height:document.documentElement.scrollHeight},
   buttons:[...document.querySelectorAll('#careActions>button')].map(e=>{const r=e.getBoundingClientRect(),hit=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return {...r.toJSON(),hit:hit===e||e.contains(hit)};}),
   ...HomeReleaseQA.currentPaint()};
 };
 function geometry(d,width,height,count,label){
  assert.equal(d.viewport,'12',label+' shipped viewport');assert.equal(d.display,'18',label+' shipped display');
  assert.equal(d.notice.height,42,label+' notification reservation');assert.equal(d.comment.height,76,label+' comment reservation');
  // V10+ moves the real comment dock out of a zero-size presentation wrapper.
  assert.equal(d.speech.height,0,label+' presentation wrapper');
  assert.ok(d.notice.top>=-1&&d.comment.bottom<=height+1,label+' lanes in viewport');
  assert.ok(d.notice.bottom<=d.comment.top,label+' separate lanes');
  assert.ok(d.scroll.width<=width&&d.scroll.height<=height+1,label+' no document scrolling');
  assert.equal(d.buttons.length,9,label+' all care actions');
  assert.ok(d.buttons.every(b=>b.hit&&b.width>=44&&b.height>=(width>height?34:44)&&b.bottom<=height+1),label+' visible tappable care actions');
  assert.deepEqual(Object.values(d.buttons.reduce((rows,b)=>(rows[Math.round(b.y)]=(rows[Math.round(b.y)]||0)+1,rows),{})),[5,4],label+' five plus four rows');
  assert.equal(d.paint.length,count,label+' expected residents');assert.ok(d.paint.every(a=>a.valid),label+' legal terrain');
  assert.ok(d.paint.every(a=>a.top>=d.notice.bottom-1&&a.bottom<=d.comment.top+1),label+' resident ink clear of both text lanes '+JSON.stringify(d.paint));
  if(width<height){assert.ok(d.frame.top>=d.notice.bottom&&d.frame.bottom<=d.comment.top,label+' central world between lanes');assert.ok(d.comment.bottom<=d.controls.top,label+' comment above controls');}
  else assert.ok(d.frame.right<=d.controls.left+1,label+' controls beside world');
 }
 for(const [width,height]of [[320,568],[375,667],[390,844],[430,932],[568,320],[844,280]])for(const count of [1,6,28]){
  const label=`${engine}/${width}x${height}/${count}`,page=await browser.newPage({viewport:{width,height},reducedMotion:'reduce',hasTouch:true}),record={label};records.push(record);
  page.on('pageerror',e=>errors.push(e.message));
  try{
   await page.clock.install();await page.goto(`${base}/current-production-qa.html?region=home&count=${count}`);
   await page.waitForFunction(n=>window.HomeReleaseQA?.detail().world?.loaded&&HomeReleaseQA.detail().actors.length===n,count);
   await page.evaluate(()=>document.fonts.ready);await page.clock.runFor(600);
   const before=await page.evaluate(inspect);record.before=before;geometry(before,width,height,count,label);
   for(const text of ['今日はいい日だった','きれいな景色を見て、しばらく立ちどまっていた。'.repeat(8)]){
    await page.evaluate(t=>HomeReleaseQA.commentCase('pet',t),text);await page.clock.runFor(150);
    assert.equal(await page.locator('#speechText').textContent(),text,label+' complete authored comment');
    assert.equal(await page.locator('#speechBubble').isVisible(),true,label+' comment visible');
    await page.waitForFunction(()=>document.querySelector('#speechSpeaker img')?.naturalWidth>0);
    const after=await page.evaluate(inspect);geometry(after,width,height,count,label);
    for(const key of ['notice','comment','controls','frame'])assertStableRect(after[key],before[key],label+' text does not move '+key);
    const textFit=await page.locator('#speechBubble').evaluate(e=>{
     e.scrollTop=e.scrollHeight;
     const text=document.getElementById('speechText'),walker=document.createTreeWalker(text,NodeFilter.SHOW_TEXT);let last,n;while(n=walker.nextNode())if(n.length)last=n;
     const range=document.createRange();range.setStart(last,last.length-1);range.setEnd(last,last.length);
     return {panel:e.getBoundingClientRect().toJSON(),last:range.getBoundingClientRect().toJSON(),scrollWidth:e.scrollWidth,clientWidth:e.clientWidth};
    });
    assert.ok(textFit.scrollWidth<=textFit.clientWidth+1,label+' no horizontal text clipping');
    assert.ok(textFit.last.top>=textFit.panel.top-1&&textFit.last.bottom<=textFit.panel.bottom+1,label+' full text scroll reachable');
   }
   assert.equal(await page.evaluate(()=>HomeReleaseQA.question()),true,label+' actual question starts');await page.clock.runFor(100);
   await page.setViewportSize({width:height,height:width});
   await page.waitForFunction(([w,h])=>innerWidth===w&&innerHeight===h&&Number.parseFloat(document.documentElement.style.getPropertyValue('--app-height'))===h,[height,width]);await page.clock.runFor(150);
   const choices=await page.locator('#speechChoices button').evaluateAll(nodes=>nodes.map(e=>{const r=e.getBoundingClientRect(),hit=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return {height:r.height,hit:hit===e||e.contains(hit)};}));
   assert.ok(choices.length>=2&&choices.every(c=>c.height>=44&&c.hit),label+' rotated actual choices tappable');
   await page.locator('#speechChoices button').first().click();await page.clock.runFor(100);
   assert.equal(await page.locator('#speechChoices').isVisible(),false,label+' answer consumes choices');
   await page.setViewportSize({width,height});
   await page.waitForFunction(([w,h])=>innerWidth===w&&innerHeight===h&&Number.parseFloat(document.documentElement.style.getPropertyValue('--app-height'))===h,[width,height]);await page.clock.runFor(600);
   const returned=await page.evaluate(inspect);record.returned=returned;geometry(returned,width,height,count,label);
   await page.screenshot({path:path.join(out,`current-${engine}-${width}x${height}-${count}.png`)});record.status='passed';
  }catch(e){record.status='failed';record.error=e.stack;await page.screenshot({path:path.join(out,`current-${engine}-${width}x${height}-${count}-failed.png`)}).catch(()=>{});throw e;}
  finally{await page.close();fs.writeFileSync(path.join(out,`current-${engine}.json`),JSON.stringify({records,errors},null,2));}
 }
 assert.deepEqual(errors,[],engine+' current production page errors');
 console.log('PASS current production V18',engine,records.length);
};
module.exports.assertStableRect=assertStableRect;
