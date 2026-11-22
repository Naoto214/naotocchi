// The comparison gets a fresh in-memory save on every entry. Install it
// before even the native inline recovery panel reads the ordinary save.
(() => {
  function memoryStorage() {
    const values = new Map();
    return {
      get length() { return values.size; },
      key: index => [...values.keys()][index] ?? null,
      getItem: key => values.get(String(key)) ?? null,
      setItem: (key, value) => values.set(String(key), String(value)),
      removeItem: key => values.delete(String(key)),
      clear: () => values.clear()
    };
  }
  for (const name of ['localStorage', 'sessionStorage']) {
    Object.defineProperty(window, name, {value: memoryStorage()});
  }
  // Other tabs can still send native storage events to a same-origin page.
  window.addEventListener('storage', event => event.stopImmediatePropagation(), true);
  const region = new URLSearchParams(location.search).get('scene') === 'mountain' ? 'mountain' : 'forest';
  const count = region === 'forest' ? 28 : 10;
  const seed = region === 'forest' ? 280214 : 100214;
  function random(initial) {
    let value = initial;
    return () => {
      value ^= value << 13;
      value ^= value >>> 17;
      value ^= value << 5;
      return (value >>> 0) / 4294967296;
    };
  }
  Math.random = random(seed);
  window.seedComparisonModel = () => {
    const api = window.NaotocchiHomeDioramaModel;
    const create = api.createModel;
    api.createModel = options => {
      const model = create({...options, random: random(seed)});
      // A provisional model may already have coordinates while the native
      // controller hides the cast to finish its portrait camera fit.
      let seated = !model.finishSeating;
      if (model.finishSeating) {
        const finish = model.finishSeating;
        model.finishSeating = (...args) => {
          const pending = model.seatingPending();
          const result = finish(...args);
          if (pending && !model.seatingPending()) seated = true;
          return result;
        };
      }
      let navigated = false;
      const sync = model.sync;
      model.sync = (actors, scene, ...rest) => {
        const result = sync(actors, scene, ...rest);
        navigated = Boolean(scene?.navigation);
        return result;
      };
      function pair() {
        const viewport = window.NaotocchiHomeViewport;
        const stage = document.getElementById('castStage');
        if (!seated || !navigated || model.seatingPending?.() ||
            stage?.dataset.worldRenderer !== 'art-25d' || stage.dataset.dioramaSeating === 'pending' ||
            document.hidden || document.body.classList.contains('movie-active') ||
            document.querySelector('#dateOverlay:not(.hidden), #screenNormal.hidden') ||
            getComputedStyle(stage).visibility !== 'visible' || !stage.getClientRects().length) return null;
        const camera = viewport?.residentPresentation?.();
        if (document.body.dataset.homeTinyOverview === 'true' && !camera) return null;
        const actors = model.snapshot();
        if (actors.length !== count) return null;
        const pet = actors.find(a => a.kind === 'pet'), bear = actors.find(a => a.kind === 'partner');
        if (!pet || !bear) return null;
        // The shadows are written by the native actor paint, after layout.
        // Require its two feet and decoded sprites before exposing a readout.
        const shadows = [...stage.querySelectorAll('.diorama-shadow')];
        const painted = actor => {
          const image = stage.querySelector('[data-diorama-actor="' + actor.key + '"] .character-asset');
          if (!image?.complete || !image.naturalWidth || !image.getBoundingClientRect().width) return false;
          return shadows.some(s => Math.abs(parseFloat(s.style.left) - actor.x) < .05 &&
                                   Math.abs(parseFloat(s.style.top) - actor.y) < .05);
        };
        if (!painted(pet) || !painted(bear)) return null;
        // Both feet share the same stage and camera origin. Translation cancels.
        return {dx:(bear.x - pet.x) * (camera?.scaleX || 1),
                dy:(bear.y - pet.y) * (camera?.scaleY || 1), clock:model.metrics().clock};
      }
      const samples = window.comparisonFeet = {initial:null, current:pair};
      const step = model.step;
      model.step = (...args) => {
        if (!samples.initial && args[0] > 0) samples.initial = pair();
        if (samples.initial) model.step = step;
        return step(...args);
      };
      return model;
    };
    delete window.seedComparisonModel;
  };
  // Anchor the simulated date as well as the daypart. Elapsed time still
  // follows the real monotonic clock, so the live frame scheduler is native.
  const NativeDate = Date;
  const started = performance.now();
  const noon = new NativeDate(2026, 10, 22, 12).getTime();
  const now = () => Math.floor(noon + performance.now() - started);
  window.Date = new Proxy(NativeDate, {
    get: (target, key) => key === 'now' ? now : Reflect.get(target, key),
    construct: (target, args) => Reflect.construct(target, args.length ? args : [now()]),
    apply: () => new NativeDate(now()).toString()
  });
  // Use the owner trial household: stage-five dog, forest bear and ribbon.
  const roster = window.NAOTOCCHI_CHARACTER_WORLD_MASTER_V1;
  const friends = [...roster.companions.normal, ...roster.companions.rare];
  const partner = roster.partners.find(entry => entry.id === 'forest_bear');
  localStorage.setItem('naotocchi-save-v1', JSON.stringify({
    stage:'growing', speciesLine:'dog', stageIndex:5, ageTicks:500, sodachi:55, maxSodachi:55,
    regionId:region, savedAt:noon, happiness:95, hunger:95, energy:95, health:100,
    companions:friends.slice(0, count - 2).map(({id}) => ({id, bond:85})),
    partner:{...partner, gender:'male', orientationId:'bi', married:true, affection:80, bondCount:3},
    schemaVersion:5, romanceCompatibilityVersion:2,
    // Previously reached anniversary movies would cover the comparison.
    marriageMilestonesSeen:[1, 10, 25],
    lifetime:{timeMode:'day', seasonMode:'autumn', weatherMode:'sunny', ownedShopItems:['ribbon']}
  }));
  localStorage.setItem('naotocchi-save-v1:home-guide-v1', 'done');
})();
