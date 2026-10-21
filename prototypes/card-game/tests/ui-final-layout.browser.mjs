// Browser geometry regression: restores of the old heading offsets or constrained
// tutorial rows fail these assertions. Call after fonts/layout settle.
export function auditLayout(doc){
 const failures=[],r=e=>e.getBoundingClientRect(),check=(ok,name)=>{if(!ok)failures.push(name);};
 const centerY=e=>{const b=r(e);return b.y+b.height/2;};
 const cards=[...doc.querySelectorAll('section>.main-face')];
 const boxes=cards.map((c,i)=>{
  const h=c.querySelector('.card-heading'),category=c.querySelector('.card-category'),title=c.querySelector('.card-title'),species=c.querySelector('.card-species'),badge=c.querySelector('.card-cost'),attribute=c.querySelector('.card-attribute');
  const hb=r(h);check(Math.abs(centerY(badge)-centerY(h))<1,`card ${i}: stage circle centered vertically`);
  check(Math.abs(centerY(attribute)-centerY(h))<1,`card ${i}: attribute lane centered vertically`);
  check(r(category).bottom<=r(title).top+.2,`card ${i}: category does not overlap title`);
  for(const n of [category,title,species,badge,attribute]){const b=r(n);check(b.left>=hb.left-.2&&b.right<=hb.right+.2&&b.top>=hb.top-.2&&b.bottom<=hb.bottom+.2,`card ${i}: ${n.className} inside heading`);}
  return Object.fromEntries(['card-heading','card-title','card-art','card-stats','card-copy','card-footer'].map(s=>{const b=r(c.querySelector('.'+s)),a=r(c);return [s,{x:b.x-a.x,y:b.y-a.y,width:b.width,height:b.height}];}));
 });
 const practice=doc.querySelector('#tutorial-match');let tutorial=null;
 if(practice&&r(practice).height>0){
  const own=practice.querySelector('.player-board.own'),cpu=practice.querySelector('.player-board.opponent'),panel=doc.querySelector('#tutorial-operation-panel'),hand=doc.querySelector('#tutorial-hand');
  const shells=[...practice.querySelectorAll('.board-shell')];
  for(const n of practice.querySelectorAll('.opponent .board-card-name')){const b=r(n),p=r(n.parentElement);if(b.width)check(b.left>=p.left-.2&&b.right<=p.right+.2&&b.top>=p.top-.2&&b.bottom<=p.bottom+.2,'CPU non-main label remains inside button');}

  for(const s of shells){check(s.scrollHeight<=s.clientHeight+1,'board has no clipped internal scroll area');}
  check(practice.querySelectorAll('.own .slot').length===9,'own board has nine slots');
  check(practice.querySelectorAll('.opponent .slot').length===9,'CPU board has nine slots');
  for(const s of practice.querySelectorAll('.own .slot')){const b=r(s),p=r(panel);check(b.right<=p.left||b.left>=p.right||b.bottom<=p.top||b.top>=p.bottom,'own slot does not overlap operation panel');}
  check(r(hand).top>=r(panel).bottom-1,'hand follows operation panel');
  tutorial={own:r(own).toJSON(),cpu:r(cpu).toJSON(),panel:r(panel).toJSON(),hand:r(hand).toJSON(),shells:shells.map(s=>({client:s.clientHeight,scroll:s.scrollHeight})),preparation:[...practice.querySelectorAll('.own .slot')].slice(-3).map(s=>r(s).toJSON())};
 }
 return {passed:(cards.length>0||tutorial!==null)&&failures.length===0,failures,cards:boxes,tutorial};
}
