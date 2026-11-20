const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const scope=require('./helpers/approved-card459-v18.cjs');
const read=file=>fs.existsSync(file)?fs.readFileSync(file):null;
test('V18 scope matches the exact reviewed snapshot and restores frozen baselines',()=>{
 scope.verify();
 for(const [file,e] of Object.entries(scope.files)){
  const bytes=read(file);const restored=scope.restoreBytes(file,bytes);
  assert.equal(restored===null?null:scope.blob(restored),e.baselineBlob,file);
 }
});
test('every V18 path rejects a byte mutation and deletion',()=>{
 for(const target of Object.keys(scope.files)){
  assert.throws(()=>scope.verify(file=>file===target?Buffer.concat([read(file),Buffer.from('\nmutation')]):read(file)),{code:'ERR_ASSERTION'});
  assert.throws(()=>scope.verify(file=>file===target?null:read(file)),{code:'ERR_ASSERTION'});
 }
});
test('V18 restoration cannot erase unrelated appended edits or accept changed approved blocks',()=>{
 for(const [file,e] of Object.entries(scope.files)){
  if(e.baselineText===undefined||e.baselineBlob===null)continue;
  const text=read(file).toString();
  assert.equal(scope.restore(file,text+'\n// unapproved\n'),e.baselineText+'\n// unapproved\n');
  assert.throws(()=>scope.restore(file,'!'+text.slice(1)),{code:'ERR_ASSERTION'});
 }
});
