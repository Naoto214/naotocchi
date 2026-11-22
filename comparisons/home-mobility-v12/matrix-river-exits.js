// Read-only geometry replay, 96 CSS bearings for each resident and radius.
// Use the production sweep and the same strict first native integration step as curvedHandoff.
qa.riverExits = rows => {
  const nav=scene.navigation,s=nav.intentScale;
  return Object.fromEntries(rows.map(b=>{
    const box=bounds(b,scene), ink=scene.planVisibility?.(b)||(p=>visible(b,p));
    const lens=[3,8,16].map(radius=>{
      const possible=[];
      for(let j=0;j<96;j++){
        const theta=Math.PI*j/48;
        const q={x:b.x+radius*Math.cos(theta)/s.x,y:b.y+radius*Math.sin(theta)/s.y};
        if(q.x<box.left || q.x>box.right || q.y<box.top || q.y>box.bottom)continue;
        if(!rows.every(peer=>{
          if(b.key===peer.key)return true;
          const rx=(b.w+peer.w)*.5+10,ry=(b.h+peer.h)*.38+10;
          if(!contactSegmentSafe(b,q,peer,rx,ry))return false;
          const before=Math.hypot((b.x-peer.x)/rx,(b.y-peer.y)/ry);
          if(before>=1)return true;
          const dt=Math.min(1,.35/Math.hypot(q.x-b.x,q.y-b.y));
          const next=Math.hypot((b.x+(q.x-b.x)*dt-peer.x)/rx,(b.y+(q.y-b.y)*dt-peer.y)/ry);
          return next>=1 || next>before+1e-6;
        }))continue;
        if(nav.segmentSafe(b,q,ink))possible.push(j);
      }
      return [radius,possible];
    });
    return [b.key,Object.fromEntries(lens)];
  }));
};
