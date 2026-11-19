// Runs only in the disposable production-home comparison.
(() => {
  const query = new URLSearchParams(location.search);
  const presets = {
    current: [100, 100, 100],
    A: [120, 110, 105],
    B: [125, 115, 115]
  };
  const roles = ['hero', 'partner', 'companions'];
  const days = ['morning', 'day', 'evening', 'night'];
  let settings = {preset: 'current', hero: 100, partner: 100, companions: 100,
    paused: false, time: window.HomeBeauty.settings.time};
  let controller = null, ready = false, observation = null;
  // Only during startup. Some WebKit subframes throttle animation callbacks.
  // Confirm the actual painted terrain and native fit before enabling comparisons.
  function checkPresentation() {
    if (ready) return;
    const sample = controller?.presentation();
    const now = performance.now();
    if (!sample) observation = null;
    else if (observation?.key !== sample.key)
      observation = {key: sample.key, firstFrame: sample.frame, since: now};
    else {
      const producedFrames = sample.frame - observation.firstFrame;
      const settledNativeFrames = sample.metricRevision === sample.revision && producedFrames >= 15;
      // A visible, already painted but throttled/reduced frame can be ready
      // without fifteen new model callbacks. Its fitted projection must persist.
      const heldProjection = now - observation.since >= 3500 && producedFrames < 15;
      if (settledNativeFrames || heldProjection) {
        ready = true;
        report('home-cast-ready');
        return;
      }
    }
    window.setTimeout(checkPresentation, 200);
  }
  const pausedStyle = document.createElement('style');
  pausedStyle.textContent =
    'html[data-cast-frozen] #castStage,html[data-cast-frozen] #castStage *,' +
    'html[data-cast-frozen] #castStage *::before,html[data-cast-frozen] #castStage *::after' +
    '{animation-play-state:paused!important}';
  document.head.appendChild(pausedStyle);

  function report(type) {
    if (window !== window.parent) window.parent.postMessage({type, settings}, location.origin);
  }

  function apply(input = {}) {
    const next = {...settings};
    if (Object.hasOwn(presets, input.preset)) {
      next.preset = input.preset;
      roles.forEach((role, i) => { next[role] = presets[next.preset][i]; });
    }
    for (const role of roles) {
      if (input[role] == null || input[role] === '') continue;
      const value = Number(input[role]);
      if (Number.isFinite(value)) next[role] = Math.round(Math.min(150, Math.max(80, value)));
    }
    if (!Object.hasOwn(presets, next.preset) ||
        !roles.every((role, i) => next[role] === presets[next.preset][i])) next.preset = 'custom';
    if (typeof input.paused === 'boolean') next.paused = input.paused;
    if (days.includes(input.time)) next.time = input.time;
    const previous = settings;
    settings = Object.freeze(next);
    if (previous.paused !== next.paused) {
      document.documentElement.toggleAttribute('data-cast-frozen', next.paused);
      window.HomeBeauty.setCastClockPaused(next.paused);
      controller?.clearGesture();
    }
    if (previous.time !== next.time) window.HomeBeauty.setCastTime(next.time);
    if (previous.paused !== next.paused || roles.some(role => previous[role] !== next[role]))
      controller?.repaint();
    report('home-cast-state');
    return settings;
  }

  window.HomeCastTrial = {
    apply,
    get settings() { return settings; },
    get ready() { return ready; },
    scale(kind) { return settings[kind === 'pet' ? 'hero' : kind === 'partner' ? 'partner' : 'companions'] / 100; },
    attach(api) { controller = api; },
    detach(api) { if (controller === api) controller = null; },
    inspect() { return controller?.inspect() || []; }
  };

  apply({preset: query.get('castPreset') || 'current', ...Object.fromEntries(
    roles.filter(role => query.has(role)).map(role => [role, query.get(role)])),
    paused: query.get('paused') === '1'});
  window.addEventListener('message', event => {
    if (event.origin === location.origin && event.source === window.parent &&
        event.data?.type === 'home-cast-settings' && event.data.settings)
      apply(event.data.settings);
  });
  window.addEventListener('load', checkPresentation, {once: true});
})();
