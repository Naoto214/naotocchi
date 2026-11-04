const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os'),{execFileSync}=require('node:child_process');
test('additive builder preserves prior bytes, isolates v9 save scopes and uses plain JS',()=>{
 const out=process.env.HOME_V9_TEST_DIST;if(!out)throw Error('HOME_V9_TEST_DIST must name preserved v8 fixture');
 const names=fs.readdirSync(out).filter(n=>/v[78]/.test(n)&&fs.statSync(path.join(out,n)).isFile());
 const before=Object.fromEntries(names.map(n=>[n,fs.readFileSync(path.join(out,n))]));
 execFileSync(process.execPath,['tools/home-v9-build.cjs',out]);
 for(const n of names)assert.deepEqual(fs.readFileSync(path.join(out,n)),before[n],n);
 for(const n of ['home-v9-play-script.js','qa-home-v9-script.js']){const s=fs.readFileSync(path.join(out,n),'utf8');assert.ok(s.includes('naotocchi-home-v9-'));assert.ok(!s.includes('naotocchi-home-v8-'));assert.ok(!s.startsWith('\x1f\x8b'));execFileSync(process.execPath,['--check',path.join(out,n)]);}
 assert.ok(fs.readFileSync(path.join(out,'qa-home-v9-sheet-game.html'),'utf8').includes('data-home-v9-scope="sheet"'));
 assert.ok(fs.readFileSync(path.join(out,'home-v9-world.mjs'),'utf8').includes('home-v9-manifest.mjs'));
});
