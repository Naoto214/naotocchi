/* Read-only QA, evaluated only inside the geometry runner. */
function qaInputSample({snapshot, navigation, scene, model, scaleX, scaleY}) {
  const presentation = globalThis.NaotocchiHomeViewport?.residentPresentation?.();
  const sx = scaleX || presentation?.scaleX;
  const sy = scaleY || presentation?.scaleY;
  if (!(sx > 0 && sy > 0)) throw Error('Need native-to-screen X/Y scale for drag samples');
  const selected = ['pet', 'partner', 'companion']
    .map(kind => snapshot.find(a => a.kind === kind)).filter(Boolean);
  const result = {};
  for (const a of selected) {
    const b = model.bounds(a);
    const peers = snapshot.filter(other => other.key !== a.key);
    const clear = point => peers.every(other => {
      // V5's separated() ellipse in native coordinates. Using a fully clear
      // line counts direct exits conservatively when the old bodies overlap.
      const dx = (point.x - other.x) / ((a.w + other.w) * .5 + 10);
      const dy = (point.y - other.y) / ((a.h + other.h) * .38 + 10);
      return dx * dx + dy * dy >= 1;
    }) && (!scene.visible || scene.visible(point, a));
    const byRadius = [];
    for (const radius of [4, 12]) {
      let mask = 0;
      for (let index = 0; index < 8; index++) {
        const angle = Math.PI * index / 4;
        const p = {x: a.x + radius * Math.cos(angle) / sx, y: a.y + radius * Math.sin(angle) / sy};
        if (p.x < b.left || p.x > b.right || p.y < b.top || p.y > b.bottom) continue;
        if (navigation.valid(p) && clear(p) && navigation.segmentSafe(a, p, clear)) mask |= 1 << index;
      }
      byRadius.push(mask);
    }
    result[a.kind] = byRadius;
  }
  return result;
}
