// Injected only in disposable Chromium pages. Record native CSS pixels before rounding for reports.
regional.placement = function() {
  const actors = model.snapshot();
  const frame = stage.closest('.screen-frame').getBoundingClientRect();
  window.regionalPaintedCover = null;
  window.regionalMeasuringArt = true;
  try { world.draw(0,{reducedMotion:true}); }
  finally { window.regionalMeasuringArt = false; }
  const [left,top,width,height] = window.regionalPaintedCover;
  const r = displayRect(stage), v = env.NaotocchiHomeViewport.residentPresentation();
  const spec = window.regionalScenes[scene.region];
  const toScreen = a => [
    v.x + (r.left+a.x-v.x)*v.scaleX,
    v.y + (r.top+a.y-v.y)*v.scaleY
  ];
  const feet = actors.map(a => {
    const [x,y]=toScreen(a);
    const art = [(x - left) / width, (y - top) / height];
    const native = scene.navigation.unproject(a);
    const bounds = model.bounds(a);
    const row = rows.get(a.key);
    return {key:a.key, kind:a.kind, stage:[a.x,a.y], screen:[x,y], solverScreen:toScreen(row), art,
      surface:world.groundSurface?.(a.x,a.y)||'', nativeArt:[native.x,native.z], size:[a.w,a.h], layer:Number(row.owner.style.zIndex),
      valid:scene.navigation.valid(a), visible:scene.visible(a,a),
      painted:window.regionalInside(art[0],art[1],spec.ground) && !(spec.exclude||[]).some(poly=>window.regionalInside(art[0],art[1],poly)),
      boundMargin:Math.min(a.x-bounds.left,bounds.right-a.x,a.y-bounds.top,bounds.bottom-a.y),
      edge:Math.min(x-frame.left,frame.right-x,y-frame.top,frame.bottom-y),
      horizontalEdge:Math.min(x-frame.left,frame.right-x)};
  });
  let contacts = [];
  for (let i=0;i<actors.length;i++) for (const b of actors.slice(i+1)) {
    const a=actors[i], distance=Math.hypot((a.x-b.x)/((a.w+b.w)*.5+10),(a.y-b.y)/((a.h+b.h)*.38+10));
    if (distance<1-1e-7) contacts.push([a.key,b.key,distance]);
  }
  return {region:scene.region,clock:model.metrics().clock,feet,contacts,
    frame:[frame.left,frame.top,frame.right,frame.bottom], cover:[left,top,width,height]};
};
regional.resync = function() {sync();return regional.placement();};
