// Approved movement V5, source PR #558. Cache tokens are packaging metadata.
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),crypto=require('node:crypto');
const sha=s=>crypto.createHash('sha256').update(s).digest('hex');
const approved={
  "home-production-model.js": "0df78b159cefa53535337db1064016c0ba2a81e66f3ec6e4d0b08bdd8caa85cc",
  "home-production-diorama.js": "5122af392bd58b46f28b6605977c7424389514e8345561aa7fb45437e3027136",
  "home-production-world.mjs": "a8e435d60df37c7932940ffd449ccb72c995cadd909d5de2417dedbc90d56758",
  "home-art-navigation.mjs": "c0ad4ef1feb04780478736a5ba257713ac6bba1f209bc8da24f1855c04cbecf8",
  "home-recovered-navigation.mjs": "65b8b48d8a48b110356f7cd3125dc984064d7a9fd84198a9982b625b10568ec4",
  "home-route-navigation.mjs": "9459d7632eb786f8415839e102ddd422829804423f0b9e674bae44424eef678e",
  "home-visible-ground-navigation.mjs": "194580d47ce08d500446090a86effec3407adb108b016fc9fcdf972418bf1220",
  "home-ground-expansion.mjs": "886c97b278c4c2fee73455cbb130827a3e4b2e7828a9719d6cc6c88c7b3fe906"
};
const protectedMain={
  "script.js": "5507f2f86790a30723c4a214d22fcc495fbed190df95d2858621861f228391f2",
  "home-production-touch.js": "df9353d84de426e6f71fdd3b9230d31eac2bc8107d801e13ed5eac7d398d8f42",
  "home-production-layout.css": "0d1b0a12508f0194bbcf62c222be6768242073d0b51a8fed52d8d4a9e81a41fd",
  "home-production-transform.mjs": "e4ab3a2d221e2efa2baee71092738767d9e1e33d46d04147e32b5b2f57c06214",
  "home-production-manifest.mjs": "8c9c44d8adecc52051a7ce9b9e542c6f98da58971e81b6adb77c2543bf2303f3",
  "home-dayparts.mjs": "cf14688d6609fdc025b6315cc9af8e1b14be3569b830abab098b1fc765302dc2",
  "home-production-egg.mjs": "95b0eb7a4986281f61fa9eb3beae933db2cd8ef3ae162031a5c401fab39bddf5",
  "cast-layout.js": "0ccb5535b52c90488b850b8a909ad71d8046925548ff47b14c713bc786eef8a0",
  "cast-motion.js": "1e8d37ab684176362199fe79258093f48c6cb307d0cdb6f32ac381cbb794e8e7",
  "games.js": "7b818924779d34bb3276b7f89c6ab25125becffb0fbb7db6ff81bbac618cc157"
};

test('all eight movement modules retain approved V5 algorithms byte-for-byte except cache references',()=>{
 for(const [file,hash]of Object.entries(approved))assert.equal(sha(fs.readFileSync(file,'utf8').replace(/\?v=[\w-]+/g,'?v=CACHE')),hash,file);
});
test('production UI, input, depth, assets, save/game logic remain at integration main baseline',()=>{
 for(const [file,hash]of Object.entries(protectedMain))assert.equal(sha(fs.readFileSync(file)),hash,file);
});
test('V5 runtime contains no B/C yielding implementation or comparison instrumentation',()=>{
 const source=Object.keys(approved).map(f=>fs.readFileSync(f,'utf8')).join('\n');
 assert.doesNotMatch(source,/setYieldMode|yieldPending|yieldPlanning|yieldCounters|yieldStatus|__reachTrace|MovementQA|HomeReleaseQA|auditRestore/);
 const manifest=JSON.parse(fs.readFileSync('tools/pages/allowlist.json'));
 for(const file of Object.keys(approved))assert.ok(manifest.files.includes(file),file);
 assert.ok(!manifest.files.some(f=>/home-movement-v[1-5]\/|home-yield|home-reach-audit/.test(f)));
});
test('dependency cache references resolve to the exact shipped module bytes',()=>{
 for(const file of [...Object.keys(approved),'index.html'])for(const m of fs.readFileSync(file,'utf8').matchAll(/((?:\.\/)?home-[a-z0-9-]+\.(?:js|mjs))\?v=([a-f0-9]{12})/g)){
  assert.equal(m[2],sha(fs.readFileSync(m[1])).slice(0,12),file+' -> '+m[1]);
 }
});
