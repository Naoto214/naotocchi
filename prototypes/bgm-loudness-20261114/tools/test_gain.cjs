const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');const {chromium}=require('playwright');
const root=path.resolve(__dirname,'..');
(async()=>{const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true});try{
 const page=await browser.newPage();await page.goto('http://127.0.0.1:8772/bgm-v7-complete/');
 await page.addScriptTag({path:path.join(root,'reference/bgm-v2.js')});await page.addScriptTag({path:path.join(root,'reference/audio.js')});
 await page.addScriptTag({url:'http://127.0.0.1:8772/assets/bgm/catalog.js'});
 await page.evaluate(()=>{
  window.auditGains=[];const create=AudioContext.prototype.createGain;AudioContext.prototype.createGain=function(){const g=create.call(this);auditGains.push(g);return g};
  window.routeMain=installNaotocchiAudio({getState:()=>({stage:'alive',lifetime:{soundBgm:true,soundSfx:false}}),STAGE:{DEAD:'dead',FAREWELL:'farewell'},el:{},isGameActive:()=>false,isDateOpen:()=>false});
 });
 await page.mouse.click(1,1);const main=await page.evaluate(()=>auditGains.map(g=>g.gain.value));
 // The first three gains are master/SFX/BGM; fileBus is fourth. Product excludes SFX.
 assert.ok(main.length>=4,JSON.stringify(main));const mainGain=main[0]*main[2]*main[3];assert.ok(Math.abs(mainGain-.36)<1e-6);
 for(const app of ['naopoyo','naokoro','card']){
  const p=await browser.newPage();await p.goto('http://127.0.0.1:8772/bgm-v7-complete/');
  await p.addScriptTag({url:'http://127.0.0.1:8772/assets/bgm/catalog.js'});await p.addScriptTag({path:path.join(root,'reference/bgm-v2.js')});
  await p.evaluate(()=>{window.gains=[];const c=AudioContext.prototype.createGain;AudioContext.prototype.createGain=function(){const g=c.call(this);gains.push(g);return g};});
  const code=fs.readFileSync(path.join(root,process.env.LEGACY?'reference/bgm-subapps.js':'preview/bgm-subapps.js'),'utf8');
  await p.evaluate(({code,app})=>{const script=document.createElement('script');script.dataset.app=app;script.textContent=code.replace("new URL('assets/bgm/catalog.js', me.src)","new URL('http://127.0.0.1:8772/assets/bgm/catalog.js')");document.body.append(script);NAOTOCCHI_SUBAPP_BGM.unlock()}, {code,app});
  const sub=await p.evaluate(()=>gains[0].gain.value);assert.ok(Math.abs(sub-mainGain)<1e-6,`${app}: BGM gain ${sub} differs from main ${mainGain}`);await p.close();
 }
 console.log('PASS real AudioContext: main chain0.36 equals all3 subapp BGM gains; no audio regeneration');
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exit(1)});
