const mount=document.getElementById('mount'),out=document.getElementById('out');
const settle=()=>new Promise(r=>setTimeout(r,25));
async function frame(width,hash=''){mount.replaceChildren();const f=document.createElement('iframe');f.style.cssText=`width:${width}px;height:844px;border:0`;mount.append(f);await new Promise(r=>{f.onload=r;f.src='index.html'+hash});f.contentDocument.documentElement.style.scrollbarWidth='none';await f.contentDocument.fonts.ready;await settle();return f}
document.getElementById('cover').onclick=()=>{out.hidden=true;return frame(390)};
document.getElementById('prose').onclick=()=>{out.hidden=true;return frame(390,'#chapter-1')};
document.getElementById('rotate').onclick=async()=>{
 const f=mount.querySelector('iframe'),w=f.contentWindow,d=f.contentDocument;
 const cap=()=>{const y=d.querySelector('.toolbar').getBoundingClientRect().bottom+12;const n=[...d.querySelectorAll('.source')].find(n=>n.getBoundingClientRect().bottom>y);const r=n.getBoundingClientRect();return {index:n.dataset.sourceIndex,offset:(r.top-y)/r.height}};
 const p=d.querySelector('[data-source-index="185"]');p.scrollIntoView();await new Promise(r=>setTimeout(r,250));const before=cap();
 f.style.width='844px';f.style.height='390px';await new Promise(r=>setTimeout(r,250));const landscape=cap();
 const overflow=d.documentElement.scrollWidth>w.innerWidth;
 f.style.width='390px';f.style.height='844px';await new Promise(r=>setTimeout(r,250));const after=cap();
 out.hidden=false;out.textContent=JSON.stringify({rotation:true,before,landscape,after,overflow,pass:before.index===landscape.index&&before.index===after.index&&Math.abs(before.offset-landscape.offset)<.04&&Math.abs(before.offset-after.offset)<.04},null,2);
};
document.getElementById('run').onclick=async()=>{
 const expected=await (await fetch('manuscript.json')).json(),results=[];
 for(const width of [320,375,390,430])for(const size of [16,16.5,19,21]){
  const f=await frame(width),d=f.contentDocument,w=f.contentWindow;
  d.querySelector(`[data-size="${size}"]`).click();await settle();
  const ps=[...d.querySelectorAll('.chapter p')],clipped=[],badStart=[],badEnd=[],orphans=[];
  for(const p of ps){const rows=[];const walker=d.createTreeWalker(p,NodeFilter.SHOW_TEXT);let n;
   while(n=walker.nextNode()){if(n.parentElement.closest('.pdf-wrap'))continue;for(let i=0;i<n.length;i++){const r=d.createRange();r.setStart(n,i);r.setEnd(n,i+1);const b=r.getBoundingClientRect();if(!b.width)continue;let row=rows.find(x=>Math.abs(x.y-b.top)<2);if(!row){row={y:b.top,text:'',left:b.left,right:b.right};rows.push(row)}row.text+=n.data[i];row.right=Math.max(row.right,b.right)}}
   for(const r of rows){if(/^[、。，．！？）」』】〕〉》]/.test(r.text))badStart.push(p.dataset.sourceIndex);if(/[（「『【〔〈《]$/.test(r.text))badEnd.push(p.dataset.sourceIndex);if(r.left<0||r.right>w.innerWidth+.5)clipped.push(p.dataset.sourceIndex)}
   if(rows.length>1&&rows.at(-1).text.length===1)orphans.push(p.dataset.sourceIndex);
  }
  const actual=[...d.querySelectorAll('.chapter .source')].map(x=>x.textContent);
  const p=ps[0].getBoundingClientRect(),cs=w.getComputedStyle(ps[0]);
  const menu=d.getElementById('reader-menu');menu.open=true;d.querySelector('nav a[href="#chapter-6"]').click();await settle();
  const h=d.querySelector('#chapter-6 h2').getBoundingClientRect(),bar=d.querySelector('.toolbar').getBoundingClientRect();
  const headings=[];
  for(const heading of d.querySelectorAll('.chapter h2')){
   d.querySelector('nav a[href="#'+heading.closest('.chapter').id+'"]').click();await settle();
   const hr=heading.getBoundingClientRect(),nr=heading.querySelector('.chapter-number').getBoundingClientRect(),tr=heading.querySelector('.chapter-title').getBoundingClientRect();
   headings.push({text:heading.textContent,gap:tr.left-nr.right,oneLine:hr.height<40,left:hr.left,right:hr.right,visible:hr.top>=d.querySelector('.toolbar').getBoundingClientRect().bottom,clipped:tr.right>w.innerWidth||tr.left<0});
  }
  const title=d.querySelector('h1'),ts=w.getComputedStyle(title),paper=w.getComputedStyle(d.documentElement).backgroundColor;
  results.push({headings,paper,titleColor:ts.color,titleWidth:title.getBoundingClientRect().width,width,viewport:w.innerWidth,size,computedSize:cs.fontSize,textOK:JSON.stringify(actual)===JSON.stringify(expected.slice(2).map(x=>x.text)),chapters:d.querySelectorAll('.chapter').length,images:d.querySelectorAll('img,figure,picture').length,overflow:d.documentElement.scrollWidth>w.innerWidth,left:p.left,right:w.innerWidth-p.right,wrap:cs.textWrap,indent:cs.textIndent,clipped,badStart,badEnd,orphans,menuClosed:!menu.open,chapterVisible:h.top>=bar.bottom&&h.top<bar.bottom+80});
  out.textContent=JSON.stringify({complete:false,results},null,2);
 }
 out.textContent=JSON.stringify({complete:true,total:results.length,results},null,2);
};
