// Synthetic v8 QA only. The production model remains the movement authority.
module.exports = function moveForQA(model,navigation) {
  const a = model.snapshot().find(a => a.kind === 'pet');
  if (!a) return false;
  const b = model.bounds(a);
  model.select(a.key);
  for (const p of [{x:b.right,y:b.bottom-5},{x:b.left,y:b.bottom-5},
    {x:a.x+40,y:a.y},{x:a.x-40,y:a.y},{x:a.x,y:a.y+35},{x:a.x,y:a.y-35}]) {
    if (model.move(a.key,p,'ground')) return true;
  }
  // The reserved crowd exit can be diagonal. Six fixed probes do not prove
  // immobility. Search within the same bounds; model.move still enforces
  // terrain, foreground visibility, body separation and a complete route.
  for (let y=b.top;y<=b.bottom;y+=4) for (let x=b.left;x<=b.right;x+=4) {
    if (Math.hypot(x-a.x,y-a.y)<12 || !navigation.valid({x,y})) continue;
    if (model.move(a.key,{x,y},'ground')) return true;
  }
  return false;
};
