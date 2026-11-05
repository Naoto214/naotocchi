const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const cp=require('node:child_process');
// Workflows check out the exact PR head even though GITHUB_REF names the
// synthetic merge ref. Compare the main ancestor actually incorporated into
// that checkout; HEAD^1 is a previous PR commit in this configuration.
const testedMain=(process.env.GITHUB_EVENT_NAME==='push'&&process.env.GITHUB_REF==='refs/heads/main')
 ? cp.execFileSync('git',['rev-parse','HEAD^1'],{encoding:'utf8'}).trim()
 : cp.execFileSync('git',['merge-base','HEAD','origin/main'],{encoding:'utf8'}).trim();
test('production entry activates approved art and egg presentation without preview save keys',()=>{
 const html=fs.readFileSync('index.html','utf8');
 assert.match(html,/home-production-diorama\.js/);
 assert.match(html,/home-production-model\.js/);
 assert.match(html,/home-production-egg\.mjs/);
 assert.match(html,/home-art\.css/);assert.match(html,/home-v8\.css/);
 assert.doesNotMatch(html,/naotocchi-home-v9-(?:qa|play|sheet)/);
 assert.match(fs.readFileSync('script.js','utf8'),/const SAVE_KEY = 'naotocchi-save-v1'/);
});
test('all thirteen default scenes use approved source images and valid navigation',async()=>{
 assert.ok(fs.existsSync('home-production-manifest.mjs'),'production manifest is connected');
 const {ART_CANDIDATES,selectRecoveredScene}=await import('../home-production-manifest.mjs');
 const expected={home:'home-interior-c',forest:'forest-waterfall',river_lake:'water-g',city:'city',countryside:'countryside',mountain:'mountain',snow:'snow',sea:'sea-b2',jungle:'jungle',desert:'desert',deepsea:'deepsea',star_stop:'star-new',memory_lake:'lake-new'};
 assert.equal(ART_CANDIDATES.length,13);
 for(const [region,id] of Object.entries(expected)){const scene=selectRecoveredScene(region);assert.equal(scene.candidate,id,region);const asset=ART_CANDIDATES.find(a=>a.id===id);assert.ok(fs.existsSync(asset.src),asset.src);assert.ok(scene.ground.length>=3);assert.ok(scene.points.length>0);assert.equal(selectRecoveredScene(region,'water'),scene,'production ignores preview candidate');}
});
test('production distribution retains every existing main file and includes only approved home art',async()=>{
 const allow=JSON.parse(fs.readFileSync('tools/pages/allowlist.json'));
 assert.ok(allow.files.includes('home-production-world.mjs'));
 const main=JSON.parse(cp.execFileSync('git',['show',testedMain+':tools/pages/allowlist.json']));
 for(const f of main.files)assert.ok(allow.files.includes(f),'retained '+f);
 const {ART_CANDIDATES}=await import('../home-production-manifest.mjs');
 for(const a of ART_CANDIDATES)assert.ok(allow.files.includes(a.src),a.src);
 assert.ok(!allow.files.some(f=>/^assets\/home-.*\.png$/.test(f)));
});
test('QA measures the fixed notification slot rather than the optional message contents',()=>{
 assert.match(fs.readFileSync('tools/home-production-qa.cjs','utf8'),/notice:document.getElementById\('homeEventSlot'\).getBoundingClientRect\(\).height/);
});
test('production runtime harness loads the exact shipped presenter and model',()=>{
 const h=require('./helpers/runtime-harness.cjs').harness({homeDiorama:true,productionHome:true});
 assert.equal(h.window.NaotocchiHomeDiorama,require('../home-production-diorama.js'));
 assert.equal(h.window.NaotocchiHomeDioramaModel,require('../home-production-model.js'));
});
test('latest-main game catalogs, conversations, formal images and other games stay byte-identical',()=>{
 const cp=require('child_process');const unchanged=['assets/characters','prototypes','conversation-*.js','relationship-*.js','individuality*.js','item-*.js','games.js','quick.js','script.js','style.css','ui.css','character-world-master.v1.js'];
 // FIRST START permits only the exact owner-approved files/bytes from PR #511.
 // Keep every other prototype (CARD GAME/naopoyo included) and asset protected.
 const firstStart='8de189af03dc3bf9ca0139982341edc5c33b5518';
 const approved=new Set(cp.execFileSync('git',['ls-tree','-r','--name-only',firstStart,'--','prototypes/life-sugoroku'],{encoding:'utf8'}).trim().split('\n'));
 // Owner approved PR #516 with FIRST START on 2026-11-04. Permit only
 // these exact files at that immutable merge, not future minigame edits.
 const polish='e834ae10f2f26aec7c99c7bb8cd3744acce184dc';
 const polishFiles=new Set(['games.js','quick.js','script.js','style.css',
  'prototypes/life-sugoroku/official-host-v4.js',
  'prototypes/life-sugoroku/official/controls.css',
  'prototypes/life-sugoroku/official/controls.js',
  'prototypes/life-sugoroku/official/games.js',
  'prototypes/life-sugoroku/official/quick.js']);
 // Owner approved PR #519 (CARD GAME card-name display) on 2026-11-05. Permit only
 // these exact files at its reviewed head, not the CARD GAME directory or later edits.
 const cardNames='ed2ba9b895bef2ad5b165986ccc5fb870a6e744e';
 const cardNameFiles=new Set([
  'prototypes/card-game/card-name-display-20261104/README.md',
  'prototypes/card-game/card-name-display-20261104/app-390x844-collection.png',
  'prototypes/card-game/card-name-display-20261104/app-390x844-detail.png',
  'prototypes/card-game/card-name-display-20261104/app-844x390-collection.png',
  'prototypes/card-game/card-name-display-20261104/app-844x390-detail.png',
  'prototypes/card-game/card-name-display-20261104/browser-audit.json',
  'prototypes/card-game/card-name-display-20261104/compare-after.png',
  'prototypes/card-game/card-name-display-20261104/compare-before.png',
  'prototypes/card-game/card-name-display-20261104/match-hotseat-7-390x844.png',
  'prototypes/card-game/card-name-display-20261104/match-hotseat-8-390x844.png',
  'prototypes/card-game/card-name-display-20261104/match-hotseat-8-844x390.png',
  'prototypes/card-game/card-title-lines.mjs',
  'prototypes/card-game/rulebook-content.mjs',
  'prototypes/card-game/style.css',
  'prototypes/card-game/tests/card-name-display.test.mjs',
  'prototypes/card-game/tests/card-name-layout.browser.cjs',
  'prototypes/card-game/ui-context.mjs',
  'prototypes/card-game/ui-presentation.mjs',
  'prototypes/card-game/ui-session.mjs']);
 const changed=cp.execFileSync('git',['diff','--name-only',testedMain,'--',...unchanged],{encoding:'utf8'}).trim().split('\n').filter(Boolean);
 assert.deepEqual(changed.filter(file=>!approved.has(file)&&!polishFiles.has(file)&&!cardNameFiles.has(file)),[],'unapproved protected file changes');
 const originalAdditions=changed.filter(file=>!polishFiles.has(file)&&!cardNameFiles.has(file));
 const cardNameChanges=changed.filter(file=>cardNameFiles.has(file));
 if(cardNameChanges.length) assert.equal(cp.execFileSync('git',['diff','--name-only',cardNames,'--',...cardNameChanges],{encoding:'utf8'}).trim(),'','PR #519 files must match approved bytes');
 if(originalAdditions.length) assert.equal(cp.execFileSync('git',['diff','--name-only',firstStart,'--',...originalAdditions],{encoding:'utf8'}).trim(),'','FIRST START additions must match approved bytes');
 assert.equal(cp.execFileSync('git',['diff','--name-only',polish,'--',...polishFiles],{encoding:'utf8'}).trim(),'','PR #516 files must match approved bytes');
 const original=cp.execFileSync('git',['ls-tree','--name-only','e0c5c52671666e8ab06b37afabf3eeae29f530fa'],{encoding:'utf8'}).trim().split('\n').filter(p=>p.startsWith('home-')&&/\.(js|mjs|css)$/.test(p));
 // The startup repair only moves the pure route function out of the module
 // that imports optional 3D. Reconstruct the original files byte-for-byte;
 // this exception cannot permit any navigation or legacy rendering changes.
 const route=fs.readFileSync('home-route-navigation.mjs','utf8').replace('// Pure presentation routes, independent of the optional 3D renderer.\n','');
 const splitFiles=['home-art-navigation.mjs','home-terrain-navigation.mjs'];
 for(const file of splitFiles){
  let restored=fs.readFileSync(file,'utf8');
  if(file==='home-art-navigation.mjs')restored=restored.replace("from './home-route-navigation.mjs'","from './home-terrain-navigation.mjs'");
  else restored=restored.replace("import {createTerrainNavigation} from './home-route-navigation.mjs';\nexport {createTerrainNavigation} from './home-route-navigation.mjs';\n",route);
  assert.equal(restored,cp.execFileSync('git',['show','e0c5c52671666e8ab06b37afabf3eeae29f530fa:'+file],{encoding:'utf8'}),'mechanical route extraction only: '+file);
 }
 assert.equal(cp.execFileSync('git',['diff','--name-only','e0c5c52671666e8ab06b37afabf3eeae29f530fa','--',...original.filter(file=>!splitFiles.includes(file))],{encoding:'utf8'}).trim(),'');
});
