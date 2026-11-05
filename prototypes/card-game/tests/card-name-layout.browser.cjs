// Browser audit of card-name layout (display only). Serve the repo root, then:
//   node prototypes/card-game/tests/card-name-layout.browser.cjs
// Collection: all 453 entries (grid + detail + flip) at four iPhone sizes, portrait and landscape.
// Match: hand and in-match detail of long-name/lover cards, hotseat-8 vs hotseat-7 saves.
// Checks: 1-2 lines, no 1-2 character orphan line, each line centered in the name lane,
// inside the heading, no overlap with the time-cost circle or category label.
const {chromium}=require('playwright');const fs=require('fs');
const URL=process.env.CARD_GAME_URL??'http://127.0.0.1:8765/prototypes/card-game/',SHOTS=process.env.SHOTS??require('os').tmpdir();
const MEASURE={content:"window.__measure=(root)=>[...root.querySelectorAll('.card-face')].filter(c=>c.getBoundingClientRect().width>20).map(card=>{\n const t=card.querySelector('.card-title'),cost=card.querySelector('.card-cost'),head=card.querySelector('.card-heading'),cat=card.querySelector('.card-category');\n const cb=card.getBoundingClientRect(),h=head.getBoundingClientRect(),c=cost.getBoundingClientRect(),k=cat.getBoundingClientRect(),cs=getComputedStyle(head);\n const sc=h.width/head.offsetWidth;const lane={left:h.left+parseFloat(cs.paddingLeft)*sc,right:h.right-parseFloat(cs.paddingRight)*sc};\n const lines=[];const w=document.createTreeWalker(t,NodeFilter.SHOW_TEXT);let node;\n while(node=w.nextNode())for(let i=0;i<node.length;i++){const rg=document.createRange();rg.setStart(node,i);rg.setEnd(node,i+1);const b=rg.getBoundingClientRect();if(!b.width)continue;let l=lines.find(l=>Math.abs(l.top-b.top)<2);if(!l)lines.push(l={top:b.top,bottom:b.bottom,left:b.left,right:b.right,n:0});l.left=Math.min(l.left,b.left);l.right=Math.max(l.right,b.right);l.n++;}\n const fail=[];const main=card.classList.contains('main-face');\n if(lines.length<1||lines.length>2)fail.push(lines.length+' lines');\n if(!main&&lines.length===2&&lines.some(l=>l.n<=2))fail.push('orphan');\n for(const l of lines){if(l.left<lane.left-1||l.right>lane.right+1)fail.push('outside lane');\n  if(Math.abs((l.left+l.right)/2-(lane.left+lane.right)/2)>Math.max(1.2,cb.width*.01))fail.push('not centered');\n  if(l.right>c.left+.5&&l.top<c.bottom&&l.bottom>c.top)fail.push('overlaps cost');\n  if(l.top<h.top-.5||l.bottom>h.bottom+.5)fail.push('outside heading');\n  if(l.top<k.bottom-.5)fail.push('overlaps category');}\n return {name:card.getAttribute('aria-label'),w:Math.round(cb.width),lines:lines.map(l=>l.n),fail};\n});\n"};
const VIEWS=[['iPhone portrait 390x844',390,844],['iPhone landscape 844x390',844,390],['iPhone Pro Max landscape 932x430',932,430],['iPhone SE portrait 375x667',375,667]];
(async()=>{const b=await chromium.launch({headless:true,...(process.env.BROWSER_EXECUTABLE?{executablePath:process.env.BROWSER_EXECUTABLE}:{})});const report={};let fails=0;

for(const [label,width,height] of VIEWS){
 const ctx=await b.newContext({viewport:{width,height},isMobile:true,hasTouch:true,deviceScaleFactor:2});const p=await ctx.newPage();const errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.addInitScript(MEASURE);
 await p.goto(URL);await p.waitForTimeout(500);
 await p.evaluate(()=>document.getElementById('collection-open').click());
 await p.evaluate(()=>{const a=document.getElementById('collection-ack');if(a&&!a.closest('[hidden]'))a.click();document.getElementById('collection-cover').click();});
 const grid=[],detail=[],back=[];const seen=new Set();
 for(let page=0;page<51;page++){
  await p.waitForTimeout(30);
  const r=await p.evaluate(()=>__measure(document.getElementById('collection-grid')));grid.push(...r);
  const ids=await p.$$eval('[data-collection-card]',ns=>ns.map(n=>n.dataset.collectionCard));
  for(const id of ids){seen.add(id);
   await p.evaluate(id=>document.querySelector(`[data-collection-card="${id}"]`).click(),id);
   detail.push(...await p.evaluate(()=>__measure(document.getElementById('collection-detail'))));
   if(page%10===0){await p.evaluate(()=>document.getElementById('collection-flip').click());back.push(await p.evaluate(()=>document.getElementById('collection-flipper').dataset.side));await p.evaluate(()=>document.getElementById('collection-flip').click());
    detail.push(...await p.evaluate(()=>__measure(document.getElementById('collection-detail'))));}
   await p.evaluate(()=>document.getElementById('collection-detail-close').click());}
  if(page===0)await p.screenshot({path:SHOTS+`/app-${width}x${height}-collection.png`});
  await p.evaluate(()=>document.getElementById('collection-next').click());}
 // detail screenshot of the longest name
 await p.evaluate(()=>{const q=document.getElementById('collection-query');q.value='どこにもつながらない';q.dispatchEvent(new Event('input',{bubbles:true}));});await p.waitForTimeout(100);
 await p.screenshot({path:SHOTS+`/app-${width}x${height}-search.png`});
 await p.evaluate(()=>document.querySelector('[data-collection-card]').click());await p.waitForTimeout(300);await p.screenshot({path:SHOTS+`/app-${width}x${height}-detail.png`});
 const all=[...grid,...detail],bad=all.filter(x=>x.fail.length);fails+=bad.length+errors.length;
 report[label]={cardsSeen:seen.size,gridCards:grid.length,detailCards:detail.length,backSide:[...new Set(back)],twoLine:all.filter(x=>x.lines.length===2&&!/[①-⑧]/.test(x.name)).length,failures:bad.slice(0,10),pageErrors:errors};
 console.log(label,JSON.stringify(report[label]).slice(0,400));await ctx.close();}


for(const [label,width,height] of [['portrait',390,844],['landscape',844,390]])for(const version of ['hotseat-8','hotseat-7']){
 const ctx=await b.newContext({viewport:{width,height},isMobile:true,hasTouch:true,deviceScaleFactor:2});const p=await ctx.newPage();const errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.addInitScript(MEASURE);
 await p.goto(URL);
 const deckIds=await p.evaluate(async(version)=>{const e=await import('./engine.mjs');const long=Object.values(e.CARDS).filter(c=>c.type!=='main'&&!c.rare&&c.type!=='world').sort((a,b)=>[...b.name].length-[...a.name].length);
  const lovers=['P-oasis_cactus','P-knitting_spider','P-anglerfish','P-snow_spirit','P-robot_neighbor'];const d=[...lovers,...long.filter(c=>!lovers.includes(c.id)).slice(0,35).map(c=>c.id)];
  localStorage.setItem('naotocchi-hotseat-v1',e.save(e.createGame(719,{A:d,B:d},version)));return d;},version);
 await p.locator('#match-mode').selectOption('hotseat');await p.locator('#restore').click();await p.locator('#reveal').click();await p.waitForTimeout(400);
 const hand=await p.evaluate(()=>__measure(document.getElementById('hand')));
 await p.screenshot({path:SHOTS+`/match-${version}-${width}x${height}.png`});
 // open detail of every hand card
 const n=await p.locator('#hand .hand-card').count();const details=[];let note=0,married=0;
 for(let i=0;i<n;i++){await p.locator('#hand .hand-card').nth(i).click();await p.waitForTimeout(150);
  details.push(...await p.evaluate(()=>__measure(document.getElementById('card-dialog'))));
  const txt=await p.evaluate(()=>document.getElementById('card-dialog').innerHTML);if(txt.includes('legacy-rules-note'))note++;if(txt.includes('lover-married'))married++;
  if(i===0)await p.screenshot({path:SHOTS+`/match-${version}-${width}x${height}-detail.png`});
  await p.evaluate(()=>{const c=document.querySelector('#card-dialog [data-close]');c&&c.click();});await p.waitForTimeout(80);}
 const lovers=await p.evaluate(async()=>{const {LOVER_MARRIED}=await import('./lover-married.mjs');return [...document.querySelectorAll('#hand .card-face')].filter(f=>Object.values(LOVER_MARRIED)&&/こいびと/.test(f.querySelector('.card-category').textContent)).length;});
 const bad=[...hand,...details].filter(x=>x.fail.length);fails+=bad.length+errors.length;
 report[label+' '+version]={handCards:hand.length,details:details.length,twoLineHand:hand.filter(x=>x.lines.length===2).length,loversInHand:lovers,detailsWithMarriedBlock:married,detailsWithLegacyNote:note,failures:bad,pageErrors:errors};
 console.log(label,version,JSON.stringify(report[label+' '+version]));await ctx.close();}

if(process.env.REPORT)fs.writeFileSync(process.env.REPORT,JSON.stringify(report,null,1));await b.close();
console.log(fails?'card-name layout FAIL '+fails:'card-name layout PASS');process.exitCode=fails?1:0;})();
