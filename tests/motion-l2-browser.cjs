// Real care buttons; no replacement animation or game-closure hooks.
const assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
const {chromium}=require('playwright');
(async()=>{
 let html;require('./visual-qa.cjs')().configureServer({middlewares:{use(_p,h){h({},{setHeader(){},end(v){html=v;}});}}});
 const source=html.match(/<script>([\s\S]*?)<\/script>/)[1];
 const fixtures=vm.runInNewContext(source.slice(0,source.indexOf('const mount='))+'\nfixtures');
 const {createServer}=await import('vite');const server=await createServer({server:{host:'127.0.0.1',port:5198,strictPort:true}});await server.listen();
 const results=[];let browser;
 try{
  browser=await chromium.launch();
  for(const [width,height] of [[390,844],[320,568]])for(const scene of ['solo','pair','few','dense26'])for(const [action,button,target] of [['feed','feedBtn','petSprite'],['play','playWithBtn','petSprite'],['clean','cleanBtn','castResponse'],['wake','sleepBtn','petSprite']]){
   const context=await browser.newContext({viewport:{width,height}}),page=await context.newPage(),name=`l2_${action}_${scene}`;
   try{
    await context.addInitScript(save=>{localStorage.clear();localStorage.setItem('naotocchi-save-v1',JSON.stringify(save));},fixtures[name]);
    await page.goto('http://127.0.0.1:5198/');
    await page.locator('#'+button).waitFor({state:'visible'});
    await page.waitForFunction(()=>[...document.querySelectorAll('#pet img')].every(i=>i.complete&&i.naturalWidth>0));
    await page.locator('#'+button).click();
    await page.waitForFunction(id=>!!document.getElementById(id).dataset.reaction,target);
    const sample=await page.evaluate(({target,action})=>{
     const node=document.getElementById(target),animation=node.getAnimations()[0];
     return {frames:animation?.effect.getKeyframes().map(f=>f.transform),reaction:node.dataset.reaction,
      group:document.getElementById('castResponse').dataset.reaction,
      overflow:document.documentElement.scrollWidth>innerWidth+1,
      accessory:document.getElementById('petAccessory').getAnimations()[0]?.effect.getKeyframes().map(f=>f.transform)};
    },{target,action});
    assert.ok(sample.frames?.length,name+': motion started');assert.equal(sample.overflow,false,name+': overflow');
    if(action==='clean')assert.equal(sample.group,'clean');else {assert.equal(sample.group,undefined);assert.deepEqual(sample.accessory,sample.frames);}
    await page.waitForTimeout(1800);
    assert.equal(await page.locator('#'+target).evaluate(n=>n.getAnimations().length),0,name+': animation releases rest');
    results.push({name,width,height,status:'PASS'});
   }finally{await context.close();}
  }
 }finally{
  await browser?.close();await server.close();
  fs.mkdirSync('test-results',{recursive:true});fs.writeFileSync('test-results/motion-l2-browser.json',JSON.stringify(results,null,2));
 }
 console.log(`${results.length} L2 real-Home browser cases PASS`);
})().catch(e=>{console.error(e);process.exitCode=1;});
