// 表示見切れ候補の実画面QA（読み取り専用）。本番UIコード・カード・保存形式は変更しない。
// 使い方: リポジトリ直下で `python3 -m http.server 8765` を起動してから
//   node prototypes/card-game/followup-20261028/display-qa/run-display-qa.mjs [出力dir]
// 要: playwright（chromium）。対象はPR #459の19枚＋参考1枚(M-sakura-06)。
import fs from 'node:fs';import path from 'node:path';import {fileURLToPath} from 'node:url';import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),{chromium}=require('playwright');
const HERE=path.dirname(fileURLToPath(import.meta.url)),CG=path.resolve(HERE,'../..'),OUT=path.resolve(process.argv[2]??HERE);
const BASE=process.env.QA_BASE??'http://localhost:8765/prototypes/card-game/index.html';
const e=await import(path.join(CG,'engine.mjs'));const {CATALOG}=await import(path.join(CG,'full-catalog.mjs'));
const IDS=process.env.QA_IDS?process.env.QA_IDS.split(','):['M-cicada-08','M-coral-06','M-dragon-04','M-frog-06','M-ghost-07','M-god-03','M-god-06','M-god-08','M-man-07','M-mushroom-05','M-mushroom-07','M-mushroom-08','M-phoenix-05','M-sakura-08','M-stagbeetle-06','M-woman-01','M-woman-02','M-woman-06','M-world_tree-07','M-sakura-06'];
const WIDTHS=[[320,568],[375,667],[390,844],[430,932]],LAND=[[844,390]];
const WORST=['M-coral-06','M-stagbeetle-06','M-woman-02','M-sakura-06'];
function gameWith(cardId){const n=CATALOG[cardId].rare?1:3,base=[...e.DEFAULT_DECK];const deck=[...Array(n).fill(cardId),...base.filter(x=>x!==cardId).slice(0,40-n)];
 for(let seed=1;seed<600;seed++){const s=e.createGame(seed,{A:deck,B:[...e.DEFAULT_DECK]});const inst=s.players.A.hand.find(x=>s.cards[x].cardId===cardId);if(inst!==undefined)return {seed,inst,text:e.save(s)};}throw Error('no seed for '+cardId);}
const faceMetrics=sel=>(sel=>{const f=document.querySelector(sel);if(!f)return null;const c=f.querySelector('.card-copy'),p=c.querySelector('p'),cs=getComputedStyle(p);
 const cr=c.getBoundingClientRect(),pr=p.getBoundingClientRect();return {copyClient:c.clientHeight,copyScroll:c.scrollHeight,clipped:c.scrollHeight>c.clientHeight+1||pr.bottom>cr.bottom+1,fontPx:+parseFloat(cs.fontSize).toFixed(2),inlineSize:c.style.fontSize||null,longCopy:f.classList.contains('long-copy'),faceW:Math.round(f.getBoundingClientRect().width)};})(sel);
fs.mkdirSync(OUT,{recursive:true});const results=[];
const browser=await chromium.launch();
async function ctxFor(w,h){const ctx=await browser.newContext({viewport:{width:w,height:h},deviceScaleFactor:2,isMobile:true,hasTouch:true});return ctx;}
const shot=async(loc,file)=>{fs.mkdirSync(path.dirname(file),{recursive:true});await loc.screenshot({path:file,type:'jpeg',quality:55});};
async function collectionRun(w,h,ids,tag){
 const ctx=await ctxFor(w,h),p=await ctx.newPage();const errs=[];p.on('pageerror',x=>errs.push(String(x)));
 await p.goto(BASE);await p.waitForTimeout(500);await p.click('#collection-open');
 if(await p.locator('#collection-notice').isVisible())await p.click('#collection-ack');await p.click('#collection-cover');
 for(const id of ids){
  const c=CATALOG[id];await p.fill('#collection-query',c.name);await p.waitForTimeout(250);
  const rec={id,name:c.name,width:w,height:h,screen:'collection',tag};
  const pocket=p.locator(`.collection-pocket:has([data-collection-card="${id}"])`);
  rec.gridVisible=await pocket.count()>0;
  if(rec.gridVisible){await pocket.scrollIntoViewIfNeeded();const t=await p.evaluate(i=>{const n=document.querySelector(`[data-collection-card="${i}"] .card-title`);return n?{titleClipped:n.scrollWidth>n.clientWidth+1||n.scrollHeight>n.clientHeight+1}:null},id);rec.grid=t;await shot(pocket,`${OUT}/screenshots/${tag}/${id}-1-grid.jpg`);}
  await p.locator(`[data-collection-card="${id}"]`).click();await p.waitForTimeout(450);await p.evaluate(()=>document.fonts.ready);await p.waitForTimeout(150);
  rec.face=await p.evaluate(faceMetrics,'#collection-detail .main-face');
  await shot(p.locator('#collection-flipper'),`${OUT}/screenshots/${tag}/${id}-2-collection-face.jpg`);
  const eff=p.locator('#collection-card-effect');await eff.scrollIntoViewIfNeeded();await p.waitForTimeout(100);
  rec.panel=await p.evaluate(exp=>{const el=document.querySelector('#collection-card-effect'),r=el.getBoundingClientRect(),cs=getComputedStyle(el);return {textMatchesCatalog:el.textContent===exp,visibleInViewport:r.top>=0&&r.bottom<=innerHeight+1,clientH:el.clientHeight,scrollH:el.scrollHeight,overflowY:cs.overflowY,fontPx:+parseFloat(cs.fontSize).toFixed(1)}},c.text);
  await p.screenshot({path:`${OUT}/screenshots/${tag}/${id}-3-collection-panel.jpg`,type:'jpeg',quality:50});
  await p.click('#collection-detail-close');await p.waitForTimeout(200);
  rec.errors=errs.splice(0);results.push(rec);
 }
 await ctx.close();
}
async function matchRun(w,h,ids,tag){
 const ctx=await ctxFor(w,h),p=await ctx.newPage();const errs=[];p.on('pageerror',x=>errs.push(String(x)));
 for(const id of ids){
  const c=CATALOG[id],g=gameWith(id);await p.goto(BASE);await p.evaluate(t=>localStorage.setItem('naotocchi-hotseat-v1',t),g.text);await p.reload();await p.waitForTimeout(400);
  await p.selectOption('#match-mode','hotseat').catch(()=>{});await p.click('#restore');await p.waitForTimeout(500);
  if(await p.locator('#curtain').isVisible()){await p.click('#reveal');await p.waitForTimeout(300);}
  const rec={id,name:c.name,width:w,height:h,screen:'match-dialog',tag};
  const hand=p.locator(`[data-inspect="${g.inst}"]`).first();rec.handButton=await hand.count()>0;
  if(rec.handButton){await hand.click({force:true});await p.waitForTimeout(500);await p.evaluate(()=>document.fonts.ready);await p.waitForTimeout(150);
   rec.dialogOpen=await p.locator('#card-dialog').isVisible();
   rec.face=await p.evaluate(faceMetrics,'#card-dialog .main-face');
   rec.panel=await p.evaluate(exp=>{const d=document.querySelector('#card-dialog'),el=d.querySelector('.detail-copy'),r=el.getBoundingClientRect(),cs=getComputedStyle(el);const eff=d.querySelector('.effect-scroll')??el;return {containsCatalogText:el.textContent.includes(exp),dialogScrollable:d.scrollHeight>d.clientHeight+1,effectBottomWithinDialog:eff.getBoundingClientRect().bottom<=d.getBoundingClientRect().bottom+1,effectClient:eff.clientHeight,effectScroll:eff.scrollHeight,overflowY:getComputedStyle(eff).overflowY}},c.text);
   await p.screenshot({path:`${OUT}/screenshots/${tag}/${id}-4-match-dialog.jpg`,type:'jpeg',quality:50});}
  rec.errors=errs.splice(0);results.push(rec);
 }
 await ctx.close();
}
for(const [w,h] of WIDTHS){const tag=`${w}x${h}`;await collectionRun(w,h,IDS,tag);await matchRun(w,h,IDS,tag);}
if(!process.env.QA_IDS)for(const [w,h] of LAND){const tag=`landscape-${w}x${h}`;await collectionRun(w,h,WORST,tag);await matchRun(w,h,WORST,tag);}
await browser.close();
fs.writeFileSync(path.join(OUT,'results.json'),JSON.stringify(results,null,1));
console.log('records',results.length);
