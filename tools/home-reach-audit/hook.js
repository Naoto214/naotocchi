// All overrides are confined to generated audit pages. No save or game edits.
window.ReachAudit={
 restore(list,flags={}){
  window.__reachAblation=flags;const d=MovementQA.detail(),p=d.presentation,s=d.stage;
  const inverse=q=>{const u=NaotocchiHomeViewport.unscalePoint(q);return {x:u.x-s.left,y:u.y-s.top};};
  const tl=inverse({x:d.frame.left,y:d.frame.top}),br=inverse({x:d.frame.right,y:d.frame.bottom});window.__reachFullBounds={left:tl.x,right:br.x,top:tl.y,bottom:br.y};
  MovementQA.model().auditRestore(list);MovementQA.step(0);window.HomeReleaseInputTrace.length=0;
 },
 origin(key){const d=MovementQA.detail(),a=d.actors.find(a=>a.key===key),node=document.querySelector('[data-diorama-actor="'+key+'"]'),r=node.getBoundingClientRect(),k=d.presentation.bodyScale;
  // Both the actual DOM hit and production controller hitbox must contain the point.
  for(let y=Math.max(r.top+1,a.foot.y-a.h*k+1);y<Math.min(r.bottom,a.foot.y)-1;y+=2)for(let x=Math.max(r.left+1,a.foot.x-a.w*k/2+1);x<Math.min(r.right,a.foot.x+a.w*k/2)-1;x+=2){const point={x:Math.round(x),y:Math.round(y)};if(document.elementFromPoint(point.x,point.y)?.closest('[data-diorama-actor]')===node)return point;}
  return null;
 },
 capture(key){const d=MovementQA.detail(),a=d.actors.find(a=>a.key===key),all=MovementQA.inkRects().filter(r=>r.key===key),body=all.filter(r=>r.src.includes('/characters/'));
  const union=rs=>rs.length?{left:Math.min(...rs.map(r=>r.left)),right:Math.max(...rs.map(r=>r.right)),top:Math.min(...rs.map(r=>r.top)),bottom:Math.max(...rs.map(r=>r.bottom))}:null;
  return {actor:a,body:union(body),withItems:union(all),trace:window.__reachTrace,input:HomeReleaseInputTrace.filter(t=>t.type==='move').at(-1),frame:d.frame,presentation:d.presentation,viewport:d.viewport};
 },
 layers(key,point){const d=MovementQA.detail(),a=d.actors.find(a=>a.key===key),s=HomeReleaseQA.inspect().scene,b=a.bounds;
  const contacts=d.actors.filter(c=>c.key!==key&&Math.hypot((point.x-c.x)/((a.w+c.w)*.5+10),(point.y-c.y)/((a.h+c.h)*.38+10))<1).map(c=>c.key);
  return {bounds:point.x>=b.left&&point.x<=b.right&&point.y>=b.top&&point.y<=b.bottom,polygon:s.navigation.valid(point),occlusion:s.visible(point,a),contacts};
 }
};
