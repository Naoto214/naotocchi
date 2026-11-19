// The comparison runs in a disposable frame and never opens an owner's save.
(() => {
  const memory = new Map();
  Object.defineProperty(window,'localStorage',{value:{
    get length(){return memory.size;},
    getItem(k){return memory.get(String(k))??null;},
    setItem(k,v){memory.set(String(k),String(v));},
    removeItem(k){memory.delete(String(k));},
    key(i){return [...memory.keys()][i]??null;},
    clear(){memory.clear();}
  }});
  let seed=214;
  Math.random=()=>{seed=(Math.imul(1664525,seed)+1013904223)>>>0;return seed/4294967296;};
  const s=window.HomeBeauty.settings;
  const state=JSON.parse(document.getElementById('beauty-seed').textContent);
  Object.assign(state,{regionId:s.region,savedAt:Date.now(),hunger:95,energy:95,happiness:95});
  Object.assign(state.lifetime,{weatherMode:s.weather,timeMode:s.time,seasonMode:s.season,soundBgm:false});
  const roster=window.NAOTOCCHI_CHARACTER_WORLD_MASTER_V1;
  const companions=[...roster.companions.normal,...roster.companions.rare];
  state.companions=companions.slice(0,Math.max(0,s.count-2)).map(c=>({id:c.id,bond:85}));
  const partner=roster.partners.find(p=>p.id==='forest_bear');
  state.partner=s.count>1?{...partner,gender:'male',orientationId:'bi',married:true,affection:80,bondCount:3}:null;
  localStorage.setItem('naotocchi-beauty-v6-fixture',JSON.stringify(state));
  localStorage.setItem('naotocchi-beauty-v6-fixture:home-guide-v1','done');
})();
