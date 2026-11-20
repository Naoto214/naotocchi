// Owner-only bridge shared by both native arms. An early provisional layout can
// retain some feet after the camera has settled. Seat the stationary fixture
// once on its final native navigation before exposing the game.
(() => {
  const paired = new URLSearchParams(location.search).get('paired') === '1';
  let opening, reseat, controller;
  if (paired) {
    const api = window.NaotocchiHomeDioramaModel, cast = window.HomeCastTrial;
    const create = api.createModel, attach = cast.attach;
    cast.attach = value => {
      cast.attach = attach;
      controller = value;
      attach(value);
    };
    api.createModel = function (options) {
      if (options?.random !== window.HomeBeauty.actorRandom) return create(options);
      api.createModel = create;
      let random = options.random;
      const model = create({...options,random:()=>random()});
      const sync = model.sync;
      let inputs;
      model.sync = (rows, scene) => {
        if (scene.navigation && rows.length) inputs = [rows,scene];
        return sync(rows,scene);
      };
      reseat = () => {
        if (!controller || !inputs || inputs[0].length !== cast.settings.count) return false;
        model.sync = sync;
        // This is the same seed and generator as the pinned V5 actor fixture.
        // Both arms consume it from their shared first movement deadline onward.
        let seed = 214;
        random = () => {
          seed = (Math.imul(1664525,seed) + 1013904223) >>> 0;
          return seed / 4294967296;
        };
        const [rows,scene] = inputs;
        sync([],scene);
        sync(rows,scene);
        controller.repaint();
        return true;
      };
      return model;
    };
  }

  window.HomeDragTrial = Object.freeze({
    opening() {
      if (opening) return opening;
      const cast = window.HomeCastTrial, beauty = window.HomeBeauty;
      if (!cast?.ready || !cast.settings.paused || !beauty?.frozen || beauty.clockSeconds !== 0) return null;
      if (paired) {
        if (!reseat?.()) return null;
        reseat = undefined;
        controller = undefined;
      }
      const actors = cast.inspect();
      if (!actors.length || actors.length !== cast.settings.count ||
          actors.some(a => !Number.isFinite(a.x) || !Number.isFinite(a.y) || a.target)) return null;
      const {region,time,season,weather,variant} = beauty.settings;
      const household = actors.map(({key,asset,x,y,w,h}) => Object.freeze([key,asset,x,y,w,h]));
      opening = Object.freeze({region,time,season,weather,variant,clock:beauty.clockSeconds,
        width:innerWidth,height:innerHeight,actors:Object.freeze(household)});
      return opening;
    },
  });
})();
