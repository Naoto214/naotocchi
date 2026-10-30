/* Presentation scroll only: never reads or writes saved entities or actor positions. */
(() => {
  const device=document.getElementById('device'),frame=device?.querySelector('.screen-frame');
  if(!device||!frame)return;
  const terrain=()=>document.body.dataset.homeProduction==='true'&&document.body.dataset.homeTerrain==='true'&&device.dataset.homeFixed==='true';
  function paintScroll(){
    document.body.style.setProperty('--home-center-scroll',(terrain()?frame.scrollTop:0)+'px');
    document.body.style.setProperty('--home-center-overflow',(terrain()?Math.max(0,frame.scrollHeight-frame.clientHeight):0)+'px');
  }
  frame.addEventListener('scroll',paintScroll,{passive:true});
  if(typeof ResizeObserver==='function'){const observer=new ResizeObserver(paintScroll);observer.observe(frame);observer.observe(document.getElementById('screenNormal'));}
  new MutationObserver(paintScroll).observe(device,{attributes:true,attributeFilter:['data-home-fixed']});
  new MutationObserver(paintScroll).observe(document.body,{attributes:true,attributeFilter:['data-home-terrain']});
  let gesture=null;
  // Text may live inside a scrolling slot or popup. Route each axis to its
  // nearest real scroll container, including the header's horizontal badges.
  // At that container's edge, contain the gesture instead of chaining it.
  function scrollParent(target,axis){
    for(let element=target;element&&device.contains(element);element=element.parentElement){
      const style=getComputedStyle(element),horizontal=axis==='x';
      if(/^(auto|scroll)$/.test(horizontal?style.overflowX:style.overflowY)
        &&(horizontal?element.scrollWidth-element.clientWidth:element.scrollHeight-element.clientHeight)>1)return element;
    }
    return null;
  }
  document.addEventListener('touchstart',event=>{
    gesture=null;if(device.dataset.homeFixed!=='true'||window.visualViewport?.scale>1||event.touches.length!==1||event.target.closest?.('#device')!==device)return;
    gesture={x:event.touches[0].clientX,y:event.touches[0].clientY,horizontal:scrollParent(event.target,'x'),vertical:scrollParent(event.target,'y')};
  },{passive:true,capture:true});
  document.addEventListener('touchmove',event=>{
    if(!gesture)return;if(device.dataset.homeFixed!=='true'||window.visualViewport?.scale>1||event.touches.length!==1){gesture=null;return;}
    const p=event.touches[0],dx=p.clientX-gesture.x,dy=p.clientY-gesture.y;gesture.x=p.clientX;gesture.y=p.clientY;
    const horizontal=Math.abs(dx)>Math.abs(dy),container=horizontal?gesture.horizontal:gesture.vertical,delta=horizontal?dx:dy;
    if(container){
      const limit=horizontal?container.scrollWidth-container.clientWidth:container.scrollHeight-container.clientHeight;
      const position=horizontal?container.scrollLeft:container.scrollTop;
      if((delta<0&&position<limit-1)||(delta>0&&position>0))return;
    }
    if(event.cancelable)event.preventDefault();
  },{passive:false,capture:true});
  for(const name of ['touchend','touchcancel'])document.addEventListener(name,()=>{gesture=null;},{passive:true,capture:true});
  paintScroll();
})();
