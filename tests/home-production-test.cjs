const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const cp=require('node:child_process');
// A PR merge checkout includes newer main work (for example CARD GAME).
// Compare its first parent, the actual tested main, rather than attributing
// those independent commits to this home change. Local checks compare the
// latest main ancestor actually incorporated into this branch.
const integratedCheckout=(process.env.GITHUB_EVENT_NAME==='pull_request'&&/^refs\/pull\/\d+\/merge$/.test(process.env.GITHUB_REF||''))
 || (process.env.GITHUB_EVENT_NAME==='push'&&process.env.GITHUB_REF==='refs/heads/main');
const testedMain=integratedCheckout
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
 const cp=require('child_process');const unchanged=['assets/characters','prototypes','conversation-*.js','relationship-*.js','individuality*.js','item-*.js','games.js','quick.js','style.css','ui.css','character-world-master.v1.js'];
 assert.equal(cp.execFileSync('git',['diff','--name-only',testedMain,'--',...unchanged],{encoding:'utf8'}).trim(),'');
 const original=cp.execFileSync('git',['ls-tree','--name-only','e0c5c52671666e8ab06b37afabf3eeae29f530fa'],{encoding:'utf8'}).trim().split('\n').filter(p=>p.startsWith('home-')&&/\.(js|mjs|css)$/.test(p));
 assert.equal(cp.execFileSync('git',['diff','--name-only','e0c5c52671666e8ab06b37afabf3eeae29f530fa','--',...original],{encoding:'utf8'}).trim(),'');
});
