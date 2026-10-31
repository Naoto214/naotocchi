// Materialize the already-tested v9 adapters as plain production source.
// Pages copies these files byte-for-byte; it never rewrites JavaScript.
const fs=require('node:fs');
(async()=>{
 const v9=await import('../home-v9-manifest.mjs');
 const ids={home:'home-interior-c',forest:'forest-waterfall',river_lake:'water-g',city:'city',countryside:'countryside',mountain:'mountain',snow:'snow',sea:'sea-b2',jungle:'jungle',desert:'desert',deepsea:'deepsea',star_stop:'star-new',memory_lake:'lake-new'};
 const candidates=Object.values(ids).map(id=>{const c=v9.WORLD_CANDIDATES.find(c=>c.id===id);if(!c)throw Error(id);const {source,...runtime}=c;return {...runtime,adoption:'production'};});
 const scenes=Object.fromEntries(Object.entries(ids).map(([region,id])=>[region,v9.ART_SCENES[id]||v9.selectRecoveredScene(region,id)]));
 fs.writeFileSync('home-production-manifest.mjs','// Owner-approved first release. Geometry is copied unchanged from v9.\nexport const ART_CANDIDATES='+JSON.stringify(candidates,null,2)+';\nexport const ART_SCENES='+JSON.stringify(scenes,null,2)+';\nexport function selectRecoveredScene(region){return ART_SCENES[region]||ART_SCENES.home;}\n');
 fs.writeFileSync('home-production-world.mjs',fs.readFileSync('home-recovered-world.mjs','utf8').replace('./home-recovered-manifest.mjs','./home-production-manifest.mjs').replace('selectRecoveredScene(e.region,new URLSearchParams(win.location.search).get("candidate"))','selectRecoveredScene(e.region)'));
 fs.writeFileSync('home-production-model.js',require('./home-recovered-model.cjs').recoveredModelSource(fs.readFileSync('home-diorama-model.js','utf8')));
 fs.writeFileSync('home-production-diorama.js',require('./home-v8-adapter.cjs').adaptDiorama(fs.readFileSync('home-diorama.js','utf8').replace("import('./home-world.mjs')","import('./home-production-world.mjs')")));
})();
