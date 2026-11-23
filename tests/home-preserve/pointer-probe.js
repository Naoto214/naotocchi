// Observe the native controller and choose a reachable drop near the actor.
const pointerEvents = [], commands = [];
for (const type of ['pointerdown', 'pointermove', 'pointerup', 'pointercancel']) {
  stage.addEventListener(type, e => pointerEvents.push([type, e.pointerType, e.isTrusted]), true);
}
const nativeMove = model.move;
model.move = function(key, p, source) {
  const ok = nativeMove.call(this, key, p, source);
  commands.push({key, source, ok});
  return ok;
};
window.pointerProbe = {
  ready: () => model.snapshot().length === 2 && !pendingResidentPresentation && !blocked() &&
    world?.stats().loaded && [...rows.values()].every(r => r.owner.querySelector('img.character-asset')?.naturalWidth),
  plan(index) {
    const people = model.snapshot(), actor = people[index];
    const rect = rows.get(actor.key).owner.querySelector('img.character-asset').getBoundingClientRect();
    let from;
    for (const fy of [.5, .4, .6, .7, .8]) for (const fx of [.5, .4, .6, .3, .7]) {
      const clientX = Math.round(rect.x + fx * rect.width), clientY = Math.round(rect.y + fy * rect.height);
      if (hit(point({clientX, clientY}), doc.elementFromPoint(clientX, clientY)) === actor.key) {
        from = [clientX, clientY];
        break;
      }
    }
    if (!from) throw Error('No hit on '+actor.key);
    const v = env.NaotocchiHomeViewport.residentPresentation(), sr = displayRect(stage), box = model.bounds(actor);
    for (let k = 0; k < 16; k++) {
      const p = {x: actor.x + 24*Math.cos(k*Math.PI/8)/v.scaleX, y: actor.y + 24*Math.sin(k*Math.PI/8)/v.scaleY};
      if (p.x < box.left || p.x > box.right || p.y < box.top || p.y > box.bottom) continue;
      const clear = q => visibleAt(q, actor) && people.every(b => b.key === actor.key || Math.hypot(
        (q.x-b.x)/((actor.w+b.w)*.5+10), (q.y-b.y)/((actor.h+b.h)*.38+10)) >= 1);
      if (!scene.navigation.segmentSafe(actor,p,clear)) continue;
      const goal = [Math.round(v.x+(sr.left+p.x-v.x)*v.scaleX), Math.round(v.y+(sr.top+p.y-v.y)*v.scaleY)];
      if (Math.hypot(goal[0]-from[0], goal[1]-from[1])>=12)
        return {key:actor.key, foot:[actor.x,actor.y], from, goal};
    }
    throw Error('No reachable drop for '+actor.key);
  },
  sample(index) {
    const a = model.snapshot()[index];
    return {selected:model.selected(), foot:[a.x,a.y], commands, pointerEvents};
  }
};
