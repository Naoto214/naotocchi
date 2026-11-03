// 使い方: 試遊版（build-trial.mjs の出力）を 8766 で配信し、node frames.mjs
// 拡大・縮小中のフレーム間隔（CPU 4倍遅延の Chromium）。開始・途中・終了（確定）のコマの長さを比べる
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),{chromium}=require('playwright');
const BASE='http://127.0.0.1:8766/stage/index.html';const b=await chromium.launch();
for(const v of ['current','layer','zoom']){const ctx=await b.newContext({viewport:{width:390,height:844},deviceScaleFactor:3,isMobile:true,hasTouch:true}),page=await ctx.newPage(),cdp=await ctx.newCDPSession(page);
 await page.goto(BASE);await page.waitForSelector('#trial-panel');await page.evaluate(()=>{for(const k of Object.keys(localStorage))localStorage.removeItem(k);});
 await page.selectOption('[data-zoom-variant]',v);await page.click('[data-trial-load="target"][data-mode="cpu"]');await page.waitForTimeout(500);
 if(await page.locator('#curtain').isVisible()){await page.click('#reveal');await page.waitForTimeout(300);}
 const id=await page.evaluate(()=>[...document.querySelectorAll('#hand [data-inspect]')].map(n=>n.dataset.inspect).find(x=>x.includes(':C-chameleon:')));
 await page.locator(`#hand [data-inspect="${id}"]`).first().click({force:true});await page.waitForSelector('#card-dialog[open]');await page.waitForTimeout(500);
 await cdp.send('Emulation.setCPUThrottlingRate',{rate:4});
 const res={in:[],out:[]};
 for(let i=0;i<10;i++){const p=await page.evaluate(()=>{const r=document.querySelector('#card-dialog .stage-card').getBoundingClientRect(),s=document.querySelector('#card-dialog .stage-scroll').getBoundingClientRect();return {x:Math.round((Math.max(r.left,s.left)+Math.min(r.right,s.right))/2),y:Math.round((Math.max(r.top,s.top)+Math.min(r.bottom,s.bottom))/2)};});
  await page.evaluate(()=>{window.__f=[];const t=()=>{window.__f.push(performance.now());if(window.__f.length<60)requestAnimationFrame(t);};requestAnimationFrame(t);});
  await page.touchscreen.tap(p.x,p.y);await page.waitForTimeout(90);await page.touchscreen.tap(p.x,p.y);await page.waitForTimeout(900);
  const f=await page.evaluate(()=>window.__f);const gaps=f.slice(1).map((t,i)=>t-f[i]);(i%2?res.out:res.in).push(Math.max(...gaps));}
 const med=a=>a.sort((x,y)=>x-y)[Math.floor(a.length/2)];
 console.log(v,'最長フレーム中央値 拡大',med(res.in).toFixed(0),'ms / 縮小',med(res.out).toFixed(0),'ms','（拡大',res.in.map(x=>x.toFixed(0)).join(','),'縮小',res.out.map(x=>x.toFixed(0)).join(','),'）');
 await ctx.close();}
await b.close();
