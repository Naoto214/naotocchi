// Loaded only by the private comparison's generated copy of the shipped index.
(() => {
  const choices = {
    region: ['forest','sea','snow','city','memory_lake'],
    time: ['day','morning','evening','night'],
    season: ['summer','spring','autumn','winter'],
    weather: ['sunny','cloudy','rain','snow'],
    variant: ['B','current','A','C','D1','D2','D3']
  };
  const effectNames = ['water','particles','light','contact','motion','canopy','shafts','depth','gusts','magic','ground'];
  const query = new URLSearchParams(location.search);
  const values = Object.fromEntries(query.entries());
  values.effects = Object.fromEntries(effectNames.map(k => [k,query.get(k) !== '0']));
  const api = window.HomeBeauty = {revision:0,settings:null,paintRect:null};
  let actorSeed=214;
  api.actorRandom=()=>{actorSeed=(Math.imul(1664525,actorSeed)+1013904223)>>>0;return actorSeed/4294967296;};
  function apply(next) {
    const s = {...api.settings,...next,effects:{...api.settings?.effects,...next.effects}};
    for (const [key,list] of Object.entries(choices)) {
      if (!list.includes(s[key])) s[key]=list[0];
    }
    const strengthValue=Number(s.strength ?? 1);
    s.strength=Number.isFinite(strengthValue)?Math.max(0,Math.min(2,strengthValue)):1;
    s.count = [1,4,28].includes(Number(s.count)) ? Number(s.count) : 1;
    s.speed = [0.25,0.5,1].includes(Number(s.speed)) ? Number(s.speed) : 1;
    s.effects = Object.fromEntries(effectNames.map(k=>[k,s.effects?.[k] !== false]));
    const prev = api.settings;
    if (prev && JSON.stringify(s) === JSON.stringify(prev)) return;
    api.settings = s;
    api.revision++;
    const root = document.documentElement;
    root.dataset.beautyVariant = s.variant;
    root.dataset.castLighting = s.count<4 || ['evening','night'].includes(s.time) ? 'on':'off';
    const fullMotion=s.variant.startsWith('D');
    for (const key of effectNames) {
      const visible=s.effects[key] && (!fullMotion || s.strength>0);
      root.dataset['beauty'+key[0].toUpperCase()+key.slice(1)]=String(visible);
    }
    root.style.setProperty('--beauty-foot-opacity',String(fullMotion?Math.min(.94,s.strength*.82):.82));
    const strength = s.variant.startsWith('D') ? s.strength : s.variant==='C'?1.12:s.variant==='B'?1:.5;
    const night = s.time==='night', evening=s.time==='evening', morning=s.time==='morning';
    const overcast = ['rain','cloudy','snow'].includes(s.weather) && s.region !== 'memory_lake';
    const ambient = night?(s.region==='city'?-.035:-.07):evening?-.015:morning?.015:.02;
    root.style.setProperty('--cast-ambient', String(1+ambient*strength));
    root.style.setProperty('--cast-warmth',String((evening?.10:morning?.035:0)*strength));
    // Sea and lake have the sunset on the right; forest light arrives from the left.
    const side = {forest:1,sea:-1,snow:1,city:0,memory_lake:-1}[s.region];
    root.style.setProperty('--contact-throw', ((morning||evening)&&!overcast?side*10*strength:0)+'%');
    root.style.setProperty('--contact-opacity',String((overcast?.28:night?.33:.48)*strength));
    root.style.setProperty('--beauty-speed', String(s.speed));
    window.NaotocchiDaypartsQA={region:s.region,time:s.time,season:s.season,weather:s.weather};
    if (prev && ['time','season','weather','region'].some(k=>prev[k]!==s[k])) window.dispatchEvent(new Event('dayparts-qa-change'));
    if (prev && prev.speed !== s.speed) updateCSSSpeed();
  }
  function updateCSSSpeed() {
    for (const animation of document.getAnimations?.() || []) {
      if (animation.effect?.target?.closest?.('#castStage,.home-dayparts-fx')) {
        animation.updatePlaybackRate?.(api.settings.speed);
      }
    }
  }
  apply(values);
  window.addEventListener('animationstart',()=>{if(api.settings.speed!==1) updateCSSSpeed();});
  window.addEventListener('message',e=>{
    if(e.origin===location.origin && e.source===window.parent && e.data?.type==='home-beauty-settings' && e.data.settings) apply(e.data.settings);
  });
  window.addEventListener('load',()=>window.parent.postMessage({type:'home-beauty-ready'},location.origin));
})();
