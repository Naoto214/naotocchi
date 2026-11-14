import {opticalOffset} from './presentation.mjs';
const context=document.createElement('canvas').getContext('2d');
const originals=new WeakMap();
export function alignStats(root=document){
 if(!context)return;
 const numbers=[...root.querySelectorAll('.stats-refined .stat-number')].filter(n=>!n.closest('.is-flipped'));
 for(const n of numbers){n.style.setProperty('--stat-x','0px');n.style.setProperty('--stat-y','0px');}
 const offsets=numbers.map(n=>{
  const glyph=n.querySelector('.stat-glyph'),marker=n.querySelector('.stat-baseline'),s=getComputedStyle(glyph),r=glyph.getBoundingClientRect(),cell=n.parentElement.getBoundingClientRect();
  context.font=`${s.fontStyle} ${s.fontWeight} ${s.fontSize} ${s.fontFamily}`;context.textAlign='left';context.textBaseline='alphabetic';
  const m=context.measureText(glyph.textContent);if(!r.width||Math.abs(m.width-r.width)>.75)return null;
  const o=opticalOffset({targetX:cell.left+cell.width/2,targetY:cell.top+cell.height/2,left:r.left,baseline:marker.getBoundingClientRect().top,leftBearing:m.actualBoundingBoxLeft,rightBearing:m.actualBoundingBoxRight,ascent:m.actualBoundingBoxAscent,descent:m.actualBoundingBoxDescent,fontSize:parseFloat(s.fontSize)});
  if(o&&glyph.textContent==='1')o.x+=parseFloat(s.fontSize)*.025;return o;
 });
 numbers.forEach((n,i)=>{const o=offsets[i];n.style.setProperty('--stat-x',(o?.x??0)+'px');n.style.setProperty('--stat-y',o?o.y+'px':'.04em');n.dataset.aligned=o?'metrics':'fallback';});
}
function renderPrefix(content,blocks,count,total){
 content.replaceChildren();let remaining=count,last=null,pending=[];
 for(const b of blocks){
  if(b.tagName!=='P'){pending.push(b);continue;}
  if(remaining<=0)break;
  for(const head of pending)content.append(head.cloneNode(true));pending=[];
  const p=b.cloneNode(false),chars=Array.from(b.textContent);p.textContent=chars.slice(0,remaining).join('');remaining-=Math.min(remaining,chars.length);content.append(p);last=p;
 }
 if(last&&count<total)last.textContent+='…';
}
export function fitRules(root=document){
 for(const box of root.querySelectorAll('.face-v7.copy-refined .rules')){
  if(box.closest('.is-flipped'))continue;
  const content=box.querySelector('.rules-content'),notice=box.querySelector('.rules-notice');
  if(!originals.has(box))originals.set(box,[...content.children].map(e=>e.cloneNode(true)));
  const blocks=originals.get(box),text=blocks.filter(b=>b.tagName==='P').map(b=>b.textContent).join(''),total=Array.from(text).length;
  box.classList.remove('is-excerpt');notice.hidden=true;renderPrefix(content,blocks,total,total);
  const s=getComputedStyle(box),space=box.clientHeight-parseFloat(s.paddingTop)-parseFloat(s.paddingBottom);
  const fits=()=>content.getBoundingClientRect().height<=space-1;
  box.dataset.fullLength=total;
  if(fits()){box.dataset.display='full';box.dataset.visibleLength=total;continue;}
  box.classList.add('is-excerpt');notice.hidden=false;
  const available=space-notice.getBoundingClientRect().height-parseFloat(s.fontSize)*.5;
  let lo=0,hi=total;
  while(lo<hi){const mid=Math.ceil((lo+hi)/2);renderPrefix(content,blocks,mid,total);if(content.getBoundingClientRect().height<=available-1)lo=mid;else hi=mid-1;}
  const prefix=Array.from(text).slice(0,lo).join('');let end=prefix.lastIndexOf('。')+1;
  if(end<lo*.55)end=prefix.lastIndexOf('、')+1;
  if(end<lo*.6)end=lo;
  renderPrefix(content,blocks,end,total);box.dataset.display='excerpt';box.dataset.visibleLength=end;
 }
}
