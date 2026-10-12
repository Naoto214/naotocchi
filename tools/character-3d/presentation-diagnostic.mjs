// QA-only active-representation diagnostic. Never imported by production.
// Renderability is NOT proof of raster output, frustum inclusion or occlusion.
export function presentationState(presenter, actor, billboard = null) {
  const inst = presenter?.instanceOf(actor);
  if (!inst) return { mode: '2d', broken: !!presenter?.isBroken(actor), renderable: billboard == null ? null : !!billboard.visible, pixelVisibility: 'NOT_MEASURED' };
  const result = { mode: '3d', broken: false, renderable: false, pixelVisibility: 'NOT_MEASURED', reason: 'detached' };
  let attached = false;
  for (let o = inst.holder; o; o = o.parent) {
    if (!o.visible) return { ...result, reason: 'hidden' };
    if (![o.scale.x, o.scale.y, o.scale.z, o.position.x, o.position.y, o.position.z].every(Number.isFinite) || [o.scale.x, o.scale.y, o.scale.z].some(v => Math.abs(v) < 1e-8)) return { ...result, reason: 'transform' };
    if (o === presenter.scene) attached = true;
  }
  if (!attached || inst.disposed) return result;
  let meshes = 0;
  // Inspect body/face only. An accent sprite cannot hide a missing character.
  inst.root.traverse(o => {
    if (!o.isMesh || !o.geometry?.attributes?.position?.count) return;
    for (let q = o; q && q !== inst.holder; q = q.parent) if (!q.visible || [q.scale.x,q.scale.y,q.scale.z].some(v=>!Number.isFinite(v)||Math.abs(v)<1e-8)) return;
    const materials = Array.isArray(o.material) ? o.material : [o.material];
    if (materials.some(m => m && m.visible !== false && (!m.transparent || m.opacity > 0))) meshes++;
  });
  return { ...result, renderable: meshes > 0, reason: meshes ? null : 'no-body-mesh', meshes };
}
