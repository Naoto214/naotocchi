import {opticalOffset} from './presentation.mjs';
const ctx=document.createElement('canvas').getContext('2d');
export function fitNames(root=document){
 for(const e of root.querySelectorAll('[data-fit]')){
  e.style.fontSize='';const s=getComputedStyle(e),base=Number.parseFloat(s.fontSize),span=e.querySelector('span');if(!span||!e.clientWidth)continue;
  const width=span.getBoundingClientRect().width,target=e.clientWidth-.6;
  if(width>target)e.style.fontSize=(base*target/width)+'px';
  e.dataset.fitted='true';
  if(e.classList.contains('v8-title')){const aux=e.parentElement.querySelector('.v8-aux');if(aux)aux.style.top=`calc(13.5cqw + ${e.getBoundingClientRect().height}px + .45cqw)`;}
 }
}
export function alignNumbers(root=document){
 if(!ctx)return;const all=[...root.querySelectorAll('[data-optical]')];
 for(const n of all){n.style.setProperty('--opt-x','0px');n.style.setProperty('--opt-y','0px');}
 const offsets=all.map(n=>{const glyph=n.querySelector('.v8-glyph'),s=getComputedStyle(glyph),g=glyph.getBoundingClientRect(),r=n.parentElement.getBoundingClientRect();ctx.font=`${s.fontStyle} ${s.fontWeight} ${s.fontSize} ${s.fontFamily}`;const m=ctx.measureText(glyph.textContent);if(!g.width||Math.abs(m.width-g.width)>.75)return null;const o=opticalOffset({targetX:r.left+r.width/2,targetY:r.top+r.height/2,left:g.left,baseline:n.querySelector('.v8-baseline').getBoundingClientRect().top,leftBearing:m.actualBoundingBoxLeft,rightBearing:m.actualBoundingBoxRight,ascent:m.actualBoundingBoxAscent,descent:m.actualBoundingBoxDescent,fontSize:Number.parseFloat(s.fontSize)});if(o&&glyph.textContent==='1')o.x+=Number.parseFloat(s.fontSize)*.025;return o;});
 all.forEach((n,i)=>{const o=offsets[i];n.style.setProperty('--opt-x',(o?.x??0)+'px');n.style.setProperty('--opt-y',o?o.y+'px':'.04em');n.dataset.aligned=o?'metrics':'fallback';});
}
export function layout(root=document){fitNames(root);alignNumbers(root);}
