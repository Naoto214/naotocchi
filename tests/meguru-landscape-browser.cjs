// Real layout/input regression for the physical iPhone report in PR #379.
// No production hooks or physical-performance claims. CSS insets emulate a notch.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { serve } = require('../tools/character-3d/shot.cjs');
const { makeSave } = require('../tools/meguru-3d-qa/character-integration.cjs');
const { guardedRoute } = require('./helpers/browser-route.cjs');

function measure() {
  const selectors = ['#mgrCanvas', '.mg-pad', '#mgrTravel', '#mgrHome', '#mgrMap'];
  const visible = selectors.map(selector => {
    const e = document.querySelector('#meguruOverlay ' + selector), r = e.getBoundingClientRect();
    const points = [[r.left + r.width / 2, r.top + 2], [r.left + r.width / 2, r.bottom - 2], [r.left + r.width / 2, r.top + r.height / 2]];
    return { selector, x:r.x, y:r.y, width:r.width, height:r.height, right:r.right, bottom:r.bottom,
      hit:points.every(([x,y]) => { const h=document.elementFromPoint(x,y); return h===e || e.contains(h) || (selector==='#mgrCanvas' && h?.classList.contains('meguru-3d-canvas')); }) };
  });
  const frame = document.querySelector('.screen-frame');
  return { width:innerWidth, height:innerHeight, visible, scroll:frame.scrollHeight-frame.clientHeight };
}
function check(m, label) {
  for (const r of m.visible) {
    assert.ok(r.x>=0 && r.y>=0 && r.right<=m.width+1 && r.bottom<=m.height+1,
      label + ': control/canvas offscreen ' + JSON.stringify(r));
    // Rounded canvas corners and its map/spot overlays are intentional.
    if (r.selector!=='#mgrCanvas') assert.ok(r.hit, label+': clipped/covered '+r.selector);
  }
  assert.ok(m.scroll<=1, label+': exploration controls require scrolling: '+m.scroll);
}
async function settledMeasurement(page, label) {
  // Production debounces orientation/visualViewport changes and measures again
  // on animation frames. Wait for the visible result, not a fixed host delay.
  const deadline=Date.now()+5000;
  for (;;) {
    const m=await page.evaluate(measure);
    try { check(m,label); return m; }
    catch (error) { if (Date.now()>=deadline) throw error; }
    await page.waitForTimeout(100);
  }
}
async function run() {
  const output=path.resolve('test-results/home-layout/meguru-landscape'); fs.mkdirSync(output,{recursive:true});
  const report={physicalIPhone:'NOT_RUN',checks:[]};
  const server=await serve();
  try {
    const engines=(process.env.MEGURU_LAYOUT_ENGINES || 'chromium,webkit').split(',');
    for (const engine of engines) {
      const browser=await require('playwright')[engine].launch(engine==='chromium'?{
        ...(process.env.PLAYWRIGHT_CHROMIUM?{executablePath:process.env.PLAYWRIGHT_CHROMIUM}:{}),
        args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']}:{});
      try {
        for (const query of (process.env.MEGURU_LAYOUT_QUERY ? [process.env.MEGURU_LAYOUT_QUERY] : ['?m3d2d=1','?meguru3d=0','?char3d=0',''])) {
          const context=await browser.newContext({viewport:{width:393,height:760},hasTouch:true});
          const page=await context.newPage(), errors=[], routeErrors=[]; page.on('pageerror',e=>errors.push(String(e)));
          // Only substitute platform safe-area inputs; retain shipped layout rules.
          await guardedRoute(context, '**/*.css?*', engine+query, routeErrors, async route=>{
            const url=new URL(route.request().url());
            const file=path.resolve(__dirname,'..',url.pathname.slice(1));
            const css=fs.readFileSync(file,'utf8').replace(/env\(safe-area-inset-(top|right|bottom|left)(?:,\s*0px)?\)/g,
              (_,edge)=>({left:47,right:47,bottom:21,top:0}[edge]+'px'));
            await route.fulfill({contentType:'text/css',body:css});
          });
          await page.addInitScript(s=>localStorage.setItem('naotocchi-save-v1',s),makeSave('snow'));
          try {
            await page.goto('http://127.0.0.1:'+server.address().port+'/'+query);
            await page.locator('#travelBtn').click(); await page.locator('#meguruEnterBtn').click();
            await page.locator('#mgrCanvas').waitFor();
            const expected3D=query==='' || query==='?char3d=0';
            if (expected3D && engine==='chromium') await page.waitForFunction(()=>__meguruRun?.renderer.is3D===true);
            // WebKit in Linux may not provide WebGL; require its real production fallback.
            await page.evaluate(()=>{ globalThis.__layoutIdentity={run:__meguruRun,sim:__meguruRun.sim,world:__meguruRun.world,player:__meguruRun.player}; });
            for (const [width,height] of [[393,760],[852,320],[852,300],[667,300],[852,390],[393,760]]) {
              await page.setViewportSize({width,height}); await page.waitForTimeout(450);
              const label=engine+'-'+(query||'default')+'-'+width+'x'+height;
              const m=await settledMeasurement(page,label); report.checks.push({label,...m});
              await page.screenshot({path:path.join(output,label.replace(/[^\w-]/g,'_')+'.png')});
              check(m,label); console.log('PASS '+label);
              assert.equal(await page.evaluate(()=>{const a=__layoutIdentity,r=__meguruRun;return a.run===r&&a.sim===r.sim&&a.world===r.world&&a.player===r.player;}),true,label+': rotation replaced simulation');
            }
            // Exercise real input after a final landscape rotation, not a DOM-only check.
            await page.setViewportSize({width:852,height:320}); await page.waitForTimeout(450);
            const before=await page.evaluate(()=>({x:__meguruRun.player.x,z:__meguruRun.player.z}));
            const pad=await page.locator('.mg-pad').boundingBox();
            await page.mouse.move(pad.x+pad.width/2,pad.y+pad.height/2); await page.mouse.down();
            await page.mouse.move(pad.x+pad.width/2+24,pad.y+pad.height/2-24,{steps:4});
            await page.waitForTimeout(350); await page.mouse.up();
            const after=await page.evaluate(()=>({x:__meguruRun.player.x,z:__meguruRun.player.z}));
            assert.ok(Math.hypot(after.x-before.x,after.z-before.z)>1,engine+query+': pad moves player');
            await page.locator('#mgrMap').click(); await page.locator('.mgr-map-close').click();
            await page.locator('#mgrHome').click(); await page.locator('#travelBtn').click();
            await page.locator('#meguruEnterBtn').click(); await page.locator('#mgrCanvas').waitFor();
            await page.waitForTimeout(450); await settledMeasurement(page,engine+' reentry');
            assert.deepEqual(errors,[]);
            assert.deepEqual(routeErrors,[]);
            report.checks.push({label:engine+query+' input/map/exit/reentry',pass:true,renderer:await page.evaluate(()=>__meguruRun.renderer.is3D?'3D':'Canvas')});
          } finally { await context.close(); }
        }
      } finally { await browser.close(); }
    }
  } finally { server.close(); fs.writeFileSync(path.join(output,'results.json'),JSON.stringify(report,null,2)+'\n'); }
}
run().catch(e=>{console.error(e);process.exitCode=1;});
