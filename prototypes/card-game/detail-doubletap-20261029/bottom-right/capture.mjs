// 右下の比較撮影: 拡大（ダブルタップ・ピンチ）してカードの右下までスクロール。使い方: node capture.mjs <CARD_GAME_URL> <出力dir> <ラベル>
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),{chromium}=require('playwright');
const [,,URL_,OUT,label]=process.argv;process.env.CARD_GAME_URL=URL_;
const {load,openCard}=await import('../../detail-stage-20261029/landscape-20261029/capture.mjs');
const b=await chromium.launch();
for(const [w,h] of [[390,844],[320,568]]){const ctx=await b.newContext({viewport:{width:w,height:h},deviceScaleFactor:3,isMobile:true,hasTouch:true}),page=await ctx.newPage(),cdp=await ctx.newCDPSession(page);
 for(const how of ['doubletap','pinch']){await load(page,'target');await openCard(page,'C-chameleon');
  const c=await page.evaluate(()=>{const r=document.querySelector('#card-dialog .stage-card').getBoundingClientRect();return {x:Math.round(r.left+r.width*.5),y:Math.round(r.top+r.height*.4)};});
  if(how==='doubletap'){await page.touchscreen.tap(c.x,c.y);await page.waitForTimeout(90);await page.touchscreen.tap(c.x,c.y);}
  else{const pts=d=>[{x:c.x-d/2,y:c.y,id:1},{x:c.x+d/2,y:c.y,id:2}];await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:pts(60)});for(let i=1;i<=8;i++)await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:pts(60+70*i/8)});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});}
  await page.waitForTimeout(500);await page.evaluate(()=>{const s=document.querySelector('#card-dialog .stage-scroll');s.scrollLeft=s.scrollWidth;s.scrollTop=s.scrollHeight;});await page.waitForTimeout(200);
  await page.screenshot({path:`${OUT}/${label}-${w}x${h}-${how}-bottom-right.jpg`,type:'jpeg',quality:60});}
 await ctx.close();}
await b.close();
