const assert = require('node:assert/strict');

module.exports = async function checkHomeTouch(page, engine, label, measure) {
  const before = await measure(page);
  const recorded = [];
  function checkStill(m) {
    assert.equal(m.frameScroll,0,label+': touch scrolls central home');
    assert.equal(m.content[0].y,before.content[0].y,label+': touch moves age');
    assert.equal(m.content.at(-1).y,before.content.at(-1).y,label+': touch moves meters');
    assert.equal(m.notice.y,before.notice.y,label+': touch moves narration');
  }
  // Check the shipped non-passive handler in both engines, on actual DOM.
  const policy = await page.evaluate(() => {
    function drag(selector, count=1) {
      const target=document.querySelector(selector);
      const touches=y=>Array.from({length:count},(_,identifier)=>new Touch({identifier,target,
        clientX:100+identifier*40,clientY:y}));
      target.dispatchEvent(new TouchEvent('touchstart',{bubbles:true,cancelable:true,touches:touches(300)}));
      const move=new TouchEvent('touchmove',{bubbles:true,cancelable:true,touches:touches(350)});
      target.dispatchEvent(move);
      target.dispatchEvent(new TouchEvent('touchend',{bubbles:true,cancelable:true,touches:[]}));
      return move.defaultPrevented;
    }
    return { age:drag('#ageLabel'), cast:drag('#castStage'), meters:drag('.home-meters'),
      button:drag('#feedBtn'), pinch:drag('#castStage',2) };
  });
  assert.deepEqual(policy,{age:true,cast:true,meters:true,button:true,pinch:false},label+': touch policy');

  if (engine === 'chromium') {
    const cdp=await page.context().newCDPSession(page);
    async function swipe(selector, delta, onMove) {
      const box=await page.locator(selector).boundingBox();
      const x=box.x+box.width/2, y=box.y+box.height/2;
      await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});
      try {
        for (let i=1;i<=10;i++) {
          await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x,y:y+delta*i/10}]});
          if (onMove && i%2===0) await onMove();
        }
      } finally { await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]}); }
    }
    try {
      for (const delta of [110,-110,110,-110]) {
        await swipe('#castStage',delta,async()=>{
          const m=await measure(page);checkStill(m);
          assert.equal(await page.evaluate(()=>scrollY),0,label+': touch pans document');
          recorded.push({delta,ageY:m.content[0].y,metersY:m.content.at(-1).y,scroll:m.frameScroll});
        });
      }
      // Use an actual touch to read long text and confirm the home stays put.
      const original=await page.locator('#message').innerHTML();
      await page.locator('#message').evaluate(e=>{
        e.textContent='長いお知らせも最後まで読めます。'.repeat(30);e.scrollTop=0;
      });
      await swipe('#message',-80);
      assert.ok(await page.locator('#message').evaluate(e=>e.scrollTop>0),label+': touch cannot read long text');
      checkStill(await measure(page));
      await page.locator('#message').evaluate((e,html)=>{e.innerHTML=html;e.scrollTop=0;},original);
    } finally { await cdp.detach(); }
  }
  checkStill(await measure(page));
  return {policy,realTouchSamples:recorded};
};
