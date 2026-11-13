import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
const out=process.env.F2J3_OUT||'../site-f2j3/dist';
test('owner play retains the real game clock; frozen time is explicit QA only',()=>{
 const js=fs.readFileSync(out+'/comparison-script.js','utf8');
 assert.match(js,/if\(!new URLSearchParams\(location.search\).has\('qa'\)\)setInterval\(loop, TICK_MS\);/);
 const gallery=fs.readFileSync(new URL('./gallery.js',import.meta.url),'utf8');assert.ok(!gallery.includes('qa=1'));
});
test('comparison adds no floating control over the original 5+4/UI',()=>{
 const html=fs.readFileSync(out+'/play.html','utf8');assert.ok(!html.includes('comparison-controls.js'));
});
test('six-scene VERSION 2 gallery retains current scenes and both generations',()=>{
 const manifest=JSON.parse(fs.readFileSync(out+'/comparison.json','utf8'));
 assert.equal(manifest.version,2);
 assert.deepEqual(manifest.entries.map(x=>x.id),['forest-current','forest-f2','forest-f3','jungle-current','jungle-j3','jungle-j4']);
 for(const e of manifest.entries)for(const f of [e.src,e.original])assert.ok(fs.existsSync(out+'/'+f),f);
});
test('VERSION 1 originals, runtime images, evidence and geometry remain unchanged',async()=>{
 const cp=await import('node:child_process'),crypto=await import('node:crypto');
 const root=new URL('../../',import.meta.url),sha='0598b20a021a614267663267d5b59933d113b203',prefix='comparisons/forest-f2-jungle-j3/';
 const before=cp.execFileSync('git',['show',sha+':'+prefix+'scenes.mjs'],{cwd:root,encoding:'utf8'});
 const old=await import('data:text/javascript;base64,'+Buffer.from(before).toString('base64'));
 const now=await import('./scenes.mjs');
 for(const id of ['forest-f2','jungle-j3'])assert.deepEqual(now.CANDIDATE_SCENES[id],old.CANDIDATE_SCENES[id]);
 for(const f of cp.execFileSync('git',['ls-tree','-r','--name-only',sha,'--',prefix+'originals',prefix+'runtime',prefix+'evidence'],{cwd:root,encoding:'utf8'}).trim().split('\n')){
  const a=cp.execFileSync('git',['show',sha+':'+f],{cwd:root,maxBuffer:20*1024*1024}),b=fs.readFileSync(new URL(f,root));
  assert.equal(crypto.createHash('sha256').update(b).digest('hex'),crypto.createHash('sha256').update(a).digest('hex'),f);
 }
});
