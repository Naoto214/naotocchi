const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const scope=require('./helpers/approved-kanji-v17.cjs');
test('V17 changes reverse to the exact frozen main bytes',()=>scope.verify());
test('each V17 approved path rejects unrelated edits and deletion',()=>{
 for(const target of Object.keys(scope.files)){
  const read=file=>fs.readFileSync(file,'utf8');
  assert.throws(()=>scope.verify(file=>file===target?read(file)+'\n// unapproved change\n':read(file)),{code:'ERR_ASSERTION'});
  assert.throws(()=>scope.verify(file=>file===target?null:read(file)),{code:'ERR_ASSERTION'});
 }
});
test('exact V17 replacements cannot be missing, duplicated or modified',()=>{
 for(const [file,entry] of Object.entries(scope.files)){
  const text=fs.readFileSync(file,'utf8');
  for(const {after} of entry.replacements){
   assert.throws(()=>scope.restore(file,text.replace(after,'')),{code:'ERR_ASSERTION'});
   assert.throws(()=>scope.restore(file,text.replace(after,()=>after+after)),{code:'ERR_ASSERTION'});
   assert.throws(()=>scope.restore(file,text.replace(after,()=>after.slice(0,-1)+'!')),{code:'ERR_ASSERTION'});
  }
  if(entry.baselineBlob!==null)assert.notEqual(scope.blob(scope.restore(file,text+'\n// unrelated change\n')),entry.baselineBlob);
 }
});
