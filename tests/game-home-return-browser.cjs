// Real menu launches and exits under a project URL (as on GitHub Pages).
const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const { chromium, webkit } = require('playwright');
const root = path.resolve(__dirname, '..');
const prefix = '/naotocchi/';
const mime = {'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.json':'application/json','.css':'text/css','.png':'image/png','.svg':'image/svg+xml','.webp':'image/webp','.woff2':'font/woff2'};
const server = http.createServer((req,res) => {
  const url = new URL(req.url,'http://localhost');
  if (!url.pathname.startsWith(prefix)) return res.writeHead(404).end();
  let file = path.resolve(root, decodeURIComponent(url.pathname.slice(prefix.length)) || '.');
  if (file!==root && !file.startsWith(root+path.sep)) return res.writeHead(403).end();
  if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file=path.join(file,'index.html');
  if (!fs.existsSync(file)) return res.writeHead(404).end();
  res.setHeader('Content-Type',mime[path.extname(file)]||'application/octet-stream');
  fs.createReadStream(file).pipe(res);
});
const label = 'ホームにもどる';
async function target(locator) {
  await locator.waitFor();
  const hittable = await locator.evaluate(el=>{
    const r=el.getBoundingClientRect(), x=r.left+r.width/2, y=r.top+r.height/2;
    const hit=document.elementFromPoint(x,y);
    return { visible: r.top>=-1 && r.bottom<=innerHeight+1 && r.left>=-1 && r.right<=innerWidth+1 && !!hit && el.contains(hit), height:r.height };
  });
  assert.ok(hittable.visible && hittable.height>=43, 'visible, unobstructed 44px home target: '+JSON.stringify(hittable));
}
async function check(context,base) {
  const page=await context.newPage(), errors=[];
  page.setDefaultTimeout(60000);
  // This checks trusted taps and navigation; headless WebKit has no audio device.
  await page.addInitScript(()=>{window.AudioContext=undefined;window.webkitAudioContext=undefined;});
  page.on('pageerror',e=>errors.push(e.message));
  const home=async()=>{await page.locator('.device.ui-home-active').waitFor();assert.ok([prefix,prefix+'index.html'].includes(new URL(page.url()).pathname));};
  const menu=async()=>{await home(); await page.locator('#menuBtn').tap();};
  const exit=async(role='link')=>{const button=page.getByRole(role,{name:label,exact:true});await target(button);await button.tap(); await home();};
  await page.goto(base,{waitUntil:'domcontentloaded'});
  await menu(); await page.locator('a[href="prototypes/naopoyo/"]').tap();
  await page.waitForURL('**/naopoyo-time-hand-chapter1/index.html');
  await page.waitForFunction(()=>document.querySelector('#title')?.textContent);
  // Module readiness includes the board's approved sprite assets. Move the
  // first dog one square so the saved puzzle is a played position.
  await page.evaluate(()=>import('./app.mjs').then(()=>true));
  const board=page.locator('#board'), bounds=await board.boundingBox();
  for (const col of [2,3]) await board.tap({position:{x:bounds.width*(col+.5)/8,y:bounds.height*2.5/8}});
  await page.waitForFunction(()=>document.querySelector('#moves').textContent==='1 手');
  const puzzleSave=await page.evaluate(()=>localStorage.getItem('naopoyo.time-hand-dungeon.20261102.v8'));
  assert.ok(puzzleSave); await exit();
  assert.equal(await page.evaluate(()=>localStorage.getItem('naopoyo.time-hand-dungeon.20261102.v8')),puzzleSave);

  await menu(); await page.locator('#naokoroBtn').tap(); await page.locator('#naokoroDialog a').tap();
  await page.locator('#new').tap(); await page.locator('#start').tap();
  await page.locator('.game-head').waitFor();
  const boardSave=await page.evaluate(()=>localStorage.getItem('naotocchi-life-sugoroku-v1'));
  assert.ok(boardSave); await exit();
  await menu(); await page.locator('#naokoroBtn').tap(); await page.locator('#naokoroDialog a').tap();
  await page.locator('#resume').tap(); await page.locator('.game-head').waitFor();
  assert.equal(await page.evaluate(()=>localStorage.getItem('naotocchi-life-sugoroku-v1')),boardSave);
  // A different tab can replace the active match. The exit must leave that
  // save untouched and cancellation must keep this match on screen.
  await page.evaluate(()=>localStorage.setItem('naotocchi-life-sugoroku-v1','other-tab'));
  const declined=page.waitForEvent('dialog').then(dialog=>dialog.dismiss());
  await Promise.all([declined,page.getByRole('link',{name:label,exact:true}).tap()]);
  assert.equal(await page.locator('.game-head').isVisible(),true);
  assert.equal(await page.evaluate(()=>localStorage.getItem('naotocchi-life-sugoroku-v1')),'other-tab');
  await page.evaluate(raw=>localStorage.setItem('naotocchi-life-sugoroku-v1',raw),boardSave);
  await exit();

  await menu(); await page.locator('a[href="prototypes/card-game/"]').tap(); await exit();
  await menu(); await page.locator('a[href="prototypes/card-game/"]').tap();
  await page.waitForFunction(()=>typeof document.querySelector('#new')?.onclick==='function');
  await page.locator('#solo-open').tap(); await page.locator('#new').tap();
  if(await page.locator('#reveal').isVisible())await page.locator('#reveal').tap();
  await page.locator('#game [data-menu]').first().tap();
  const cardHome=page.getByRole('button',{name:label,exact:true}); await target(cardHome); await cardHome.tap();
  await page.locator('#menu-home-stay').tap(); assert.equal(await page.locator('#game').isVisible(),true);
  await cardHome.tap(); await page.locator('#menu-home-go').tap(); await home();
  assert.ok(await page.evaluate(()=>localStorage.getItem('naotocchi-cpu-match-v1')));

  await menu(); await page.locator('#storyBtn').tap();
  await page.locator('#chapter-2').scrollIntoViewIfNeeded();
  await page.waitForFunction(()=>Number(JSON.parse(localStorage.getItem('madoromi38-reading-position-v6'))?.index)>2);
  await exit();
  assert.ok(await page.evaluate(()=>Number(JSON.parse(localStorage.getItem('madoromi38-reading-position-v6'))?.index)>2));

  await menu(); await page.locator('#gamesBtn').tap(); await exit('button');
  for(const id of ['playBtn','quickBtn','game-list']){
    if(id!=='playBtn')await menu();
    if(id==='game-list'){
      await page.locator('#gamesBtn').tap();
      await page.locator('.game-cell[data-game-id="stack-themed"]').tap();
    } else await page.locator('#'+id).tap(); await page.locator('#minigameOverlay').waitFor();
    const back=page.getByRole('button',{name:label,exact:true}); await target(back);await back.tap();
    await page.locator('#mgQuitNoBtn').tap(); assert.equal(await page.locator('#minigameOverlay').isVisible(),true);
    await back.tap(); await page.locator('#mgQuitYesBtn').tap(); await home();
  }
  assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('naotocchi-save-v1')).speciesLine),'butterfly');
  assert.deepEqual(errors,[]); await page.close();
}
(async()=>{
  await new Promise(r=>server.listen(0,'127.0.0.1',r));
  const base='http://127.0.0.1:'+server.address().port+prefix;
  try {for(const [name,type] of Object.entries({chromium,webkit})){
    if(process.env.HOME_NAME_ENGINES && !process.env.HOME_NAME_ENGINES.split(',').includes(name))continue;
    const browser=await type.launch();
    try {for(const viewport of [{width:390,height:844},{width:844,height:390}]){
      const ctx=await browser.newContext({viewport,hasTouch:true,reducedMotion:'reduce'});
      try {await ctx.addInitScript(s=>{if(!localStorage.getItem('naotocchi-save-v1')){s.savedAt=Date.now();s.lifetime.soundSfx=false;s.lifetime.soundBgm=false;localStorage.setItem('naotocchi-save-v1',JSON.stringify(s));}},require('./fixtures/saves/real/v5-pre-items-v2.json'));
        await check(ctx,base); console.log('PASS',name,viewport.width+'x'+viewport.height,'all six routes');
      } finally {await ctx.close();}
    }}finally{await browser.close();}
  }}finally{await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1;});
