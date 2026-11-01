const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const root=path.resolve(process.argv[2]),out=path.resolve('test-results/home-production-comments-v7');fs.mkdirSync(out,{recursive:true});
const server=http.createServer((req,res)=>{const f=path.resolve(root,'.'+new URL(req.url,'http://local').pathname);if(!f.startsWith(root+'/')||!fs.existsSync(f)){res.writeHead(404).end();return;}res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.webp':'image/webp'})[path.extname(f)]||'application/octet-stream');fs.createReadStream(f).pipe(res);});
const inspect=()=>{
 const rect=id=>document.getElementById(id).getBoundingClientRect().toJSON();
 const bubble=document.getElementById('speechBubble'),text=document.getElementById('speechText'),name=document.getElementById('speechSpeaker');
 return {bubble:rect('speechBubble'),text:rect('speechText'),name:rect('speechSpeaker'),dock:rect('homeCommentDock'),stage:rect('castStage'),slot:rect('speechSlot'),controls:rect('careActions'),notice:rect('homeEventSlot'),pageWidth:document.documentElement.scrollWidth,
 content:text.textContent,whiteSpace:getComputedStyle(text).whiteSpace,wrap:getComputedStyle(text).textWrap,textScroll:text.scrollHeight,textClient:text.clientHeight,bubbleScroll:bubble.scrollWidth,bubbleClient:bubble.clientWidth,
 portrait:name.querySelector('img')?.getAttribute('src'),portraitLoaded:!!name.querySelector('img')?.naturalWidth,nameText:name.textContent,
 buttons:[...document.querySelectorAll('#careActions>button')].map(b=>{const r=b.getBoundingClientRect(),hit=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return {hit:hit===b||b.contains(hit),w:r.width,h:r.height}}),
 phrases:document.querySelectorAll('.notice-phrase').length,careIcon:document.getElementById('message').dataset.careIcon,recommended:document.getElementById('feedBtn').dataset.careRecommended};
};
const texts=['うれしいな','今日はいい日だった','遊びの途中で何かを思い出したような顔をした','きれいな景色を見て、しばらく立ちどまっていた。となりの仲間と目が合って、小さく笑った。','遊びの途中で、ふと何かを思い出したような顔をした。きれいな景色を見て、しばらく立ちどまっていた。となりの仲間と目が合って、小さく笑った。今日のことを、明日もおぼえていられたらいいなと思った。','ABCDEFGHIJKLMNOPQRSTUVWXYZ'.repeat(5)];
(async()=>{await new Promise(r=>server.listen(0,'127.0.0.1',r));const results=[],errors=[];try{
for(const engine of (process.env.HOME_LAYOUT_ENGINES||'chromium,webkit').split(',')){
 const browser=await require('playwright')[engine].launch();try{
 for(const width of [320,375,390,430]){
 const page=await browser.newPage({viewport:{width,height:844},reducedMotion:'reduce'});page.on('pageerror',e=>errors.push(e.message));await page.clock.install();
 await page.goto('http://127.0.0.1:'+server.address().port+'/v7-qa.html?region=forest&count=28');await page.waitForFunction(()=>window.HomeReleaseQA?.detail().world?.loaded);await page.evaluate(()=>document.fonts.ready);
 for(const kind of ['pet','companion','partner'])for(const longName of [false,true]){
 let short;
 for(const [i,text] of texts.entries()){
 const name=longName?'とてもながい名前のうまれたてのさけと仲間たち':'';
 await page.evaluate(args=>HomeReleaseQA.commentCase(...args),[kind,text,name]);await page.clock.runFor(100);
 await page.waitForFunction(()=>document.querySelector('#speechSpeaker img')?.complete);
 const d=await page.evaluate(inspect),label=[engine,width,kind,longName,i].join('/');
 try{
 assert.equal(d.content,text,label+' full source text');assert.equal(d.whiteSpace,'normal');assert.equal(d.wrap,'wrap');assert.equal(d.phrases,0);
 assert.ok(d.name.bottom<=d.text.top+1,label+' name above body');assert.ok(d.text.left>=d.bubble.left&&d.text.right<=d.bubble.right+1);
 assert.ok(d.textScroll<=d.textClient+1,label+' body not clipped');assert.ok(d.bubbleScroll<=d.bubbleClient+1,label+' intrinsic width');
 assert.ok(d.bubble.bottom<=d.controls.top-2&&d.bubble.top>=0,label+' above controls and inside viewport');assert.ok(d.bubble.left>=0&&d.bubble.right<=width,label+' horizontal bounds');
 assert.ok(d.buttons.length===9&&d.buttons.every(b=>b.hit&&b.w>=44&&b.h>=44),label+' physical 5+4 controls');
 assert.ok(d.portrait?.startsWith('assets/characters/')&&d.portraitLoaded,label+' formal loaded portrait');if(kind==='partner')assert.match(d.portrait,/snow_spirit/);
 assert.equal(d.slot.height,76);assert.equal(d.notice.height,42);assert.equal(d.careIcon,'');assert.equal(d.recommended,'true');assert.ok(d.pageWidth<=width);
 if(i===0)short=d;if(i===4){assert.ok(d.bubble.width>short.bubble.width||longName,label+' grows in width');assert.ok(d.bubble.height>short.bubble.height,label+' grows in height');assert.deepEqual(d.stage,short.stage,label+' no cast reflow');}
 }catch(e){fs.writeFileSync(path.join(out,'failure.json'),JSON.stringify({label,d},null,2));await page.screenshot({path:path.join(out,'failure.png')});throw e;}
 results.push({label,...d});if(!longName&&[0,4].includes(i))await page.screenshot({path:path.join(out,[engine,width,kind,i].join('-')+'.png')});
 }
 }
 await page.setViewportSize({width:844,height:width});await page.clock.runFor(100);let d=await page.evaluate(inspect);assert.ok(d.bubble.bottom<=d.controls.top-2);assert.ok(d.buttons.every(b=>b.hit));
 await page.setViewportSize({width,height:844});await page.clock.runFor(100);d=await page.evaluate(inspect);assert.ok(d.bubble.bottom<=d.controls.top-2);
 await page.evaluate(()=>HomeReleaseQA.commentCase('partner','「じゃあまたね」と手を振った。いつもの距離だった','',true));await page.clock.runFor(100);
 const story=await page.evaluate(()=>{const b=document.getElementById('storyFlash'),n=document.getElementById('storyFlashEmoji'),t=document.getElementById('storyFlashText');return {parent:b.parentNode.id,comment:b.dataset.comment,top:t.getBoundingClientRect().top,nameBottom:n.getBoundingClientRect().bottom,bottom:b.getBoundingClientRect().bottom,controls:document.getElementById('careActions').getBoundingClientRect().top,portrait:n.querySelector('img')?.src};});
 assert.equal(story.parent,'homeCommentDock');assert.equal(story.comment,'true');assert.ok(story.nameBottom<=story.top+1&&story.bottom<story.controls);assert.match(story.portrait,/snow_spirit/);
 await page.evaluate(()=>HomeReleaseQA.clearComment());await page.clock.runFor(100);assert.equal((await page.evaluate(inspect)).dock.height,0,'empty dock leaves no painted panel');
 // Exercise the actual court action source, not only an injected story.
 await page.evaluate(()=>HomeReleaseQA.courtFriend());await page.clock.runFor(80);
 assert.equal(await page.locator('#storyFlash').getAttribute('data-comment'),'true','actual court friend source is lower');
 assert.ok(await page.locator('#homeCommentDock #storyFlash img').count());
 await page.clock.runFor(5000);await page.evaluate(()=>HomeReleaseQA.clearComment());
 // Existing question engine and real choice buttons remain usable after rotation.
 assert.equal(await page.evaluate(()=>HomeReleaseQA.question()),true,'question starts');await page.clock.runFor(100);
 await page.setViewportSize({width:844,height:width});await page.clock.runFor(100);
 const question=await page.locator('#speechChoices').evaluate(e=>{const r=e.getBoundingClientRect(),c=document.getElementById('careActions').getBoundingClientRect();return {bottom:r.bottom,controls:c.top,buttons:[...e.querySelectorAll('button')].map(b=>{const q=b.getBoundingClientRect(),hit=document.elementFromPoint(q.x+q.width/2,q.y+q.height/2);return {h:q.height,hit:b===hit||b.contains(hit)}})};});
 assert.ok(question.bottom<question.controls&&question.buttons.every(b=>b.h>=44&&b.hit),'rotated choices remain tappable above care controls');
 await page.locator('#speechChoices button').first().click();await page.clock.runFor(100);
 assert.equal(await page.locator('#speechChoices').isVisible(),false,'answer consumes choices');
 await page.locator('#menuBtn').click();assert.equal(await page.locator('#speechBubble').isVisible(),false,'menu dismisses speech');
 await page.locator('#menuCloseBtn').click();await page.setViewportSize({width,height:844});await page.clock.runFor(100);
 assert.equal(await page.evaluate(()=>HomeReleaseQA.exchange()),true,'real companion exchange starts');await page.clock.runFor(100);
 const exchange=await page.locator('#individualityDialog').evaluate(e=>{const n=document.getElementById('individualitySpeaker'),t=document.getElementById('individualityText'),r=e.getBoundingClientRect();return {portrait:n.querySelector('img')?.getAttribute('src'),nameBottom:n.getBoundingClientRect().bottom,textTop:t.getBoundingClientRect().top,bottom:r.bottom,controls:document.getElementById('careActions').getBoundingClientRect().top};});
 assert.ok(exchange.nameBottom<=exchange.textTop+1&&exchange.bottom<exchange.controls);assert.match(exchange.portrait,/assets\/characters\//);
 await page.locator('#individualityChoices button').first().click();await page.clock.runFor(100);
 assert.equal(await page.locator('#homeChoiceResult').isVisible(),true,'exchange reply stays in bottom component');
 await page.close();fs.writeFileSync(path.join(out,'progress.json'),JSON.stringify({results,errors},null,2));
 }
 }finally{await browser.close();}
}
assert.deepEqual(errors,[]);fs.writeFileSync(path.join(out,'report.json'),JSON.stringify({status:'passed',results,errors},null,2));console.log('PASS V7 comment matrix',results.length);
}finally{server.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
