import {opticalOffset} from './presentation.mjs';
// The circle is never measured into a new position. Only its inner glyph moves.
const context=document.createElement('canvas').getContext('2d');
export function alignCostDigits(root=document){
 if(!context)return;
 const numbers=[...root.querySelectorAll('.face-v5 .cost-number')].filter(n=>!n.closest('.is-flipped'));
 numbers.forEach(n=>{n.style.setProperty('--digit-x','0px');n.style.setProperty('--digit-y','0px');});
 const measurements=numbers.map(n=>{
  const glyph=n.querySelector('.cost-glyph'),marker=n.querySelector('.cost-baseline');
  const style=getComputedStyle(glyph),box=glyph.getBoundingClientRect(),circle=n.parentElement.getBoundingClientRect();
  if(!box.width||!circle.width)return null;
  context.font=`${style.fontStyle} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
  context.textAlign='left';context.textBaseline='alphabetic';
  const m=context.measureText(glyph.textContent);
  // Some fallback fonts differ between Canvas and DOM. Do not trust mismatched metrics.
  if(Math.abs(m.width-box.width)>.75)return null;
  const offset=opticalOffset({targetX:circle.left+circle.width/2,targetY:circle.top+circle.height/2,left:box.left,baseline:marker.getBoundingClientRect().top,leftBearing:m.actualBoundingBoxLeft,rightBearing:m.actualBoundingBoxRight,ascent:m.actualBoundingBoxAscent,descent:m.actualBoundingBoxDescent,fontSize:parseFloat(style.fontSize)});
  // The narrow 1 has a left-heavy stem: a small optical nudge balances its visible weight.
  if(offset&&glyph.textContent==='1')offset.x+=parseFloat(style.fontSize)*.025;
  return offset;
 });
 numbers.forEach((n,i)=>{const o=measurements[i];if(o){n.style.setProperty('--digit-x',o.x+'px');n.style.setProperty('--digit-y',o.y+'px');n.dataset.aligned='metrics';}else{n.style.setProperty('--digit-x','0px');n.style.setProperty('--digit-y','.04em');n.dataset.aligned='fallback';}});
}
