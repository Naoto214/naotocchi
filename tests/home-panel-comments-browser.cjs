// Exercise the shipped markup and real panel controls, with deterministic home speech.
const assert = require('node:assert/strict');
const fs = require('node:fs'), http = require('node:http'), path = require('node:path');
const { chromium, webkit } = require('playwright');
const root = path.resolve(__dirname, '..');
const mime = {'.mjs':'text/javascript','.js':'text/javascript','.css':'text/css','.html':'text/html','.json':'application/json','.png':'image/png','.svg':'image/svg+xml','.webp':'image/webp','.woff2':'font/woff2'};
const script = fs.readFileSync(path.join(root,'script.js'),'utf8').replace(/\}\)\(\);\s*$/, `
  window.homePanelQA = {
    seed(){Object.assign(state,{stage:STAGE.GROWING,speciesLine:'dog',stageIndex:3,regionId:'forest',hunger:90,happiness:95,health:100,energy:95});render();},
    speak(text,holdMs,important=true){setSpeechBubble(text,petSpeaker(),{important,holdMs});},
    result(){showMinigameResultToast({score:42,best:42,rank:'B'});},
    notice(text){setActionComment(text);},
    game(){startMinigame(QUICK_RUN,{intro:true});}
  };
})();`);
const server = http.createServer((req,res)=>{
  const file=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname).replace(/\/$/,'/index.html'));
  if(!file.startsWith(root+path.sep)||!fs.statSync(file,{throwIfNoEntry:false})?.isFile())return res.writeHead(404).end();
  res.setHeader('Content-Type',mime[path.extname(file)]||'application/octet-stream');
  if(file===path.join(root,'script.js'))res.end(script);else fs.createReadStream(file).pipe(res);
});
async function run(browser,engine,width,height){
  const page=await browser.newPage({viewport:{width,height},hasTouch:true,reducedMotion:'reduce'});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  try {
    await page.addInitScript(()=>{window.AudioContext=undefined;window.webkitAudioContext=undefined;});
    await page.clock.install();
    await page.goto('http://127.0.0.1:'+server.address().port);
    await page.waitForFunction(()=>window.homePanelQA);
    await page.evaluate(()=>homePanelQA.seed());
    await page.waitForFunction(()=>document.body.dataset.homeViewportV8==='true');
    await page.evaluate(()=>homePanelQA.speak('いま話しているよ',3600000));
    const bubble=page.locator('#speechBubble'),dock=page.locator('#homeCommentDock');
    assert.ok(await bubble.isVisible(),'ordinary home shows resident speech');
    await page.locator('#menuBtn').tap();
    assert.ok(await page.locator('#menuOverlay').isVisible());
    assert.equal(await bubble.isVisible(),false,'active resident speech is hidden on the menu');
    await page.locator('#naokoroBtn').tap();
    assert.ok(await page.locator('#naokoroDialog').isVisible());
    await page.locator('#naokoroDialog button').tap();
    assert.ok(await page.locator('#menuOverlay').isVisible());
    assert.equal(await bubble.isVisible(),false,'closing a child keeps parent suppression');
    await page.locator('#menuCloseBtn').tap();
    assert.equal(await bubble.innerText().then(s=>s.includes('いま話しているよ')),true);
    assert.ok(await bubble.isVisible(),'an unexpired line returns with the home');
    for(const [button,panel] of [['world','world'],['item','item'],['dex','dex'],['ach','ach'],['games','ach'],['sticker','sticker'],['theme','theme'],['profile','profile'],['comm','comm']]){
      if(!['profile','comm'].includes(button))await page.locator('#menuBtn').tap();
      await page.locator('#'+button+'Btn').tap();
      assert.ok(await page.locator('#'+panel+'Overlay').isVisible(),panel+' opens');
      assert.equal(await bubble.isVisible(),false,panel+' hides resident speech');
      await page.locator('#'+panel+'CloseBtn').tap();
      await page.locator('#'+panel+'Overlay').waitFor({state:'hidden'});
      await bubble.waitFor({state:'visible'});
    }
    // A second important line queued behind this one belongs to the old scene.
    await page.evaluate(()=>{homePanelQA.speak('古い順番待ち',3000);homePanelQA.notice('古いケア');homePanelQA.notice('古い通知待ち');});
    await page.locator('#travelBtn').tap();
    await page.locator('#travelOverlay').waitFor();
    assert.equal(await dock.isVisible(),false,'travel hides the home comment container itself');
    await page.evaluate(()=>homePanelQA.notice('古いケア・旅行中'));
    const list=page.locator('#travelOverlay .theme-scroll');
    const start=await list.evaluate(e=>({page:scrollY,frame:document.querySelector('.screen-frame').scrollTop,room:e.scrollHeight-e.clientHeight}));
    assert.ok(start.room>20,'travel list overflows');
    await list.hover();await page.mouse.wheel(0,500);
    await page.waitForFunction(()=>document.querySelector('#travelOverlay .theme-scroll').scrollTop>20);
    assert.deepEqual(await page.evaluate(()=>[scrollY,document.querySelector('.screen-frame').scrollTop]),[start.page,start.frame],'only travel list scrolls');
    assert.ok(await page.locator('#travelCloseBtn').isVisible(),'close stays accessible');
    await page.clock.fastForward(3605000);
    await page.locator('#travelCloseBtn').tap();
    await page.clock.runFor(800);
    assert.equal(await bubble.isVisible(),false,'expired and queued resident speech do not replay');
    assert.doesNotMatch(await page.locator('#homeEventSlot').innerText(),/古い/,'old care notices do not replay');
    await page.evaluate(()=>homePanelQA.speak('おかえり',15000,false));
    assert.ok(await bubble.isVisible(),'fresh speech works after returning home');
    await page.locator('#menuBtn').tap();
    await page.evaluate(()=>homePanelQA.result());
    await page.locator('#menuCloseBtn').tap();
    await page.waitForFunction(()=>!document.getElementById('mgResultToast').classList.contains('hidden'));
    assert.match(await page.locator('#mgResultToast').innerText(),/42点/,'game result remains available');
    assert.ok(await bubble.isVisible(),'ordinary unexpired speech is also restored');
    await page.evaluate(()=>homePanelQA.game());
    assert.ok(await page.locator('#minigameOverlay').isVisible());
    assert.equal(await dock.isVisible(),false,'home speech remains suppressed in game');
    await page.locator('#mgQuitBtn').tap();
    assert.ok(await page.locator('#mgQuitConfirm').isVisible(),'game-owned quit message stays visible');
    assert.deepEqual(errors,[]);
    console.log(engine,width+'x'+height,'passed');
  } finally {await page.close();}
}
(async()=>{await new Promise(r=>server.listen(0,'127.0.0.1',r));try{
  for(const name of (process.env.HOME_NAME_ENGINES||'chromium,webkit').split(',')){const browser=await ({chromium,webkit})[name].launch();try{
    for(const [w,h] of [[390,844],[844,390]])await run(browser,name,w,h);
  }finally{await browser.close();}}
}finally{server.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
