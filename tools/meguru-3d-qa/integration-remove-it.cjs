// Focused integration controls; exact bytes restored after every mutation.
const fs=require('node:fs'),cp=require('node:child_process'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const file='meguru-3d.mjs',original=fs.readFileSync(file),source=original.toString();
const tests=['tests/world-character-routing-test.cjs','tests/world-character-integration-test.cjs','tests/character-3d-test.cjs'];
const run=()=>cp.spawnSync(process.execPath,['--test','--test-reporter=tap',...tests],{encoding:'utf8',timeout:120000,maxBuffer:16*1024*1024});
const cases=[
 ['terrain height transmission','cp.present(a, { ...ci, groundY: wy })','cp.present(a, ci)'],
 ['active body detection','const inst = presenter && presenter.instanceOf ? presenter.instanceOf(actor) : null;','const inst = null;'],
 ['hidden body guard',"if (!o.visible) return bad('3d-hidden');",''],
 ['detached body guard',"if (!attached) return bad('3d-detached');",''],
 ['force2d guard','if (!w || opts.force2d || failed) return false;','if (!w || failed) return false;'],
 ['region allowlist','return !!w.world3d && M.WORLD3D_REGIONS.has(w.regionId);','return !!w.world3d;'],
 ['corridor destination guard','&& M.WORLD3D_REGIONS.has(w.corridorTo);',';'],
 ['diagnostics default','diagWant = false','diagWant = true'],
 ['WebGL fallback','      r2d.draw(view, now);',''],
];
let r=run();assert.equal(r.status,0,r.stdout+r.stderr);
for(const [name,from,to] of cases){try{assert.equal(source.split(from).length,2,name+' unique anchor');fs.writeFileSync(file,source.replace(from,to));r=run();assert.equal(r.status,1,name+': expected RED\n'+r.stdout+r.stderr);assert.match(r.stdout,/failureType: 'testCodeFailure'/);console.log(name+': RED');}finally{fs.writeFileSync(file,original);assert.ok(fs.readFileSync(file).equals(original));}}
r=run();assert.equal(r.status,0,r.stdout+r.stderr);console.log(cases.length+'/'+cases.length+' detected; restored GREEN; SHA256 '+crypto.createHash('sha256').update(original).digest('hex'));
