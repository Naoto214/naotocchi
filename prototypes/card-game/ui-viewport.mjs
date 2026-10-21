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
