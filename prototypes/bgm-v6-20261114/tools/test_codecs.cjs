const assert=require('node:assert/strict');const {chromium,webkit}=require('playwright');
(async()=>{for(const [name,type] of [['chromium',chromium],['webkit',webkit]]){
 const b=await type.launch({headless:true,...(name==='chromium'?{executablePath:'/usr/bin/chromium'}:{})});const page=await b.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
 await page.goto(process.env.COMPARE_URL||'http://127.0.0.1:8765/bgm-v6/');
 const result=await page.evaluate(async()=>{const ctx=new(window.AudioContext||window.webkitAudioContext)();const results=[];
  for(const track of window.BGM_COMPARE.tracks){for(const version of [5,6]){const r=await fetch('../audio/v'+version+'/'+track.id+'.m4a');if(!r.ok)throw Error(track.id+' '+r.status);const data=await r.arrayBuffer();const buffer=await new Promise((ok,no)=>ctx.decodeAudioData(data,ok,no));if(buffer.duration<track.duration-.03)throw Error(track.id+' decoded too short');results.push({id:track.id,version,duration:buffer.duration})}}
  await ctx.close();return results});assert.equal(result.length,64);console.log(name+': all 64 AAC files fetched and decoded');
 if(name==='chromium')await page.screenshot({path:'/workspace/work/comparison-mobile.png',fullPage:false});
 await b.close();}
})().catch(e=>{console.error(e);process.exit(1)});
