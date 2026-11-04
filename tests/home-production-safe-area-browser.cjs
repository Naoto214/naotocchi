// Real DOM comparison: only the approved footer translation may change.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
let html;require('./visual-qa.cjs')().configureServer({middlewares:{use(_p,h){h({},{setHeader(){},end(s){html=s;}});}}});
const source=html.match(/<script>([\s\S]*?)<\/script>/)[1];
const fixtures=vm.runInNewContext(source.slice(0,source.indexOf('const mount='))+'\nfixtures');
assert.ok(process.env.HOME_SAFE_BASELINE,'supply the immutable pre-fix source for UI comparison');
const baseline=fs.readFileSync(process.env.HOME_SAFE_BASELINE,'utf8');
const output=path.resolve('test-results/home-safe-area');fs.mkdirSync(output,{recursive:true});
(async()=>{
 const server=await(await import('vite')).createServer({server:{host:'127.0.0.1',port:5194,strictPort:true}});await server.listen();
 const reports=[],errors=[];
 try{for(const engine of (process.env.HOME_LAYOUT_ENGINES||'chromium,webkit').split(',')){
 const browser=await require('playwright')[engine].launch();
 try{for(const [width,height,insets] of [[844,390,{left:59,right:59,bottom:21}],[932,430,{left:59,right:59,bottom:21}],[667,375,{bottom:0}],[844,390,{bottom:8}],[390,844,{top:59,bottom:34}],[375,667,{}]]){
  const snapshots=[];
  for(const mode of ['before','after']){
   const testedInsets=insets;
   const context=await browser.newContext({viewport:{width,height},hasTouch:true,isMobile:true,reducedMotion:'reduce'});
   const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
   await context.route('**/*.css?*',async route=>{const r=await route.fetch();await route.fulfill({response:r,body:(await r.text()).replace(/env\(safe-area-inset-(top|right|bottom|left)(?:,\s*0px)?\)/g,(_,edge)=>(testedInsets[edge]||0)+'px')});});
   if(mode==='before'&&baseline)await context.route('**/home-production-touch.js*',route=>route.fulfill({contentType:'application/javascript',body:baseline}));
   await page.addInitScript(save=>localStorage.setItem('naotocchi-save-v1',JSON.stringify(save)),fixtures.alone);
   await page.goto('http://127.0.0.1:5194');await page.evaluate(()=>document.fonts.ready);
   await page.waitForFunction(()=>!!window.NaotocchiHomeViewport?.residentPresentation?.());
   await page.waitForFunction(()=>{
    const key=JSON.stringify(['careActions','homeCommentDock'].map(id=>document.getElementById(id).getBoundingClientRect().toJSON()));
    if(window.__safeKey===key)window.__safeStable=(window.__safeStable||0)+1;else window.__safeStable=0;
    window.__safeKey=key;return window.__safeStable>=5;
   });
   const snapshot=await page.evaluate(()=>{
    const measure=e=>{const r=e.getBoundingClientRect(),c=getComputedStyle(e);return {x:r.x,y:r.y,width:r.width,height:r.height,bottom:r.bottom,right:r.right,font:c.font,padding:c.padding,gap:c.gap,border:c.border,background:c.background,color:c.color};};
    return {buttons:[...document.querySelectorAll('#careActions>button')].map(e=>({id:e.id,...measure(e)})),meters:measure(document.querySelector('.home-meters')),fixed:['.screen-frame','#castStage','#homeCommentDock','#homeEventSlot','.device-header','#homeInformation'].map(s=>measure(document.querySelector(s))),presentation:window.NaotocchiHomeViewport.residentPresentation(),background:[...document.body.style].filter(k=>k.startsWith('--home-backdrop')).map(k=>[k,document.body.style.getPropertyValue(k)])};
   });
   await page.screenshot({path:path.join(output,`${engine}-${width}x${height}-${insets.bottom||0}-${mode}.png`)});
   snapshots.push(snapshot);await context.close();
  }
  const [before,after]=snapshots;
  const lift=width>height?Math.max(0,before.buttons.at(-1).bottom-(height-(insets.bottom||0))):0;
  // WebKit may round identical transformed rectangles by a fraction of its
  // 1/64px layout unit. Styles and all larger geometric changes stay strict.
  for(let i=0;i<before.fixed.length;i++){
   const actual={...after.fixed[i]},expected={...before.fixed[i]};
   for(const key of ['x','y','width','height','bottom','right']){
    assert.ok(Number.isFinite(actual[key])&&Number.isFinite(expected[key])&&Math.abs(actual[key]-expected[key])<=1/64,`fixed region ${i}: ${key} changed`);
    delete actual[key];delete expected[key];
   }
   assert.deepEqual(actual,expected,'fixed region styles unchanged');
  }
  assert.deepEqual(after.presentation,before.presentation,'resident projection and safe movement bounds unchanged');
  assert.deepEqual(after.background,before.background,'background coverage unchanged');
  const shifted=r=>({...r,y:r.y-lift,bottom:r.bottom-lift});
  assert.deepEqual(after.buttons,before.buttons.map(shifted),'button order, dimensions, spacing and design unchanged');
  assert.deepEqual(after.meters,shifted(before.meters),'only meters top changes with controls');
  assert.ok(after.buttons.every(b=>b.bottom<=height-(insets.bottom||0)),'controls clear bottom safe area');
  reports.push({engine,width,height,insets,lift,bottom:after.buttons.at(-1).bottom});
 }
 }finally{await browser.close();}
 }
 assert.deepEqual(errors,[]);fs.writeFileSync(path.join(output,'report.json'),JSON.stringify(reports,null,2));console.log('PASS safe area and unchanged UI',JSON.stringify(reports));
 }finally{await server.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
