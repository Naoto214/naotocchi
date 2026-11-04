import fs from 'node:fs';import vm from 'node:vm';
const ctx={window:{}};vm.runInNewContext(fs.readFileSync('character-world-master.v1.js','utf8'),ctx);const m=ctx.window.NAOTOCCHI_CHARACTER_WORLD_MASTER_V1;
const players=['normal','rare','secret'].flatMap(group=>m.playerSpecies[group].filter(c=>c.stages?.length===8&&c.playable!==false).map(c=>({...c,kind:'form',group})));
const npcs=[...['normal','rare'].flatMap(group=>m.companions[group].map(c=>({...c,kind:'companion',group:'friend'}))),...m.partners.map(c=>({...c,kind:'partner',group:'partner'})),{...m.playerSpecies.author,kind:'special',group:'special'}];
fs.writeFileSync('prototypes/life-sugoroku/canonical.mjs','// Generated from character-world-master.v1.js by tools/life-sugoroku/generate-canonical.mjs.\nexport const PLAYER_SPECIES = '+JSON.stringify(players,null,2)+';\nexport const NPCS = '+JSON.stringify(npcs,null,2)+';\n');
