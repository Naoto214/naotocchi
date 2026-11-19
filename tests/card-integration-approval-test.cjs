const test=require('node:test'),assert=require('node:assert/strict');
const scope=require('./helpers/approved-card-integration-v16.cjs');
test('approval covers only the four coherent baseline/name/design combinations',()=>{
 for(const mode of ['baseline','names','design','combined'])assert.equal(scope.verify(file=>scope.files[file][mode]),mode);
});
test('every reviewed path rejects changed bytes and unexpected presence or deletion',()=>{
 for(const mode of ['names','design','combined'])for(const target of Object.keys(scope.files)){
  const current=scope.files[target][mode];
  assert.throws(()=>scope.verify(file=>file===target?'0'.repeat(40):scope.files[file][mode]),{code:'ERR_ASSERTION'});
  if(current!==null)assert.throws(()=>scope.verify(file=>file===target?null:scope.files[file][mode]),{code:'ERR_ASSERTION'});
 }
});
test('mixing individually approved files without the coherent integration is rejected',()=>{
 assert.throws(()=>scope.verify(file=>file==='prototypes/card-game/ui-presentation.mjs'?scope.files[file].combined:scope.files[file].names),{code:'ERR_ASSERTION'});
});
test('working checkout matches one exact approved integration',()=>assert.ok(['names','design','combined'].includes(scope.verify())));
