const fs=require('fs'),vm=require('vm');
const src=fs.readFileSync('/home/user/naotocchi/character-world-master.v1.js','utf8');
const ctx={window:{}};ctx.globalThis=ctx;vm.createContext(ctx);vm.runInContext(src,ctx);
const m=ctx.window.NAOTOCCHI_CHARACTER_WORLD_MASTER_V1;
const ps=m.playerSpecies;
console.log('rare:',ps.rare.map(x=>x.id).join(','));
console.log('secret:',ps.secret.map(x=>x.id).join(','));
console.log('normal count',ps.normal.length,'has mermaid/unicorn in any player list:',[...ps.normal,...ps.rare,...ps.secret].some(x=>['mermaid','unicorn'].includes(x.id)));
