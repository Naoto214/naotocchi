// The card is a 320 × 480 logical canvas. Fit both dimensions; never crop it.
export function detailGeometry(width,height,insets={}){
 const safeWidth=Math.max(1,width-(insets.left??0)-(insets.right??0)),safeHeight=Math.max(1,height-(insets.top??0)-(insets.bottom??0));
 const contentWidth=Math.max(1,safeWidth-36),contentHeight=Math.max(1,safeHeight-90),landscape=width>height;
 const cardHeight=Math.max(1,Math.min(480,landscape?contentHeight:Math.min(216,contentHeight*.38),(landscape?contentWidth*.38:contentWidth)*1.5));
 return {landscape,contentWidth,contentHeight,cardHeight,cardWidth:cardHeight/1.5,scale:cardHeight/480};
}
export function installViewport(doc= document,win=window){
 const probe=doc.createElement('div');probe.className='safe-area-probe';probe.setAttribute('aria-hidden','true');doc.body.append(probe);
 const update=()=>{const vv=win.visualViewport,w=vv?.width??win.innerWidth,h=vv?.height??win.innerHeight,style=win.getComputedStyle(probe),insets=Object.fromEntries(['top','right','bottom','left'].map(k=>[k,parseFloat(style.getPropertyValue('padding-'+k))||0])),g=detailGeometry(w,h,insets),root=doc.documentElement;
  for(const [key,value] of Object.entries({'ui-vw':w+'px','ui-vh':h+'px','ui-vtop':(vv?.offsetTop??0)+'px','ui-vleft':(vv?.offsetLeft??0)+'px','detail-card-width':g.cardWidth+'px','detail-card-height':g.cardHeight+'px','detail-scale':g.scale}))root.style.setProperty('--'+key,value);
  root.dataset.detailOrientation=g.landscape?'landscape':'portrait';
 };update();win.addEventListener('resize',update);win.addEventListener('orientationchange',update);win.visualViewport?.addEventListener('resize',update);win.visualViewport?.addEventListener('scroll',update);
}
// Card detail stage. The official 320 × 480 card is scaled to the space the stage really has after the action band.
// Portrait: the whole card is shown unless that would make its text too small to read; then the card fills the width
// and the stage scrolls. Landscape: always the whole card, however small, so the table can be taken in at a glance.
// Tapping the card (zoom) fills the stage width to read the text, and tapping again returns. Never wider than the stage.
export const STAGE_MAX_SCALE=1.6,STAGE_READABLE=.82;
export function stageScale(width,height,{zoom=false,portrait=true}={}){
 const fill=Math.min(Math.max(1,width)/320,STAGE_MAX_SCALE),whole=Math.min(fill,Math.max(1,height)/480);
 if(zoom)return fill;
 if(!portrait)return whole;
 return whole>=Math.min(fill,STAGE_READABLE)?whole:fill;
}
export function fitStageCard(dialog,doc=document){
 const scroll=dialog?.querySelector('.stage-scroll'),card=scroll?.querySelector('.stage-card');if(!card)return;
 const cs=getComputedStyle(scroll),w=scroll.clientWidth-parseFloat(cs.paddingLeft)-parseFloat(cs.paddingRight),h=scroll.clientHeight-parseFloat(cs.paddingTop)-parseFloat(cs.paddingBottom);
 const portrait=doc.documentElement.dataset.detailOrientation!=='landscape',zoom=dialog.dataset.stageZoom==='1';
 card.style.setProperty('--stage-scale',String(stageScale(w,h,{zoom,portrait})));
 const zoomable=Math.abs(stageScale(w,h,{zoom:true,portrait})-stageScale(w,h,{portrait}))>.05;card.toggleAttribute('data-zoomable',zoomable);
 // Landscape: the card itself is the zoom control, so the chip stays hidden (portrait keeps it).
 const chip=dialog.querySelector('.stage-zoom');if(chip){chip.hidden=!zoomable||!portrait;chip.textContent=zoom?'－ 縮小':'＋ 拡大';}
 // A cue when more of the card (stage) or more choices (band) lie below; it goes once scrolled to the end.
 for(const n of [scroll,dialog.querySelector('.stage-band')])if(n)n.toggleAttribute('data-more',n.scrollHeight-n.clientHeight-n.scrollTop>2);
}
// Refit whenever the stage changes size (orientation, Safari bars, a different number of buttons).
let stageObserver=null;
export function watchStage(dialog,doc=document,win=window){
 stageObserver?.disconnect();stageObserver=null;
 const scroll=dialog?.querySelector('.stage-scroll');if(!scroll)return;
 fitStageCard(dialog,doc);
 if(win.ResizeObserver){stageObserver=new win.ResizeObserver(()=>fitStageCard(dialog,doc));stageObserver.observe(scroll);}
 for(const n of [scroll,dialog.querySelector('.stage-band')])n?.addEventListener('scroll',()=>fitStageCard(dialog,doc),{passive:true});
}
