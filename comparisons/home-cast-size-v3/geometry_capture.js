// Invoked only by Playwright, before the native production model registers.
(() => {
  let api;
  const captures = [];
  Object.defineProperty(window, 'NaotocchiHomeDioramaModel', {
    configurable: true, get: () => api,
    set(value) {
      const createModel = value.createModel;
      api = {...value, createModel(options) {
        const model = createModel(options);
        window.qaNative = model;
        const sync = model.sync;
        model.sync = (list, scene) => {
          // QA step batches reuse measured scene geometry while the viewport is
          // stationary. Native startup, real-pointer and timed RAF use originals.
          const nativeScene={...scene};
          if(scene.actorBounds)nativeScene.actorBounds=(a,b)=>window.qaStepGeometry?.bounds.get(a.key)||scene.actorBounds(a,b);
          if(scene.referenceBounds)nativeScene.referenceBounds=a=>window.qaStepGeometry?.refs.get(a.key)||scene.referenceBounds(a);
          if(scene.visible)nativeScene.visible=(p,a)=>window.qaStepGeometry?window.qaStepGeometry.visible(p,a):scene.visible(p,a);
          const result = sync(list,nativeScene);
          if (!scene.navigation || !list.length) return result;
          const nav = scene.navigation;
          const points = list.map((a,i) => {
            const uv=nav.unproject(nav.initialPoint(i,list.length));
            return [uv.x,uv.z];
          });
          window.qaLastScene = scene;
          const previous = captures.at(-1);
          if (!previous || nav!==previous.nav || previous.list.length!==list.length) {
            captures.push({nav,scene,list,points});
          }
          return result;
        };
        return model;
      }};
    }
  });
  window.qaSyncCaptures = captures;
})();
