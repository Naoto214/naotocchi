// 恋人カードの詳細表示（二段の本文）のスクリーンショット。使い方: node trial/qa-detail.cjs <出力dir>（試遊版を http://127.0.0.1:8771/ で配信しておく）
const {chromium}=require('playwright');
(async()=>{const b=await chromium.launch();for(const [n,vp] of [['portrait',{width:390,height:844}],['landscape',{width:844,height:390}]]){const ctx=await b.newContext({viewport:vp,isMobile:true,hasTouch:true,deviceScaleFactor:2});const p=await ctx.newPage();
for(const id of ['P-oasis_cactus','P-rock_octopus','P-grove_deer']){await p.goto('http://127.0.0.1:8771/');await p.locator('#hotseat-open').tap();await p.locator('.lv4-qa summary').tap();await p.locator('#lv4-qa-lover').selectOption(id);await p.locator('#lv4-qa-state').selectOption('married');await p.locator('#lv4-qa-start').tap();if(await p.locator('#curtain').isVisible())await p.locator('#reveal').click();
const pid=await p.evaluate(()=>window.__lv4Projection().players.A.board.partner.id);const ids=await p.locator('#game [data-inspect],#game [data-browse]').evaluateAll(ns=>ns.map(n=>n.dataset.inspect??n.dataset.browse));
console.log(n,id,pid,ids.includes(pid));await p.locator(`#game [data-inspect="${pid}"],#game [data-browse="${pid}"]`).first().click();await p.waitForTimeout(600);await p.screenshot({path:`${process.argv[2]}/detail-${n}-${id}.png`});}
await ctx.close();}await b.close();})();
