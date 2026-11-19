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
          const result = sync(list,scene);
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
