// Comparison only. The home runs on a throwaway in-memory save and never opens the owner's.
(() => {
  const REGIONS = ['home','forest','river_lake','city','countryside','mountain','snow','sea','jungle','desert','deepsea','star_stop','memory_lake'];
  const SEASONS = ['spring','summer','autumn','winter'], WEATHER = ['sunny','cloudy','rain','snow'], TIMES = ['morning','day','evening','night'];
  const m = location.hash.match(/^#g([ABCDE])-(\d+)-(\d+)-(\d)-(\d)-(\d)(?:-(\d))?$/) || [];
  const SWAYS = ['bump','tips','branch','still','wide','vivid','tips2','tips3','rigid'];
  const pick = (list, index, fallback) => list[Number(index)] || fallback;
  const s = window.NaotocchiEnvCompare = {
    fx:m[1] || 'E', count:[1,4,28].includes(Number(m[2])) ? Number(m[2]) : 4,
    region:pick(REGIONS, m[3], 'forest'), season:pick(SEASONS, m[4], 'autumn'),
    weather:pick(WEATHER, m[5], 'sunny'), time:pick(TIMES, m[6], 'day'),
    sway:pick(SWAYS, m[7], 'tips2'),
    lists:{region:REGIONS, season:SEASONS, weather:WEATHER, time:TIMES, sway:SWAYS}
  };
  window.NaotocchiEnvironmentFx = s.fx === 'B' ? 'falling' : s.fx === 'D' ? 'maximum' : s.fx === 'E' ? 'final' : 'living';
  window.NaotocchiTreeSway = s.sway;
  window.NaotocchiDaypartsQA = {region:s.region, time:s.time, season:s.season, weather:s.weather};
  const memory = new Map();
  Object.defineProperty(window, 'localStorage', {value:{
    get length() { return memory.size; },
    getItem(k) { return memory.get(String(k)) ?? null; },
    setItem(k, v) { memory.set(String(k), String(v)); },
    removeItem(k) { memory.delete(String(k)); },
    key(i) { return [...memory.keys()][i] ?? null; },
    clear() { memory.clear(); }
  }});
  // The same residents walk the same routes in every variant.
  let seed = 214;
  Math.random = () => { seed = (Math.imul(1664525, seed) + 1013904223) >>> 0; return seed / 4294967296; };
  const state = JSON.parse(document.getElementById('env-seed').textContent);
  Object.assign(state, {regionId:s.region, savedAt:Date.now(), hunger:95, energy:95, happiness:95});
  Object.assign(state.lifetime, {weatherMode:s.weather, timeMode:s.time, seasonMode:s.season, soundBgm:false});
  const roster = window.NAOTOCCHI_CHARACTER_WORLD_MASTER_V1;
  const companions = [...roster.companions.normal, ...roster.companions.rare];
  state.companions = companions.slice(0, Math.max(0, s.count - 2)).map(c => ({id:c.id, bond:85}));
  const partner = roster.partners.find(p => p.id === 'forest_bear');
  state.partner = s.count > 1 ? {...partner, gender:'male', orientationId:'bi', married:true, affection:80, bondCount:3} : null;
  localStorage.setItem('naotocchi-environment-fixture', JSON.stringify(state));
  localStorage.setItem('naotocchi-environment-fixture:home-guide-v1', 'done');
})();
