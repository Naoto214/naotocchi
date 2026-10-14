// Isolated copy: mutation checks cannot race a full suite/browser using the checkout.
const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),cp=require('node:child_process'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../..'),tmp=fs.mkdtempSync(path.join(os.tmpdir(),'default3d-mutation-'));
const files=['vendor/three-0.170.0/three.module.min.js','script.js','meguru-3d.mjs','tests/meguru-default-3d-test.cjs','tests/world-character-routing-test.cjs'];
for(const f of files){fs.mkdirSync(path.dirname(path.join(tmp,f)),{recursive:true});fs.copyFileSync(path.join(root,f),path.join(tmp,f));}
const cases=[
 ['loading menu closure','script.js','      render(); // Commit closed menus now, so the loading/cancel UI is reachable.',''],
 ['normal default','script.js',"try { return !/(?:^|[?&])meguru3d=0(?:&|$)/.test(String(location.search || '')); }","try { return /(?:^|[?&])meguru3d=1(?:&|$)/.test(String(location.search || '')); }"],
 ['character default','script.js',"char3d: !/[?&]char3d=0(?:&|$)/.test(q)","char3d: /[?&]char3d=1(?:&|$)/.test(q)"],
 ['same-world Canvas override','script.js'," && !/[?&]m3d2d=1(?:&|$)/.test(String(location.search || ''))",''],
 ['stale-start token','script.js','!meguruActive || token !== meguruStartToken || meguruRun','meguruRun'],
 ['single start','script.js','|| meguruActive || !el.meguruOverlay','|| !el.meguruOverlay'],
 ['late module lock','script.js','if (meguru3dSettled || meguru3dFailed) return;',''],
 ['runtime retry lock','script.js','meguru3dFailed = true; meguru3dRenderer = null;','meguru3dFailed = false;'],
 ['timeout completion','script.js',"disableMeguru3d(new Error('3D module load timed out (5000ms)'));",''],
 ['Canvas draw','meguru-3d.mjs','      r2d.draw(view, now);',''],
 ['resize fallback','meguru-3d.mjs','catch (err) { fail(err); } } },','catch (err) { throw err; } } },'],
 ['partial constructor cleanup','meguru-3d.mjs','try { releaseRenderer(); } catch (_) { /* preserve original initialization error */ }',''],
];
const run=()=>cp.spawnSync(process.execPath,['--test','--test-reporter=tap',...files.filter(f=>f.startsWith('tests/'))],{cwd:tmp,encoding:'utf8',timeout:30000});
try{let r=run();assert.equal(r.status,0,r.stdout+r.stderr);for(const [name,file,from,to]of cases){const p=path.join(tmp,file),original=fs.readFileSync(p,'utf8');assert.equal(original.split(from).length,2,name+' unique anchor');try{fs.writeFileSync(p,original.replace(from,to));r=run();assert.equal(r.status,1,name+': survived\n'+r.stdout+r.stderr);assert.match(r.stdout,/failureType: 'testCodeFailure'/);console.log('KILLED '+name);}finally{fs.writeFileSync(p,original);}}assert.equal(run().status,0);console.log(cases.length+'/'+cases.length+' killed; pristine checkout unchanged');}finally{fs.rmSync(tmp,{recursive:true,force:true});}
