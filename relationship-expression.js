(function(root) {
  'use strict';
  // Add an existing character ID here only when both relationship assets exist.
  // The runtime catalogs and asset completeness tests guard this explicit registry.
  const SUPPORTED = Object.freeze({
    companion: Object.freeze(["cat_friend","rabbit_friend","tanuki","squirrel","owl","otter","hamster","panda","monkey","parrot","sheep","seal","bat","chicken","penguin_friend","hedgehog","shiba","snail","punyu","sekizou","chameleon","clock","unicorn","many_tail_fox","watcher","box"]),
    partner: Object.freeze(["cat_ceo","robot_neighbor","field_cow","sunflower_partner","forest_bear","grove_deer","cliff_goat","high_eagle","snow_spirit","snowman","rock_octopus","sea_mermaid","anglerfish","swamp_croc","gentle_gorilla","knitting_spider","desert_scorpion","oasis_cactus"])
  });
  // BEGIN GENERATED RELATIONSHIP BOUNDS
  const ART_BOUNDS = Object.freeze({"cat_friend":[6,30,126,128],"rabbit_friend":[20,9,109,123],"tanuki":[11,12,117,124],"squirrel":[15,9,121,124],"owl":[22,10,107,120],"otter":[6,12,124,124],"hamster":[13,18,115,123],"panda":[7,8,121,124],"monkey":[12,5,115,124],"parrot":[12,4,117,125],"sheep":[6,16,123,124],"seal":[5,16,128,128],"bat":[17,8,106,121],"chicken":[12,11,118,124],"penguin_friend":[5,60,124,123],"hedgehog":[11,16,117,123],"shiba":[7,18,127,125],"snail":[5,38,126,115],"punyu":[5,35,124,128],"sekizou":[34,10,93,123],"chameleon":[3,23,123,126],"clock":[9,9,122,123],"unicorn":[9,7,121,125],"many_tail_fox":[5,10,124,124],"watcher":[45,9,90,122],"box":[14,27,120,127],"cat_ceo":[36,9,95,124],"robot_neighbor":[26,11,108,125],"field_cow":[6,12,127,127],"sunflower_partner":[31,5,108,124],"forest_bear":[8,9,122,125],"grove_deer":[31,10,101,126],"cliff_goat":[33,9,103,126],"high_eagle":[6,9,122,123],"snow_spirit":[37,4,92,122],"snowman":[10,7,120,124],"rock_octopus":[5,15,125,123],"sea_mermaid":[23,10,113,126],"anglerfish":[7,29,122,124],"swamp_croc":[12,10,121,124],"gentle_gorilla":[18,10,112,124],"knitting_spider":[4,20,124,124],"desert_scorpion":[19,5,109,123],"oasis_cactus":[27,9,104,124]});
  // END GENERATED RELATIONSHIP BOUNDS
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
      info(entity) { const e=entity && entries.get(entity); return e && now()<e.until ? e : null; },
      active(entity) { const entry=entity && entries.get(entity); return !!entry && now()<entry.until; },
      start(entity) {
        if (!entity || typeof entity !== 'object') return;
        const old=entries.get(entity); if (old) cancel(old.timer);
        const startedAt=now();
        const entry={startedAt,until:startedAt+REACTION_MS,timer:null};
        entries.set(entity,entry);
        entry.timer=schedule(()=>{
          if (entries.get(entity)!==entry) return;
          entries.delete(entity);onExpire();
        },REACTION_MS);
      },
    };
  }
  // Owner proximity wins over empty-space searching. Neighbouring cast never
  // pushes a heart sideways; only the stage edges clamp this local anchor.
  function heartAnchor(frame,{width,height,size:requested}={}) {
    const size=Math.min(requested || Math.max(16,Math.min(24,frame.w*.38)),Math.max(8,frame.y-3));
    const x=Math.max(0,Math.min(width-size,frame.x+frame.w/2-size/2));
    return {x,y:Math.max(0,Math.min(height-size,frame.y-size-3)),w:size,h:size};
  }
  function heartMarkup(expression) {
    return '<svg viewBox="0 0 32 30" aria-hidden="true"><path d="M16 27C12 23 2 17 2 9C2 1 12 0 16 7C20 0 30 1 30 9C30 17 20 23 16 27Z" fill="currentColor" stroke="white" stroke-width="1.4"/>'+
      (expression==='lonely'?'<path class="relationship-heart-crack" d="M17 5L14 11L18 14L15 19" fill="none" stroke="#f6f8ff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>':'')+'</svg>';
  }
  const api={ART_BOUNDS,heartAnchor,heartMarkup,SUPPORTED,REACTION_MS,resolve,companionPositiveIds,createReactions};
  if (typeof module==='object' && module.exports) module.exports=api;
  else root.NaotocchiRelationshipExpression=api;
})(typeof window!=='undefined'?window:globalThis);
