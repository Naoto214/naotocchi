(function(root) {
  'use strict';
  // Extend only this allowlist when a later image batch is approved.
  const PILOT = Object.freeze({companion:Object.freeze(['otter','clock']),partner:Object.freeze(['forest_bear','rock_octopus'])});
  const REACTION_MS = 2500;
  function resolve({kind,id,value,positive=false,normal}) {
    const expression = !PILOT[kind]?.includes(id) ? 'normal' : positive ? 'positive' : (value ?? 100) < 30 ? 'lonely' : 'normal';
    return {expression,asset:expression === 'normal' ? normal : `assets/characters/relationship/${id}/${expression}.png`};
  }
  // Sample from the whole recruited group, not only the illustrated pilot.
  function companionPositiveIds(before,after,random=Math.random) {
    if (!after.length) return [];
    const ids = new Set([after[Math.min(after.length-1,Math.max(0,Math.floor(random()*after.length)))].id]);
    const old = new Map(before.map(c=>[c.id,c.bond ?? 100]));
    for (const c of after) if (old.has(c.id) && old.get(c.id)<30 && (c.bond ?? 100)>=30) ids.add(c.id);
    return [...ids];
  }
  // Kept outside save/state. Object identity prevents a new partner/life with
  // the same character ID from inheriting an old reaction.
  function createReactions({now=Date.now,schedule=setTimeout,cancel=clearTimeout,onExpire=()=>{}}={}) {
    const entries = new WeakMap();
    return {
      active(entity) { const entry=entity && entries.get(entity); return !!entry && now()<entry.until; },
      start(entity) {
        if (!entity || typeof entity !== 'object') return;
        const old=entries.get(entity); if (old) cancel(old.timer);
        const entry={until:now()+REACTION_MS,timer:null};
        entries.set(entity,entry);
        entry.timer=schedule(()=>{
          if (entries.get(entity)!==entry) return;
          entries.delete(entity);onExpire();
        },REACTION_MS);
      },
    };
  }
  const api={PILOT,REACTION_MS,resolve,companionPositiveIds,createReactions};
  if (typeof module==='object' && module.exports) module.exports=api;
  else root.NaotocchiRelationshipExpression=api;
})(typeof window!=='undefined'?window:globalThis);
