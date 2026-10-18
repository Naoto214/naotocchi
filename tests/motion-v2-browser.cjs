// Exercises production motion on the real Home DOM. Semantic event wiring is
// separately exercised through the real runtime in motion-v2-test.cjs.
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const {chromium,webkit}=require('playwright');
(async()=>{
 let html;require('./visual-qa.cjs')().configureServer({middlewares:{use(_p,h){h({},{setHeader(){},end(v){html=v;}});}}});
 const src=html.match(/<script>([\s\S]*?)<\/script>/)[1];const fixtures=vm.runInNewContext(src.slice(0,src.indexOf('const mount='))+'\nfixtures');
 const {createServer}=await import('vite');const server=await createServer({server:{host:'127.0.0.1',port:5199,strictPort:true}});await server.listen();
 const results=[];
 try{for(const engine of [chromium,webkit]){
  const browser=await engine.launch();
  try{for(const [width,height] of [[390,844],[320,568]])for(const scene of ['solo','pair','few','dense26'])for(const reduced of [false,true]){
   const context=await browser.newContext({viewport:{width,height},reducedMotion:reduced?'reduce':'no-preference'}),page=await context.newPage();
   try{
    await context.addInitScript(save=>{localStorage.clear();localStorage.setItem('naotocchi-save-v1',JSON.stringify(save));},fixtures['l2_feed_'+scene]);
    await page.goto('http://127.0.0.1:5199/');await page.locator('#feedBtn').waitFor({state:'visible'});
    await page.waitForFunction(()=>[...document.querySelectorAll('#pet img')].every(i=>i.complete&&i.naturalWidth));
    const data=await page.evaluate(({reduced})=>{
     const $=id=>document.getElementById(id),m=window.NaotocchiCastMotion;
     const actors=[{kind:'pet',id:'cat',node:$('petSprite')},{kind:'accessory',node:$('petAccessory')}];
     const partner=$('partnerCompanion').querySelector('.partner-emoji');if(partner)actors.push({kind:'partner',id:'forest_bear',node:partner,attachment:$('partnerCompanion').querySelector('.partner-ring')});
     for(const node of document.querySelectorAll('[data-companion-id]'))if(node.closest('#companionLeft,#companionRight'))actors.push({kind:'companion',id:node.dataset.companionId,node});
     // This controller owns only its own WAAPI instances; real Home may already
     // own a care cue or CSS animation. Never count those as leaked test motion.
     const baseline=new Set(actors.flatMap(a=>a.node.getAnimations()));
     const c=m.createController({getActors:()=>actors,getGroup:()=>$('castResponse'),getMotionRadius:()=>m.motionRadiusFor(actors.length-2)});
     const initial=actors.map(a=>[a.node.style.left,a.node.style.top,a.node.style.width,a.node.style.height]);
     const ring=actors.find(a=>a.kind==='partner')?.attachment;
     const ringScale=ring ? new DOMMatrix(getComputedStyle(ring).transform).a : null;
     let samples=0;
     for(const personality of Object.keys(m.PERSONALITIES)){
      for(const a of actors)a.personality=personality;
      for(const event of ['evolve','transform','companion_new','partner_new','marriage']){
       c.special(event,actors.find(a=>a.kind==='companion'));
       if(ring){for(const a of ring.getAnimations()){a.pause();a.currentTime=a.effect.getTiming().duration*.6;}
        if(Math.abs(new DOMMatrix(getComputedStyle(ring).transform).a-ringScale)>.001)throw Error('ring base scale changed');
       }
       for(const a of actors){for(const animation of a.node.getAnimations().filter(animation=>!baseline.has(animation))){
        animation.pause();animation.currentTime=animation.effect.getTiming().duration*.6;
        const matrix=new DOMMatrix(getComputedStyle(a.node).transform);
        if(!Number.isFinite(matrix.m42)||Math.abs(matrix.m42)>16)throw Error('unsafe displacement');
        const r=a.node.getBoundingClientRect(),stage=$('castStage').getBoundingClientRect();
        if(r.left<stage.left-2||r.right>stage.right+2||r.top<stage.top-2)throw Error(`stage overflow ${event}/${a.id}`);
        samples++;
       }}c.clear();
      }
      c.idle();c.clear();
     }
     return {samples,unchanged:JSON.stringify(initial)===JSON.stringify(actors.map(a=>[a.node.style.left,a.node.style.top,a.node.style.width,a.node.style.height])),baseline:baseline.size,leftover:actors.reduce((n,a)=>n+a.node.getAnimations().filter(animation=>!baseline.has(animation)).length,0),remaining:actors.flatMap(a=>a.node.getAnimations().filter(animation=>!baseline.has(animation)).map(animation=>({id:a.id,state:animation.playState,frames:animation.effect.getKeyframes().map(f=>f.transform)}))),overflow:document.documentElement.scrollWidth>innerWidth+1};
    },{reduced});
    console.log(JSON.stringify({engine:engine.name(),width,height,scene,reduced,...data}));
    assert.equal(data.unchanged,true);assert.equal(data.leftover,0);assert.equal(data.overflow,false);assert.equal(data.samples===0,reduced);
    results.push({engine:engine.name(),width,height,scene,reduced,...data});
   }finally{await context.close();}
  }}finally{await browser.close();}
 }}finally{await server.close();fs.mkdirSync('test-results',{recursive:true});fs.writeFileSync('test-results/motion-v2-browser.json',JSON.stringify(results,null,2));}
 console.log(`${results.length} Motion v2 real-Home browser cases PASS`);
})().catch(e=>{console.error(e);process.exitCode=1;});
