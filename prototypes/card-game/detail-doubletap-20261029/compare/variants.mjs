// 使い方: 試遊版（build-trial.mjs の出力）を 8766 で配信し、node variants.mjs <出力dir>
// 試遊版の比較モード（A〜F・色分け）ごとに、拡大・縮小が正常で、保存が変わらないことを確かめ、撮影する
import fs from 'node:fs';import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),{chromium}=require('playwright');
const OUT=process.argv[2];fs.mkdirSync(OUT,{recursive:true});const BASE='http://127.0.0.1:8766/stage/index.html';
const b=await chromium.launch();const rows=[];
for(const [w,h] of [[390,844],[844,390]])for(const v of ['current','nooverlay','clippath','layer','zoom','noanim'])for(const diag of [false,true]){
 if(diag&&v!=='current'&&v!=='zoom')continue;
 const ctx=await b.newContext({viewport:{width:w,height:h},deviceScaleFactor:3,isMobile:true,hasTouch:true}),page=await ctx.newPage();const errs=[];page.on('pageerror',e=>errs.push(String(e)));
 await page.goto(BASE);await page.waitForSelector('#trial-panel');
 await page.evaluate(()=>{for(const k of Object.keys(localStorage))localStorage.removeItem(k);});
 await page.selectOption('[data-zoom-variant]',v);if(diag)await page.check('[data-zoom-diag]');
 await page.click('[data-trial-load="target"][data-mode="cpu"]');await page.waitForTimeout(500);if(await page.locator('#curtain').isVisible()){await page.click('#reveal');await page.waitForTimeout(300);}
 const id=await page.evaluate(()=>[...document.querySelectorAll('#hand [data-inspect]')].map(n=>n.dataset.inspect).find(x=>x.includes(':C-chameleon:')));
 const hb=page.locator(`#hand [data-inspect="${id}"]`).first();await hb.scrollIntoViewIfNeeded();await hb.click({force:true});await page.waitForSelector('#card-dialog[open]');await page.waitForTimeout(400);
 const save0=await page.evaluate(()=>Object.entries(localStorage).filter(([k])=>k.includes('cpu-match')).map(([,v])=>v).join());
 const st=()=>page.evaluate(()=>{const c=document.querySelector('#card-dialog .stage-card'),r=c.getBoundingClientRect(),cv=c.firstElementChild.getBoundingClientRect();return {w:Math.round(r.width),cvw:Math.round(cv.width),cvh:Math.round(cv.height),h:Math.round(r.height),zoom:document.querySelector('#card-dialog').dataset.stageZoom??null,badge:document.querySelector('#card-dialog .trial-zoom-badge')?.textContent,chip:!document.querySelector('#card-dialog .stage-zoom').hidden};});
 const a=await st();const p=await page.evaluate(()=>{const r=document.querySelector('#card-dialog .stage-card').getBoundingClientRect();return {x:Math.round(r.left+r.width/2),y:Math.round(r.top+r.height*.4)};});
 await page.touchscreen.tap(p.x,p.y);await page.waitForTimeout(90);await page.touchscreen.tap(p.x,p.y);await page.waitForTimeout(500);const z=await st();
 await page.evaluate(()=>{const s=document.querySelector('#card-dialog .stage-scroll');s.scrollLeft=s.scrollWidth;s.scrollTop=s.scrollHeight;});await page.waitForTimeout(200);
 await page.screenshot({path:`${OUT}/${w}x${h}-${v}${diag?'-diag':''}.jpg`,type:'jpeg',quality:55});
 const q=await page.evaluate(()=>{const r=document.querySelector('#card-dialog .stage-card').getBoundingClientRect(),s=document.querySelector('#card-dialog .stage-scroll').getBoundingClientRect();return {x:Math.round((Math.max(r.left,s.left)+Math.min(r.right,s.right))/2),y:Math.round((Math.max(r.top,s.top)+Math.min(r.bottom,s.bottom))/2)};});
 await page.touchscreen.tap(q.x,q.y);await page.waitForTimeout(90);await page.touchscreen.tap(q.x,q.y);await page.waitForTimeout(500);const back=await st();
 const save1=await page.evaluate(()=>Object.entries(localStorage).filter(([k])=>k.includes('cpu-match')).map(([,v])=>v).join());
 const ok=z.zoom==='1'&&z.w>a.w*1.2&&Math.abs(z.cvw-z.w)<=1&&Math.abs(z.cvh-z.h)<=1&&back.zoom===null&&back.w===a.w&&save0===save1&&!errs.length&&!z.chip;
 rows.push({vp:`${w}x${h}`,v,diag,ok,a:a.w,z:z.w,canvas:[z.cvw,z.cvh],card:[z.w,z.h],back:back.w,badge:a.badge,errs});
 console.log(ok?'PASS':'FAIL',`${w}x${h}`,v,diag?'diag':'',a.badge,a.w,'->',z.w,'canvas',z.cvw,z.cvh,'card',z.w,z.h,'back',back.w,errs.join(' ').slice(0,100));
 await ctx.close();}
await b.close();fs.writeFileSync(`${OUT}/variants.json`,JSON.stringify(rows,null,1));
