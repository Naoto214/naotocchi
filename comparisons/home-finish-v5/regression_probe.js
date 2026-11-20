// Read-only observers. Each invocation uses the released controller and its live DOM.
(() => {
  let registeredModel;
  Object.defineProperty(window, 'NaotocchiHomeDioramaModel', {
    configurable: true,
    get: () => registeredModel,
    set(api) {
      registeredModel = {...api, createModel(...args) {
        const model = api.createModel(...args);
        const sync = model.sync;
        model.sync = function (list, scene) {
          const result = sync.call(model, list, scene);
          if (scene.navigation && list.length) window.regressionScene = scene;
          return result;
        };
        return model;
      }};
    }
  });

  const background = new WeakMap();
  const draw = CanvasRenderingContext2D.prototype.drawImage;
  CanvasRenderingContext2D.prototype.drawImage = function (source, ...args) {
    const result = draw.call(this, source, ...args);
    if (source instanceof HTMLImageElement && source.complete && source.naturalWidth &&
        source.currentSrc.includes('/comparisons/dayparts-')) {
      background.set(this.canvas, source);
    } else if (source instanceof HTMLCanvasElement && background.has(source) &&
               this.globalAlpha === 1 && this.canvas.isConnected &&
               this.canvas.classList.contains('home-art-canvas')) {
      window.regressionBackground = background.get(source);
    }
    return result;
  };

  const rect = node => {
    const {x,y,width,height} = node.getBoundingClientRect();
    return [x,y,width,height];
  };
  const asset = url => new URL(url, location.href).pathname.split('/game/').pop();
  const roleScale = {pet:1.2, partner:1.2, companion:1.05};

  window.regressionSample = ({region, count, width, height, finish}) => {
    const trial = window.HomeCastTrial;
    const stage = document.querySelector('#castStage');
    const viewport = window.NaotocchiHomeViewport?.residentPresentation?.();
    const scene = window.regressionScene;
    const painted = window.regressionBackground;
    const native = JSON.parse(stage?.dataset.livingMetrics || '{}').world;
    if (!trial?.ready || !viewport || !scene || !painted || !native?.loaded ||
        native.region !== region || stage.dataset.worldRenderer !== 'art-25d' ||
        innerWidth !== width || innerHeight !== height || trial.settings.width !== width) return false;

    // A resize event updates the policy before the native camera recomputes its layout.
    // Require the actual projected scene to hold across repeated browser frames.
    const cameraKey = JSON.stringify([width,height,viewport,rect(stage),native.projectionRevision]);
    const now = performance.now();
    if (window.regressionCamera?.key !== cameraKey) {
      window.regressionCamera = {key:cameraKey,since:now};
      return false;
    }
    if (now - window.regressionCamera.since < 1000) return false;

    const residents = trial.inspect();
    const state = trial.settings;
    if (residents.length !== count || state.count !== count || state.policy !== 'B' ||
        state.curve !== 'linear' || !state.paused || document.body.dataset.homeHeroPercent !== '110' ||
        document.querySelector('.diorama-view') || HomeBeauty.settings.variant !== 'B' ||
        HomeBeauty.settings.compareSplit) throw Error('Unexpected native roster, overview, size or leaves');

    const t = Math.max(0, Math.min(1, (width - 320) / 55));
    const extra = Math.max(0, count - 18) * 1.5 * t*t*(3-2*t);
    if (Math.abs(state.extra - extra) > 1e-9) throw Error('Incorrect size B for '+count+' / '+width);
    const shadows = [...stage.querySelectorAll('.diorama-shadow')];
    const rows = [];
    let scaleError = 0;
    let aspectError = 0;
    for (const a of residents) {
      const node = stage.querySelector('[data-diorama-actor="'+CSS.escape(a.key)+'"]');
      const img = node?.querySelector('img.character-asset');
      if (!img?.naturalWidth || !img.naturalHeight || !node.style.scale || !img.getBoundingClientRect().width) return false;
      const scales = node.style.scale.split(' ').map(Number);
      const x = scales[0]*viewport.scaleX/viewport.bodyScale/a.depth;
      const y = (scales[1] || scales[0])*viewport.scaleY/viewport.bodyScale/a.depth;
      const expected = roleScale[a.kind]*(1+extra/100);
      scaleError = Math.max(scaleError, Math.abs(x-expected), Math.abs(y-expected));
      aspectError = Math.max(aspectError, Math.abs(x/y-1));
      const at = shadows.findIndex(s => s.isConnected && parseFloat(s.style.width)>0 &&
        Math.hypot(parseFloat(s.style.left)-a.x,parseFloat(s.style.top)-a.y)<.01);
      if (at === -1) return false;
      shadows.splice(at, 1);
      rows.push([a.key, a.kind, asset(img.currentSrc), img.naturalWidth, img.naturalHeight,
        a.x,a.y,a.w,a.h,a.depth,a.foot.x,a.foot.y,...rect(img)]);
    }
    // The native camera eases the body transform briefly after a real resize.
    if (scaleError >= 0.0001 || aspectError >= 0.0001 || shadows.length) return false;
    const roster = JSON.parse(localStorage.getItem('naotocchi-cast-size-v1-fixture'));
    const expectedKeys = ['pet:'+roster.speciesLine,...(roster.partner?['partner:'+roster.partner.id]:[]),
      ...roster.companions.map(c=>'companion:'+c.id)].sort();
    if (JSON.stringify(residents.map(a=>a.key).sort())!==JSON.stringify(expectedKeys))
      throw Error('Native actors differ from the actual fixture');
    const gear = () => [...stage.querySelectorAll('#petAccessory,.partner-ring,.partner-heart')]
      .map(node=>[node.id || node.className, ...rect(node)]).filter(([,x,y,w,h])=>w>0&&h>0);
    const geometry = () => [trial.inspect().map(a=>[a.key,a.x,a.y,a.w,a.h,a.depth,a.foot.x,a.foot.y]),
      [...stage.querySelectorAll('[data-diorama-actor] img.character-asset')].map(rect),gear()];
    const equipment = gear();
    if (!equipment.length) throw Error('No visible equipment on native household');
    if (finish) {
      const before = JSON.stringify(geometry());
      HomeFinishGround.setEnabled(false);
      if (JSON.stringify(geometry()) !== before) throw Error('Ground-off moved actors or equipment');
      HomeFinishGround.setEnabled(true);
      if (JSON.stringify(geometry()) !== before) throw Error('Ground-on moved actors or equipment');
    }
    return {extra, scaleError, aspectError, rows, equipment, groundValid:residents.filter(a=>scene.navigation.valid(a)).length,
      fitRecoveries:Number(stage.dataset.populationFitRecoveries || 0), background:asset(painted.currentSrc),
      region:native.region, heroes:residents.filter(a=>a.kind==='pet').length,
      partners:residents.filter(a=>a.kind==='partner').length};
  };
})();
