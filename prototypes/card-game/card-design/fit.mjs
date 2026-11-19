import {layout as originalLayout} from './fit-base.mjs';
const canvas=document.createElement('canvas'),ctx=canvas.getContext('2d');
export function layout(root=document){
 if(ctx)for(const g of root.querySelectorAll('.v11-card .v8-glyph')){
  g.style.fontSize='';const s=getComputedStyle(g),base=Number.parseFloat(s.fontSize);
  ctx.font=`${s.fontWeight} ${base}px ${s.fontFamily}`;ctx.fontKerning='none';
  const zero=ctx.measureText('0'),m=ctx.measureText(g.textContent),height=m.actualBoundingBoxAscent+m.actualBoundingBoxDescent,target=zero.actualBoundingBoxAscent+zero.actualBoundingBoxDescent;
  if(height&&target)g.style.fontSize=base*target/height+'px';
 }
 originalLayout(root);
 if(ctx)for(const n of root.querySelectorAll('.v11-card [data-optical]')){
  n.style.setProperty('--opt-x','0px');n.style.setProperty('--opt-y','0px');
  const g=n.querySelector('.v8-glyph'),s=getComputedStyle(g),r=g.getBoundingClientRect(),target=n.parentElement.getBoundingClientRect(),baseline=n.querySelector('.v8-baseline').getBoundingClientRect().top;
  ctx.font=`${s.fontWeight} ${s.fontSize} ${s.fontFamily}`;ctx.fontKerning='none';
  const m=ctx.measureText(g.textContent),card=n.closest('.v11-card'),scale=card.getBoundingClientRect().width/card.clientWidth;if(!scale||!r.width)continue;
  n.style.setProperty('--opt-x',((target.left+target.width/2-r.left)/scale-(m.actualBoundingBoxRight-m.actualBoundingBoxLeft)/2)+'px');
  n.style.setProperty('--opt-y',((target.top+target.height/2-baseline)/scale+(m.actualBoundingBoxAscent-m.actualBoundingBoxDescent)/2)+'px');
 }
 // Layout uses ink bounds to center each normalized glyph, including transforms.
}
