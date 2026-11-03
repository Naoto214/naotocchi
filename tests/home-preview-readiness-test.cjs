const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync('tools/home-v6-build.cjs','utf8');
const predicate=source.match(/\.replace\("e\?\.mode==='art-25d'&&e\.loaded","([^"\n]+)"\)/)[1];
for(const mode of ['webgl','canvas-3d'])test('v6 accepts ready renderer '+mode,()=>assert.equal(vm.runInNewContext(predicate,{e:{mode}}),true));
for(const e of [{mode:'loading'},{mode:'unavailable'},{mode:'art-25d',loaded:false}])test('v6 still rejects '+JSON.stringify(e),()=>assert.equal(vm.runInNewContext(predicate,{e}),false));
test('v6 waits for decoded art',()=>assert.equal(vm.runInNewContext(predicate,{e:{mode:'art-25d',loaded:true}}),true));
