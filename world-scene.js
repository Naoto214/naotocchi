/* Presentation only: this module never writes the pet, save, clock or weather. */
(function(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.NaotocchiWorldScene = api;
})(typeof window !== 'undefined' ? window : null, function() {
  'use strict';
  // One entry describes a place; shared habitat/climate rules do the rendering.
  // No entry alters saved weather choices, gameplay modifiers or the clock.
  const SCENES = {
    home:{name:'おうち',habitat:'indoor',climate:'indoor',foliage:'none',accent:'#886245',base:'#654833',asset:'home-interior-v2',scale:1.08},
    city:{name:'とかい',habitat:'land',climate:'temperate',foliage:'street',accent:'#596d96',base:'#435575',asset:'city-day-v2',nightAsset:'city-night-v2',scale:1.5},
    countryside:{name:'いなか',habitat:'land',climate:'temperate',foliage:'field',accent:'#796e3e',base:'#66704c',asset:'countryside-v2',seasonalImages:{winter:'countryside-winter-v2'},scale:1.04},
    forest:{name:'もり',habitat:'land',climate:'temperate',foliage:'forest',accent:'#315e44',base:'#284e39',autumnWarmth:0,seasonalAssets:{autumn:'forest_autumn',winter:'forest_winter'}},
    mountain:{name:'やま',habitat:'land',climate:'alpine',foliage:'alpine',accent:'#4d6371',base:'#4c6575',seasonalAssets:{winter:'mountain_winter'}},
    snow:{name:'ゆきぐに',habitat:'land',climate:'polar',foliage:'alpine',accent:'#506986',base:'#607f98'},
    sea:{name:'うみ',habitat:'underwater',climate:'marine',foliage:'reef',accent:'#166077',base:'#087c9c'},
    deepsea:{name:'しんかい',habitat:'abyss',climate:'abyss',foliage:'abyss',accent:'#31497e',base:'#091b36'},
    river_lake:{name:'みずべ',habitat:'shore',climate:'temperate',foliage:'dock',accent:'#376d94',base:'#46799b',asset:'river-lake-v2',scale:1.03,water:{x:76,y:30}},
    jungle:{name:'ジャングル',habitat:'land',climate:'tropical',foliage:'jungle',accent:'#257462',base:'#235544',asset:'jungle-v2',scale:1.12},
    desert:{name:'さばく',habitat:'land',climate:'arid',foliage:'none',accent:'#825a3d',base:'#bb8654'},
    star_stop:{name:'ほしぞらのていりゅうじょ',habitat:'sky',climate:'cosmic',foliage:'none',accent:'#64527e',base:'#251e4e'},
    memory_lake:{name:'きおくのみずうみ',habitat:'shore',climate:'temperate',foliage:'willow',accent:'#565786',base:'#53577a',scale:1.4,water:{x:78,y:27},seasonalAssets:{winter:'memory_lake_winter'}},
  };
  // Municipality profiles are presentation variants, never extra game regions.
  const LOCAL_SCENES = {
    metropolis:{...SCENES.city,name:'都会のまち'},
    harbor:{name:'港のまち',habitat:'shore',climate:'temperate',foliage:'street',accent:'#3b6e88',base:'#496f84',asset:'local-harbor-v2',seasonalImages:{winter:'local-harbor-winter-v2'},scale:1.17},
    basin:{name:'山あいのまち',habitat:'land',climate:'temperate',foliage:'street',accent:'#557064',base:'#516d6c',asset:'local-basin-v2',scale:1.37},
    town:{name:'まちなか',habitat:'land',climate:'temperate',foliage:'street',accent:'#736e58',base:'#707468',asset:'local-town-v2',scale:1.08},
  };
  const TIMES = {
    morning:{light:.90,tint:'#f8d4a6',shade:.06},
    day:{light:1,tint:'#d9f7ef',shade:0},
    evening:{light:.84,tint:'#eeac98',shade:.12},
    night:{light:.72,tint:'#253f73',shade:.18},
  };
  const WATER = {spring:4,summer:0,autumn:12,winter:23};
  const WEATHER_LIGHT = {sunny:1,cloudy:.84,rain:.70,snow:.78,unknown:.9};
  const SEASONS = {spring:'はる',summer:'なつ',autumn:'あき',winter:'ふゆ'};
  const ASSET_ROOT = 'assets/world/';
  const hasRegion = region => Object.prototype.hasOwnProperty.call(SCENES,region);

  function resolveScene(environment = {}) {
    const region = hasRegion(environment.region) ? environment.region : 'home';
    const locality = region === 'home' && environment.locality && Object.prototype.hasOwnProperty.call(LOCAL_SCENES,environment.locality.profileId) ? environment.locality : null;
    const definition = locality ? LOCAL_SCENES[locality.profileId] : SCENES[region];
    const sceneId = locality ? 'local-'+locality.profileId : region;
    const indoor = definition.habitat === 'indoor';
    const season = Object.prototype.hasOwnProperty.call(SEASONS,environment.season) ? environment.season : 'summer';
    const inputTime = Object.prototype.hasOwnProperty.call(TIMES,environment.time) ? environment.time : 'day';
    const weather = Object.prototype.hasOwnProperty.call(WEATHER_LIGHT,environment.weather) ? environment.weather : 'unknown';
    const submerged = ['underwater','abyss'].includes(definition.habitat);
    const isolated = ['abyss','sky'].includes(definition.habitat);
    const time = isolated ? 'night' : inputTime;
    const lighting = TIMES[time];
    const snowAllowed = ['temperate','alpine','polar'].includes(definition.climate);
    const precipitation = indoor || submerged || isolated ? 'none' : weather === 'rain' ? 'rain' : weather === 'snow' && snowAllowed ? 'snow' : 'none';
    const deciduous = definition.climate === 'temperate' && ['forest','willow','garden'].includes(definition.foliage);
    const particle = indoor ? 'none' : definition.habitat === 'underwater' ? 'bubble'
      : definition.habitat === 'abyss' ? 'plankton' : definition.habitat === 'sky' ? 'spark'
      : precipitation !== 'none' ? precipitation
      : deciduous && season === 'spring' ? 'petal' : deciduous && season === 'autumn' ? 'leaf'
      : time === 'night' && ['summer','spring'].includes(season) && definition.foliage !== 'none' && definition.foliage !== 'street' && definition.climate !== 'polar' ? 'firefly'
      : definition.climate === 'arid' ? 'dust' : 'mote';
    const surfaceWeather = {sunny:'晴れ',cloudy:'曇り',rain:'雨',snow:'雪',unknown:'やわらかな光'}[weather];
    const description = indoor ? `あたたかいあかりのおうち。外は${surfaceWeather}。雨や雪は部屋に入りません。`
      : locality ? `${locality.display || locality.name || 'げんざいち'}。${definition.name}のイメージ。${surfaceWeather}。`
      : definition.habitat === 'underwater' ? `水面は${surfaceWeather}。${SEASONS[season]}の水の中でゆらゆら。`
      : definition.habitat === 'abyss' ? '光の届かない深海。小さな生きものが光っています。'
      : definition.habitat === 'sky' ? 'いつでも星空。地上の雨や雪は届きません。'
      : weather === 'snow' && !snowAllowed ? `${definition.name}はひんやりした空気。ここでは雪は積もりません。`
      : `${SEASONS[season]}の${definition.name}。${surfaceWeather}${definition.habitat === 'shore' ? '。岸辺のそばで水面がゆれています' : ''}。`;
    const authoredLight = indoor || !!(time === 'night' && definition.nightAsset);
    const imageName = time === 'night' && definition.nightAsset || definition.seasonalImages?.[season] || definition.asset || (definition.seasonalAssets?.[season] || region)+'-v1';
    return {...definition,region,sceneId,season,time,weather,precipitation,particle,description,authoredLight,
      image:ASSET_ROOT+imageName+'.webp',
      light:indoor ? (time === 'night' ? .9 : 1) : isolated ? 1 : authoredLight ? Math.max(.84,WEATHER_LIGHT[weather]) : Number((lighting.light*WEATHER_LIGHT[weather]).toFixed(3)),
      tint:indoor ? '#efc596' : lighting.tint,shade:isolated || authoredLight ? 0 : lighting.shade,
      temperature:definition.habitat === 'underwater' ? WATER[season] : isolated || indoor ? 0 : season === 'winter' ? 5 : season === 'spring' ? -3 : 0,
      warmth:season === 'autumn' && !submerged && !isolated && !authoredLight ? definition.autumnWarmth ?? .22 : 0,
      saturation:!submerged && !isolated && !authoredLight && season === 'winter' && definition.climate !== 'tropical' ? .65 : 1,
      motion:submerged ? 'float' : isolated ? 'still' : 'breeze',
      foliageSeason:deciduous ? season : 'evergreen',
      rays:!indoor && !isolated && weather === 'sunny' && time !== 'night',
      mist:!indoor && !submerged && !isolated && ['rain','cloudy'].includes(weather),
      frost:!indoor && !submerged && !isolated && snowAllowed && (precipitation === 'snow' || season === 'winter'),
    };
  }

  function careLevel(state = {}, notice, immortal = false) {
    if (immortal || state.infinite || ['egg','dead','farewell'].includes(state.stage)) return 'none';
    if (notice?.severity === 'critical' || state.dying || state.deathMeter >= 80) return 'critical';
    if (notice?.severity === 'warning' || state.deathMeter >= 60) return 'warning';
    if (state.deathMeter >= 30 || state.health < 50) return 'caution';
    return 'normal';
  }

  function prop(name, className) {
    return `<img class="world-prop ${className}" src="${ASSET_ROOT}${name}-v1.webp" alt="" draggable="false" decoding="async">`;
  }

  function sceneMarkup(model, {tier = 0, reducedMotion = false} = {}) {
    const count = reducedMotion || model.particle === 'none' ? 0 : [16,9,5][Math.min(2,Math.max(0,tier))];
    const particles = Array.from({length:count},(_,i) => {
      // Stable positions avoid jumps when the pet's values change every tick.
      const x = (i*37+11)%100, y = (i*23+9)%100;
      const duration = model.particle === 'rain' ? 1.4 + i%3*.2 : 12+i%7;
      return `<i class="world-particle world-${model.particle}" style="--x:${x}%;--y:${y}%;--size:${3+i%4}px;--delay:-${i*1.7}s;--duration:${duration}s"></i>`;
    }).join('');
    const foliage = {
      reef:[['kelp','world-kelp'],['fan','world-fan'],['coral','world-coral']],
      abyss:[],none:[],street:[],alpine:[],
      garden:model.season === 'winter' ? [] : [['willow','world-branch']],meadow:[['reeds','world-reeds']],
      forest:model.season === 'winter' ? [] : [['fern','world-fern']],
      willow:model.season === 'winter' ? [['reeds','world-reeds']] : [['willow','world-branch'],['reeds','world-reeds']],
      jungle:[],field:[],dock:[],
    };
    const foreground=(foliage[model.foliage] || []).map(([asset,css])=>prop(asset,css)).join('');
    const depth=model.foliage === 'reef' ? prop('fish','world-fish')+prop('jelly','world-jelly')
      : model.foliage === 'abyss' ? prop('jelly','world-jelly world-bioluminescent') : '';
    const water=model.water ? `<i class="world-water" style="left:${model.water.x}%;top:${model.water.y}%"></i>` : '';
    return {depth,atmosphere:particles+water,foreground};
  }

  function createRenderer(document, env = typeof window !== 'undefined' ? window : {}) {
    const world = document.getElementById('worldScene');
    if (!world) return null;
    const body = document.body;
    const backdrop = document.getElementById('worldBackdrop');
    const depth = document.getElementById('worldDepth');
    const atmosphere = document.getElementById('worldAtmosphere');
    const foreground = document.getElementById('worldForeground');
    const preference = env.matchMedia?.('(prefers-reduced-motion: reduce)');
    const failedProp=event=>{if(event.target?.classList.contains('world-prop'))event.target.hidden=true;};
    world.addEventListener('error',failedProp,true);
    let key='', lastEnvironment=null, lastFlags={};
    function update(environment, flags = {}) {
      lastEnvironment=environment;lastFlags=flags;
      const enabled=hasRegion(environment.region);
      world.hidden=!enabled;
      body.classList.toggle('world-mode',enabled);
      if (!enabled) return;
      const model=resolveScene(environment);
      const reducedMotion=!!preference?.matches;
      const tier=Math.min(2,Math.max(0,Number(flags.tier)||0));
      const paused=!!flags.paused || document.visibilityState==='hidden';
      body.dataset.worldMotion=model.motion;
      body.dataset.worldPaused=String(paused);
      body.dataset.worldReduced=String(reducedMotion);
      body.dataset.worldTier=String(tier);
      world.dataset.paused=String(paused);
      const nextKey=JSON.stringify([model.sceneId,model.image,model.description,model.time,model.season,model.weather,tier,reducedMotion]);
      if (nextKey===key) return;
      key=nextKey;
      world.dataset.region=model.region;
      world.dataset.scene=model.sceneId;
      world.dataset.authoredLight=String(model.authoredLight);
      world.dataset.habitat=model.habitat;
      world.dataset.time=model.time;
      world.dataset.season=model.season;
      world.dataset.precipitation=model.precipitation;
      world.dataset.foliageSeason=model.foliageSeason;
      world.dataset.rays=String(model.rays);
      world.dataset.mist=String(model.mist);
      world.dataset.frost=String(model.frost);
      body.style.setProperty('--world-accent',model.accent);
      body.style.setProperty('--world-base',model.base);
      // The design preview uses the current scenery and the same light treatment.
      body.style.setProperty('--world-preview-image',`url("${model.image}")`);
      body.style.setProperty('--world-preview-filter',`brightness(${model.light}) hue-rotate(${model.temperature}deg) saturate(${model.saturation}) sepia(${model.warmth})`);
      world.style.setProperty('--world-light',String(model.light));
      world.style.setProperty('--world-temperature',model.temperature+'deg');
      world.style.setProperty('--world-saturation',String(model.saturation));
      world.style.setProperty('--world-warmth',String(model.warmth));
      world.style.setProperty('--world-art-scale',String(model.scale || 1.15));
      world.style.setProperty('--world-tint',model.tint);
      world.style.setProperty('--world-shade',String(model.shade));
      backdrop.style.backgroundImage=`url("${model.image}")`;
      const markup=sceneMarkup(model,{tier,reducedMotion});
      depth.innerHTML=markup.depth;
      atmosphere.innerHTML=markup.atmosphere;
      foreground.innerHTML=markup.foreground;
      const description=document.getElementById('worldDescription');
      if (description) description.textContent=model.description;
    }
    const stage=document.getElementById('castStage');
    const alignStage=()=>{
      if(!stage || world.hidden) return;
      const bounds=stage.getBoundingClientRect();
      world.style.setProperty('--world-stage-bottom',bounds.bottom+'px');
    };
    const resize=env.ResizeObserver ? new env.ResizeObserver(alignStage) : null;
    if(stage)resize?.observe(stage);
    const refresh=()=>{if(lastEnvironment)update(lastEnvironment,lastFlags);};
    document.addEventListener('visibilitychange',refresh);
    preference?.addEventListener?.('change',refresh);
    return {update,destroy() {
      document.removeEventListener('visibilitychange',refresh);
      preference?.removeEventListener?.('change',refresh);
      resize?.disconnect();
      world.removeEventListener('error',failedProp,true);
    }};
  }
  return {SCENES,hasRegion,resolveScene,careLevel,sceneMarkup,createRenderer};
});
