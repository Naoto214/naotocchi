// Installed only by the browser regression harness. The native model owns every step.
(() => {
  const qa = window.touchQA;
  const safety = {steps:0, terrain:0, bounds:0, occlusion:0, speed:0, swept:0, examples:[]};
  qa.auditMobilityStep = (a,p,dt,speed,scene,actors,bounds,visible) => {
    if (!qa.ageActive) return;
    safety.steps++;
    const b=bounds(a,scene);
    if (scene.navigation && !scene.navigation.segmentSafe(a,p)) safety.terrain++;
    if (!visible(a,p)) safety.occlusion++;
    if (p.x<b.left-1e-6 || p.x>b.right+1e-6 || p.y<b.top-1e-6 || p.y>b.bottom+1e-6) safety.bounds++;
    if (Math.hypot(p.x-a.x,p.y-a.y)>speed*dt+1e-5) safety.speed++;
    for (const peer of actors) {
      if (peer===a) continue;
      const rx=(a.w+peer.w)*.5+10, ry=(a.h+peer.h)*.38+10;
      const x=(a.x-peer.x)/rx, y=(a.y-peer.y)/ry, dx=(p.x-a.x)/rx, dy=(p.y-a.y)/ry;
      const t=Math.max(0,Math.min(1,-(x*dx+y*dy)/(dx*dx+dy*dy||1)));
      const penetration=Math.min(1,Math.hypot(x,y))-Math.hypot(x+t*dx,y+t*dy);
      if (penetration>1e-9) {
        safety.swept++;
        if (safety.examples.length<30) safety.examples.push({key:a.key,peer:peer.key,source:a.source,clock:qa.model.metrics().clock,
          pointerDrop:!!a.pointerDrop,escape:!!a.ambientEscape,from:[a.x,a.y],to:[p.x,p.y],peerFoot:[peer.x,peer.y],rx,ry,
          clearanceAtStart:Math.hypot(x,y),clearanceAtEnd:Math.hypot(x+dx,y+dy),deepest:Math.hypot(x+t*dx,y+t*dy),penetration});
      }
    }
  };
  qa.ageSafety = safety;
  qa.footFrame = () => {
    const scale=NaotocchiHomeViewport.residentPresentation();
    const items=HomeCastTrial.inspect();
    let maxAnchorErrorCss=0, outsideActorBounds=0, nonGround=0, hidden=0, painted=0;
    const keys=[];
    for (const a of items) {
      const el=document.querySelector('[data-diorama-actor="'+CSS.escape(a.key)+'"]');
      const rect=el?.getBoundingClientRect();
      if (!el||!rect||!rect.width||!rect.height) throw Error('Unrendered actor '+a.key);
      const xy=s=>s.split(/\s+/).map(parseFloat);
      const [ox,oy]=xy(el.style.transformOrigin), [tx,ty]=xy(el.style.translate);
      const x=parseFloat(el.style.left)+ox+(tx||0), y=parseFloat(el.style.top)+oy+(ty||0);
      if (!Number.isFinite(x)||!Number.isFinite(y)) throw Error('Missing painted foot '+a.key);
      maxAnchorErrorCss=Math.max(maxAnchorErrorCss,Math.hypot((x-a.x)*scale.scaleX,(y-a.y)*scale.scaleY));
      const terrain=qa.classify(a.key,{x:a.x,y:a.y});
      outsideActorBounds+=!terrain.insideBounds; nonGround+=!terrain.terrain; hidden+=!terrain.visible;
      painted++;keys.push(a.key);
    }
    return {clock:qa.model.metrics().clock,painted,keys,maxAnchorErrorCss,outsideActorBounds,nonGround,hidden};
  };
  qa.ageTo = sec => {
    qa.ageActive=true;
    qa.advance(sec,true);
    return qa.footFrame();
  };
})();
