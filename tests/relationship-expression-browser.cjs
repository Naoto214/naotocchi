// Run in a browser-capable environment: node tests/relationship-expression-browser.cjs
// Uses real Home HTML/CSS and ordinary UI clicks. Does not claim visual QA by itself.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const {chromium,webkit}=require('playwright');
let html;
require('./visual-qa.cjs')().configureServer({middlewares:{use(_p,h){h({},{setHeader(){},end(v){html=v;}});}}});
const source=html.match(/<script>([\s\S]*?)<\/script>/)[1];
const fixtures=vm.runInNewContext(source.slice(0,source.indexOf('const mount='))+'\nfixtures');
const output=path.resolve('test-results/relationship-expression');
fs.mkdirSync(output,{recursive:true});
async function measure(page){
 return page.evaluate(()=>{
  const nodes=[...document.querySelectorAll('#companionLeft img.character-asset,#companionRight img.character-asset,#partnerCompanion img.character-asset')];
  return {viewport:{width:innerWidth,height:innerHeight},page:{width:document.documentElement.scrollWidth,height:document.documentElement.scrollHeight},actors:nodes.map(img=>{
   const r=img.getBoundingClientRect();return {src:img.getAttribute('src'),loaded:img.complete&&img.naturalWidth>0,x:r.x,y:r.y,width:r.width,height:r.height};
  })};
 });
}
(async()=>{
 const {createServer}=await import('vite');const server=await createServer({server:{host:'127.0.0.1',port:5197,strictPort:true}});await server.listen();
 const results=[],failures=[];
 try{
  for(const [engine,type] of Object.entries({chromium,webkit})){
   const browser=await type.launch();
   try{
    for(const [width,height] of [[390,844],[320,568]])for(const id of ['forest_bear','rock_octopus'])for(const value of [20,50])for(const density of ['pair','dense']){
     const label=`${engine}-${width}-${id}-${value}-${density}`,page=await browser.newPage({viewport:{width,height}}),errors=[];
     page.on('pageerror',e=>errors.push(e.message));
     const save=fixtures[`relationship_${id}_${value}_${density}`];
     await page.addInitScript(s=>localStorage.setItem('naotocchi-save-v1',JSON.stringify(s)),save);
     // Synthetic clock controls only time; actual browser layout and pixels are real.
     await page.clock.install();
     try{
      await page.goto('http://127.0.0.1:5197/');await page.locator('.device.ui-home-active').waitFor();await page.evaluate(()=>document.fonts.ready);
      async function capture(phase){
       await page.evaluate(async()=>{await Promise.all([...document.querySelectorAll('img')].map(i=>i.decode().catch(()=>{})));});
       const m=await measure(page);assert.ok(m.actors.every(a=>a.loaded&&a.width>0&&a.height>0),label+': loaded actors');assert.ok(m.page.width<=width+1&&m.page.height<=height+1,label+': Home overflow');assert.equal(errors.length,0,errors.join('\n'));
       await page.screenshot({path:path.join(output,`${label}-${phase}.png`)});results.push({label,phase,...m});return m;
      }
      const initial=await capture('initial');
      for(const target of ['otter','clock',id])assert.ok(initial.actors.some(a=>a.src.includes(value<30?`relationship/${target}/lonely.png`:`/${target}.png`)),label+': initial '+target);
      await page.locator('#playWithBtn').click();await page.clock.runFor(1);const playful=await capture('play-positive');
      const positives=playful.actors.filter(a=>/relationship\/(otter|clock)\/positive.png/.test(a.src)).length;
      assert.equal(value<30?positives===2:density==='pair'?positives===1:positives<=1,true,label+': companion reactions');
      await page.clock.runFor(2501);const ended=await capture('play-ended');assert.ok(!ended.actors.some(a=>/relationship\/(otter|clock)\/positive.png/.test(a.src)));
      await page.locator('#courtBtn').click();await page.clock.runFor(1);const courted=await capture('court-positive');assert.ok(courted.actors.some(a=>a.src.includes(`relationship/${id}/positive.png`)));
      await page.clock.runFor(2501);const settled=await capture('court-ended');assert.ok(!settled.actors.some(a=>a.src.includes('/positive.png')));
      // Reload resolution is covered by the runtime save test.
      const raw=await page.evaluate(()=>localStorage.getItem('naotocchi-save-v1'));assert.doesNotMatch(raw,/relationshipExpression|reactionUntil/);
     }catch(e){failures.push({label,error:String(e)});}finally{await page.close();}
    }
   }finally{await browser.close();}
  }
 }finally{await server.close();fs.writeFileSync(path.join(output,'results.json'),JSON.stringify({results,failures},null,2)+'\n');}
 assert.deepEqual(failures,[]);console.log(`Relationship Home: ${results.length} captures; inspect screenshots before visual GREEN.`);
})().catch(e=>{console.error(e);process.exitCode=1;});
