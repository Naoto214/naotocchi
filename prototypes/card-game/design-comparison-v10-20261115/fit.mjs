const ctx=document.createElement('canvas').getContext('2d');
export function layout(root=document){
 for(const e of root.querySelectorAll('.v10-card [data-fit]')){
  e.style.fontSize='';const span=e.querySelector('span');if(!span)continue;
  const base=Number.parseFloat(getComputedStyle(e).fontSize),available=e.getBoundingClientRect().width,actual=span.getBoundingClientRect().width;
  if(available&&actual>available)e.style.fontSize=base*(available-.2)/actual+'px';
  if(e.classList.contains('v8-title')){const aux=e.parentElement.querySelector('.v8-aux');if(aux)aux.style.top=`calc(13.5cqw + ${Number.parseFloat(getComputedStyle(e).fontSize)*1.1}px + .45cqw)`;}
 }
 for(const e of root.querySelectorAll('.v10-copy')){
  e.style.fontSize='';let size=Number.parseFloat(getComputedStyle(e).fontSize),min=(e.classList.contains('v10-egg-copy')?8:9.6)*e.closest('.v10-card').clientWidth/320;
  while(e.scrollHeight>e.clientHeight+1&&size>min){size=Math.max(min,size-.2);e.style.fontSize=size+'px';}
  e.dataset.overflow=String(e.scrollHeight>e.clientHeight+1);
 }
 if(ctx)for(const n of root.querySelectorAll('.v10-card [data-optical]')){
  n.style.setProperty('--opt-x','0px');n.style.setProperty('--opt-y','0px');
  const g=n.querySelector('.v8-glyph'),s=getComputedStyle(g),r=g.getBoundingClientRect(),target=n.parentElement.getBoundingClientRect(),baseline=n.querySelector('.v8-baseline').getBoundingClientRect().top;
  ctx.font=`${s.fontWeight} ${s.fontSize} ${s.fontFamily}`;const m=ctx.measureText(g.textContent),scale=m.width?r.width/m.width:1;if(!scale||!r.width)continue;
  const x=(target.left+target.width/2-r.left)/scale-(m.actualBoundingBoxRight-m.actualBoundingBoxLeft)/2;
  const y=(target.top+target.height/2-baseline)/scale+(m.actualBoundingBoxAscent-m.actualBoundingBoxDescent)/2;
  n.style.setProperty('--opt-x',x+'px');n.style.setProperty('--opt-y',y+'px');
 }
 if(document.documentElement.hasAttribute('data-candidate'))for(const e of root.querySelectorAll('.board-card-name,.collection-pocket-label>span,#collection-card-name')){
  e.style.fontSize='';const s=getComputedStyle(e);if(s.display==='none'||!e.clientWidth)continue;const base=Number.parseFloat(s.fontSize);ctx.font=`${s.fontWeight} ${s.fontSize} ${s.fontFamily}`;const width=ctx.measureText(e.textContent).width,available=e.clientWidth;if(width>available)e.style.fontSize=base*available/width+'px';
 }
}
