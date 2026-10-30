const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const load=()=>import('../home-v9-manifest.mjs');
test('v9 preserves water A default; G is explicit comparison-only with identical navigation',async()=>{
 const m=await load(),v8=await import('../home-v8-manifest.mjs');
 assert.equal(m.selectRecoveredScene('river_lake').candidate,'water');
 const a=m.selectRecoveredScene('river_lake','water'),g=m.selectRecoveredScene('river_lake','water-g');
 assert.equal(g.candidate,'water-g');
 for(const k of ['ground','exclude','foreground','seats','forbidden','points','depth'])assert.deepEqual(g[k],a[k]);
 assert.deepEqual(a,v8.selectRecoveredScene('river_lake','water'));
 assert.equal(m.ART_CANDIDATES.find(c=>c.id==='water-g').adoption,'comparison');
});
test('B2 and special regions are design defaults, original candidates remain',async()=>{
 const m=await load();assert.equal(m.selectRecoveredScene('sea').candidate,'sea-b2');
 assert.equal(m.selectRecoveredScene('star_stop').candidate,'star-new');assert.equal(m.selectRecoveredScene('memory_lake').candidate,'lake-new');
 for(const id of ['water','water-g','sea','sea-b','sea-b2','star_stop-original','star-new','memory_lake-original','lake-new'])assert.ok(m.WORLD_CANDIDATES.some(c=>c.id===id));
 assert.equal(m.REGIONS.length,13);
 for(const [r]of m.REGIONS){const s=m.selectRecoveredScene(r);assert.ok(s?.ground?.length,r);assert.ok(m.ART_SCENES[s.candidate],r);assert.ok(m.WORLD_CANDIDATES.find(c=>c.id===s.candidate)?.src,r);}
});
test('G runtime and master exist while A is preserved',async()=>{const m=await load(),g=m.ART_CANDIDATES.find(c=>c.id==='water-g');for(const p of [g.source,g.src,'assets/home-art-recovered-20261029/water.png'])assert.ok(fs.statSync(p).size>100000);});
