const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
test('additive A/B builder keeps old runtime and separates each save family',()=>{
 const s=fs.readFileSync('tools/home-ab-build.cjs','utf8');
 assert.ok(s.includes('tools/home-recovered-build.cjs'));
 for(const key of ['naotocchi-home-ab-a-qa-v1','naotocchi-home-ab-b-qa-v1','naotocchi-home-ab-play-v1'])assert.ok(s.includes(key));
 assert.ok(s.includes('home-ab-world.mjs'));
 assert.ok(!s.includes("write('home-recovered-world.mjs'"));
});
test('comparison supports raw art, six, twenty-eight and actual operation',()=>{
 const s=fs.readFileSync('tools/home-ab-gallery.html','utf8');
 for(const count of ['0','6','28'])assert.ok(s.includes(`value="${count}"`));
 for(const id of ['staticGallery','old','new','live','map','start'])assert.ok(s.includes(`id="${id}"`));
});
