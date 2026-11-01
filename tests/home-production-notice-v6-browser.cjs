// Exercise the real notice renderer with the extracted authored corpus.
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const root=path.resolve(process.argv[2]),out=path.resolve('test-results/home-production-notice-v6');fs.mkdirSync(out,{recursive:true});
const server=http.createServer((req,res)=>{const f=path.resolve(root,'.'+new URL(req.url,'http://local').pathname);if(!f.startsWith(root+'/')||!fs.existsSync(f)){res.writeHead(404).end();return;}const ext=path.extname(f);res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.json':'application/json','.webp':'image/webp','.png':'image/png'})[ext]||'application/octet-stream');fs.createReadStream(f).pipe(res);});
const inspect=()=>{
 const slot=document.getElementById('homeEventSlot'),stage=document.getElementById('castStage'),rect=e=>e.getBoundingClientRect().toJSON();
 const visible=[...slot.children].filter(e=>e.getClientRects().length&&e.getBoundingClientRect().height);
 const target=visible.find(e=>e.id==='storyFlash')?.querySelector('#storyFlashText')||visible.find(e=>e.id==='message');
 const lines=[];
 if(target){const walk=document.createTreeWalker(target,NodeFilter.SHOW_TEXT);let n;while(n=walk.nextNode()){if(n.parentElement.closest('.icon-fallback'))continue;for(let i=0;i<n.length;i++){const range=document.createRange();range.setStart(n,i);range.setEnd(n,i+1);const r=range.getBoundingClientRect();if(!r.width||!r.height)continue;let line=lines.find(l=>Math.abs(l.top-r.top)<2);if(!line)lines.push(line={top:r.top,text:''});line.text+=n.data[i];}}}
 return {slot:rect(slot),speech:rect(document.getElementById('speechSlot')),stage:rect(stage),extra:parseFloat(getComputedStyle(slot).marginBottom),pageWidth:document.documentElement.scrollWidth,
  content:visible.map(e=>({id:e.id,rect:rect(e),client:e.clientHeight,scroll:e.scrollHeight})),
  text:target?.textContent,body:target?rect(target):null,icons:target?[...target.querySelectorAll('[data-ui-icon]')].filter(e=>e.getBoundingClientRect().width&&e.getBoundingClientRect().height).map(e=>e.dataset.uiIcon):[],phrases:target?[...target.querySelectorAll('.notice-phrase')].map(e=>({text:e.textContent,rect:rect(e),scroll:e.scrollWidth,client:e.clientWidth})):[],
  name:rect(document.getElementById('storyFlashName')),icon:rect(document.getElementById('storyFlashEmoji')),art:[...document.querySelectorAll('#storyFlashEmoji *')].filter(e=>e.getClientRects().length&&e.getBoundingClientRect().width).map(rect),lines,
  careIcon:document.getElementById('message').dataset.careIcon,recommended:document.getElementById('feedBtn').dataset.careRecommended};
};
(async()=>{await new Promise(r=>server.listen(0,'127.0.0.1',r));const results=[],errors=[];try{
 for(const engine of (process.env.HOME_LAYOUT_ENGINES||'chromium,webkit').split(',')){
 const browser=await require('playwright')[engine].launch();try{
 for(const width of [320,375,390,430]){
 const page=await browser.newPage({viewport:{width,height:844},reducedMotion:'reduce'});page.on('pageerror',e=>errors.push(e.message));await page.clock.install();
 await page.goto('http://127.0.0.1:'+server.address().port+'/v6-qa.html?region=forest&count=28');await page.waitForFunction(()=>window.HomeReleaseQA?.detail().world?.loaded);await page.evaluate(()=>document.fonts.ready);
 const corpus=await page.evaluate(()=>HomeReleaseQA.noticeCorpus());fs.writeFileSync(path.join(out,'corpus.json'),JSON.stringify(corpus,null,2));
 for(const source of ['dynamic.marriage/','dynamic.companion.normal/','dynamic.companion.rare/'])assert.ok(corpus.some(r=>r.source.startsWith(source)),source+' authored example');
 for(const [i,row] of corpus.entries()){
 await page.evaluate(r=>HomeReleaseQA.presentNotice(r),row);await page.clock.runFor(60);
 const d=await page.evaluate(inspect),label=[engine,width,i,row.source].join('/');
 try {
 assert.equal(d.slot.height,42,label+' base');assert.equal(d.speech.height,76,label+' speech');assert.ok(d.text.includes(row.text),label+' exact authored text');
 assert.equal(d.careIcon,'',label+' no inherited state icon');
 if(i===0)assert.equal(d.recommended,'true',label+' hunger action remains recommended');
 if(row.expectedIcon)assert.ok(d.icons.includes(row.expectedIcon),label+' event icon retained');
 assert.ok(d.content.every(c=>c.scroll<=c.client+1&&c.rect.bottom<=d.stage.top+1),label+' full text, no actor overlap');
 assert.ok(d.phrases.every(p=>p.rect.left>=d.body.left-1&&p.rect.right<=d.body.right+1&&p.scroll<=p.client+1),label+' phrases inside body');
 assert.ok(d.pageWidth<=width,label+' no horizontal scrolling');
 if(row.kind==='story'&&d.icon.width){assert.ok(d.icon.right<=d.body.left+1,label+' icon/body separation');assert.ok(d.art.every(r=>r.right<=d.body.left+1),label+' actual artwork/body separation');if(row.longName)assert.ok(d.name.bottom<=d.body.top+1,label+' name/body separation');}
 for(const word of ['食べずに','しばらく','行き先を'])if(row.text.includes(word))assert.ok(d.lines.some(l=>l.text.includes(word)),label+' keep '+word);
 } catch(error) {
 await page.screenshot({path:path.join(out,engine+'-failure.png')});
 await page.clock.runFor(500);const settled=await page.evaluate(inspect);
 const failure={label,row,initial:d,after500ms:settled};
 fs.writeFileSync(path.join(out,engine+'-failure.json'),JSON.stringify(failure,null,2));console.error(JSON.stringify(failure));throw error;
 }
 const key=row.text.includes('食べずに')?'forest':row.longName?'long-name':row.text.includes('しばらく立ち')?'desert':row.text.includes('迷いかけ')?'jungle':null;
 if(key){await page.screenshot({path:path.join(out,[engine,width,key].join('-')+'.png')});}
 results.push({engine,width,index:i,source:row.source,...d});
 }
 await page.evaluate(()=>HomeReleaseQA.presentNotice(null));await page.clock.runFor(100);assert.equal((await page.evaluate(inspect)).extra,0,'expiry restores base');
 await page.close();fs.writeFileSync(path.join(out,'progress.json'),JSON.stringify({results,errors},null,2));
 }
 }finally{await browser.close();}}
 assert.deepEqual(errors,[]);fs.writeFileSync(path.join(out,'report.json'),JSON.stringify({status:'passed',results,errors},null,2));console.log('PASS V6 authored corpus',results.length);
 }finally{server.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
