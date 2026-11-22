// Added only by the localhost browser test, inside the shipped controller.
window.regional = {
  ready(region, count) {
    return enabled && scene?.region === region && world?.stats().loaded &&
      scene.navigation && model.snapshot().length === count && !pendingResidentPresentation &&
      [...stage.querySelectorAll('img.character-asset')].every(i => i.complete && i.naturalWidth);
  },
  target() {
    const actors = model.snapshot();
    const view = env.NaotocchiHomeViewport;
    const v = view.residentPresentation();
    const r = displayRect(stage);
    for (const a of actors) {
      const x = v.x + (r.left + a.x - v.x) * v.scaleX;
      const y = v.y + (r.top + a.y - v.y) * v.scaleY;
      for (const dy of [.4,.2,.6,.8]) for (const dx of [0,-.2,.2,-.4,.4]) {
        const from = [Math.round(x+a.w*v.bodyScale*dx),Math.round(y-a.h*v.bodyScale*dy)];
        const el = document.elementFromPoint(...from);
        if (el?.closest('[data-diorama-actor]') !== rows.get(a.key)?.owner) continue;
        const goal = [Math.round(x+(x>innerWidth/2?-28:28)),Math.round(y)];
        return {key:a.key,from,goal};
      }
    }
    return null;
  },
  summary() {
    return {world:world.stats(),region:scene.region,clock:model.metrics().clock,
      selected:model.selected(),count:model.snapshot().length,shadows:stage.querySelectorAll('.diorama-shadow').length,
      time:stage.dataset.dioramaTime,blocked:blocked()};
  },
  advance(seconds) {
    window.regionStepping=true;
    try { for(let i=0;i<seconds*10;i++) model.step(.1,{blocked:false,reducedMotion:false}); }
    finally { window.regionStepping=false; }
    paint();
  }
};
for (const name of ['move','select']) {
  const original=model[name];
  model[name]=function(...args) {
    const result=original.apply(this,args);
    window.regionTrace.commands.push({name,key:args[0],ok:result});
    return result;
  };
}
