const fs=require('fs'),path=require('path');
const {chromium}=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/playwright');
const sharp=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/sharp');
const root=path.resolve(__dirname,'../..');
(async()=>{
 const scenes=JSON.parse(fs.readFileSync(path.join(__dirname,'play-prompts.json')));
 const {CATALOG}=await import('../../../full-catalog.mjs');
 const {cardMarkup}=await import('../../../ui-presentation.mjs');
 const {cardArtColors}=await import('../../approved-colors.mjs');
 const browser=await chromium.launch({executablePath:'/tmp/card-pilot-browser/runtime/chromium',args:['--no-sandbox'],headless:true});
 const page=await browser.newPage({viewport:{width:1200,height:1200}}),errors=[],checks=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)errors.push(r.url());});
 const base='http://127.0.0.1:8776/prototypes/card-game/art-pilot/index.html';
 async function ready(url){await page.goto(url);await page.waitForFunction(()=>window.pilotReady);await page.evaluate(async()=>{await document.fonts.ready;await Promise.all([...document.images].filter(i=>i.checkVisibility()).map(i=>i.decode()));});}
 for(const s of scenes){
  await ready(base+'?card='+s.id);const card=page.locator('.selected .card-wrap .card-face');
  await card.screenshot({path:path.join(root,'previews',s.id+'.png')});
  const expected=cardMarkup(CATALOG[s.id]);
  checks.push(await card.evaluate((e,input)=>{const [c,html]=input,r=e.getBoundingClientRect(),art=e.querySelector('.card-art').getBoundingClientRect(),copy=e.querySelector('.card-copy'),t=document.createElement('template');t.innerHTML=html;const symbol=e.querySelector('.card-category .icon')||e.querySelector('.card-heading .icon'),original=t.content.querySelector('.card-category .icon')||t.content.querySelector('.card-heading .icon');return {id:c.id,width:r.width,height:r.height,text:copy.querySelector('p').textContent===c.text,textFits:copy.scrollHeight<=copy.clientHeight+1,nonOverlap:art.bottom<=copy.getBoundingClientRect().top+1,color:e.style.getPropertyValue('--card-color'),categoryMark:e.querySelector('.card-category').textContent===t.content.querySelector('.card-category').textContent,botanical:e.querySelector('.botanical').outerHTML===t.content.querySelector('.botanical').outerHTML,cost:e.querySelector('.card-cost').textContent===String(c.cost),title:e.querySelector('.card-title').textContent===c.name,attributeCount:e.querySelectorAll('.card-attribute').length};},[CATALOG[s.id],expected]));
 }
 await ready(base);for(const s of scenes)for(const [cl,w]of [['small',80],['hand',110]])await sharp(await page.locator(`[data-id="${s.id}"] .thumb.${cl} .card-face`).screenshot()).resize(w,w*1.5).png().toFile(path.join(root,'previews',s.id+'-'+w+'.png'));
 const mobile=[];for(const width of [320,390,430]){await page.setViewportSize({width,height:844});mobile.push(await page.evaluate(()=>({width:innerWidth,scrollWidth:document.documentElement.scrollWidth})));}
 const result={pass:!errors.length&&checks.every(c=>c.width===600&&c.height===900&&c.text&&c.textFits&&c.nonOverlap&&c.color===cardArtColors(CATALOG[c.id]).color&&c.categoryMark&&c.botanical&&c.cost&&c.title&&c.attributeCount===0)&&mobile.every(x=>x.width===x.scrollWidth),checks,mobile,errors,physicalSafari:false,browser:await browser.version()};
 fs.writeFileSync(path.join(__dirname,'browser-qa.json'),JSON.stringify(result,null,2)+'\n');await browser.close();console.log(JSON.stringify(result));if(!result.pass)process.exit(1);
})().catch(e=>{console.error(e);process.exit(1)});
