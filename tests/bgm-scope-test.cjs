const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const scope=require('./helpers/approved-bgm-scope.cjs');
test('only exact BGM hooks differ from latest approved game bytes',()=>scope.verify());
test('unrelated script, UI and game changes cannot pass the BGM scope exception',()=>{for(const [file,hash] of Object.entries(scope.baseline)){const text=fs.readFileSync(file,'utf8');assert.notEqual(scope.restoredBlob(file,text+'\n// unrelated edit\n'),hash);assert.throws(()=>scope.restoredBlob(file,text.replace(/BGM V2|data-app=/,'unexpected')));}});
