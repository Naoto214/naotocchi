// Read-only geometry regression. Run in cards.html after fonts and images settle.
export function auditRarityLayout(doc){
 const failures=[],rows=[],check=(v,s)=>{if(!v)failures.push(s);},r=e=>e.getBoundingClientRect(),center=e=>(r(e).top+r(e).bottom)/2;
 for(const card of doc.querySelectorAll('.sample .card-face')){
  const box=r(card),name=card.getAttribute('aria-label')+' '+Math.round(box.width)+(card.classList.contains('compact')?' compact':' full'),footer=card.querySelector('.card-footer');
  check(footer?.textContent==='NAOTOCCHI',name+' signature');
  if(footer){const f=r(footer),curve=doc.defaultView.getComputedStyle(card,'::after');check(f.height>0,name+' signature visible');check(f.bottom<=box.bottom-parseFloat(curve.bottom)-parseFloat(curve.height)+1,name+' signature above bottom curve');}
  const marker=card.querySelector('.card-rarity');
  if(marker&&footer){const range=doc.createRange();range.selectNodeContents(footer);check(range.getBoundingClientRect().right<r(marker).left,name+' marker separate from signature');}
  const stats=card.querySelector('.card-stats');if(!stats)continue;
  const cells=[...stats.children],values=cells.map(c=>c.querySelector('b'));
  check(Math.abs(r(values[0]).width-r(values[1]).width)<.1,name+' digit lanes equal width');
  check(Math.abs(r(values[0]).height-r(values[1]).height)<.1,name+' digit lanes equal height');
  check(Math.abs(center(values[0])-center(values[1]))<.1,name+' values same vertical center');
  for(const cell of cells){
   const b=cell.querySelector('b'),style=doc.defaultView.getComputedStyle(b),icon=cell.querySelector('.icon');
   check(style.fontVariantNumeric.includes('lining-nums')&&style.fontVariantNumeric.includes('tabular-nums'),name+' lining tabular digits');
   check(Math.abs(center(b)-center(cell))<.2,name+' number centered in cell');
   check(Math.abs(center(icon)-center(b))<.2,name+' icon centered with number');
   check(r(cell).height<=r(stats).height+.2,name+' cell fits fixed stat row');
   check(r(b).left>=r(cell).left&&r(b).right<=r(cell).right,name+' number fits cell');
   const label=cell.querySelector('small');if(label&&r(label).width){check(r(label).right<=r(b).left+.2,name+' label separate from number');check(Math.abs(center(label)-center(b))<.2,name+' label centered');}
  }
  rows.push({name,statHeight:r(stats).height,values:values.map(v=>({text:v.textContent,width:r(v).width,height:r(v).height,center:center(v)-box.top,font:doc.defaultView.getComputedStyle(v).font}))});
 }
 return {passed:rows.length>0&&!failures.length,failures,rows};
}
