const assert=require('node:assert/strict');
module.exports=async page=>{
 const policy=await page.evaluate(()=>{
  const event=(type,target,x,y)=>{const e=new Event(type,{bubbles:true,cancelable:true});Object.defineProperty(e,'touches',{value:type==='touchend'?[]:[{identifier:0,target,clientX:x,clientY:y}]});target.dispatchEvent(e);return e.defaultPrevented;};
  const drag=(target,dx,dy)=>{event('touchstart',target,100,300);const prevented=event('touchmove',target,100+dx,300+dy);event('touchend',target,100+dx,300+dy);return prevented;};
  const slot=document.getElementById('speechSlot'),text=document.getElementById('speechText'),bubble=document.getElementById('speechBubble');
  const v18=document.body.dataset.homeDisplayVersion==='18';
  const scroll=v18?bubble:(document.getElementById('homeCommentDock')||slot);
  slot.classList.add('is-asking');bubble.classList.remove('hidden');text.textContent='長い質問も最後まで読んで選べます。'.repeat(70);scroll.scrollTop=0;
  const askingRange=scroll.scrollHeight-scroll.clientHeight,askingDown=drag(text,0,-50),askingTop=drag(text,0,50);scroll.scrollTop=scroll.scrollHeight;const askingUp=drag(text,0,50),askingBottom=drag(text,0,-50);
  slot.classList.remove('is-asking');bubble.classList.add('hidden');
  const dialog=document.getElementById('individualityDialog');(document.getElementById('homeCommentDock')||slot).appendChild(dialog);dialog.classList.add('home-choice-popup');dialog.classList.remove('hidden');document.getElementById('individualityText').textContent='長い選択肢の説明も読めます。'.repeat(100);const popupScroll=v18?dialog:scroll;popupScroll.scrollTop=0;
  const popupRange=popupScroll.scrollHeight-popupScroll.clientHeight,popupDown=drag(document.getElementById('individualityText'),0,-50);dialog.classList.add('hidden');
  const badges=document.querySelector('.cast-badges');badges.style.maxWidth='60px';badges.style.flex='0 0 60px';const extra=document.createElement('span');extra.textContent='🏆'.repeat(20);extra.style.flex='0 0 400px';badges.appendChild(extra);badges.scrollLeft=0;
  const badgeRange=badges.scrollWidth-badges.clientWidth,badgesRight=drag(extra,-50,0),badgesLeftEdge=drag(extra,50,0);extra.remove();
  return {askingRange,askingDown,askingTop,askingUp,askingBottom,popupRange,popupDown,badgeRange,badgesRight,badgesLeftEdge};
 });
 assert.ok(policy.askingRange>0&&policy.popupRange>0&&policy.badgeRange>0,`real overflow fixtures: ${JSON.stringify(policy)}`);
 assert.deepEqual({...policy,askingRange:1,popupRange:1,badgeRange:1},{askingRange:1,askingDown:false,askingTop:true,askingUp:false,askingBottom:true,popupRange:1,popupDown:false,badgeRange:1,badgesRight:false,badgesLeftEdge:true},'nested text and horizontal badges scroll; edges contain overscroll');
 return policy;
};

module.exports.focus=async page=>{
 const settle=()=>page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))));
 await page.locator('.screen-frame').evaluate(e=>{e.scrollTop=e.scrollHeight;});await settle();
 const manual=await page.locator('.screen-frame').evaluate(e=>e.scrollTop);
 const v18=await page.evaluate(()=>document.body.dataset.homeDisplayVersion==='18');
 await page.evaluate(()=>{document.body.dataset.homeTerrain='true';});await settle();
 if(!v18)assert.equal(await page.locator('.screen-frame').evaluate(e=>e.scrollTop),manual,'ordinary renders preserve manual scroll');
 await page.evaluate(()=>{
   const slot=document.getElementById('speechSlot'),dialog=document.getElementById('individualityDialog');
   slot.classList.remove('is-asking');(document.getElementById('homeCommentDock')||slot).appendChild(dialog);dialog.classList.add('home-choice-popup');dialog.classList.remove('hidden');
   document.getElementById('individualityText').textContent='表示中の選択肢は回転後も読めます。';
   document.querySelector('.screen-frame').scrollTop=0;
 });
 const size=page.viewportSize();await page.setViewportSize({width:size.width+1,height:size.height});await settle();
 const visible=await page.evaluate(()=>{const a=(document.body.dataset.homeDisplayVersion==='18'?document.getElementById('individualityDialog'):(document.getElementById('homeCommentDock')||document.getElementById('speechSlot'))).getBoundingClientRect(),f=document.body.dataset.homeDisplayVersion==='18'?{top:0,bottom:innerHeight,left:0,right:innerWidth}:document.querySelector('.screen-frame').getBoundingClientRect();return a.height>0&&Math.min(a.bottom,f.bottom)-Math.max(a.top,f.top)>=a.height-1&&a.left>=f.left-1&&a.right<=f.right+1;});
 assert.ok(visible,'rotation preserves the visible individuality choice slot');
};
