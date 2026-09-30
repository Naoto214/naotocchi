(function(root) {
  'use strict';
  // Add an existing character ID here only when both relationship assets exist.
  // The runtime catalogs and asset completeness tests guard this explicit registry.
  const SUPPORTED = Object.freeze({
    companion: Object.freeze(["cat_friend","rabbit_friend","tanuki","squirrel","owl","otter","hamster","panda","monkey","parrot","sheep","seal","bat","chicken","penguin_friend","hedgehog","shiba","snail","punyu","sekizou","chameleon","clock","unicorn","many_tail_fox","watcher","box"]),
    partner: Object.freeze(["cat_ceo","robot_neighbor","field_cow","sunflower_partner","forest_bear","grove_deer","cliff_goat","high_eagle","snow_spirit","snowman","rock_octopus","sea_mermaid","anglerfish","swamp_croc","gentle_gorilla","knitting_spider","desert_scorpion","oasis_cactus"])
  });
  const REACTION_MS = 2500;
  function resolve({kind,id,value,positive=false,normal}) {
    const expression = !SUPPORTED[kind]?.includes(id) ? 'normal' : positive ? 'positive' : (value ?? 100) < 30 ? 'lonely' : 'normal';
    return {expression,asset:expression === 'normal' ? normal : `assets/characters/relationship/${id}/${expression}.png`};
  }
  // One representative from the whole group, plus every threshold rescue.
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
  const api={SUPPORTED,REACTION_MS,resolve,companionPositiveIds,createReactions};
  if (typeof module==='object' && module.exports) module.exports=api;
  else root.NaotocchiRelationshipExpression=api;
})(typeof window!=='undefined'?window:globalThis);
