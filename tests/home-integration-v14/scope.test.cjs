const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {blob}=require('../helpers/approved-card459-v18.cjs');
const {restore}=require('../helpers/home-v14-scope.cjs');
const changes=require('../helpers/home-v14-scope-delta.json');

const main={
  'index.html':'c9432f2b62b2c95a36338f8166627abe8feb97d3',
  'script.js':'70112eac0365045f7ff701229028ddf5debe4cae',
  'tools/pages/allowlist.json':'f1b1fb9cf575c6305fac17fb25dcf80a59d13c31'
};

for(const [file,hash] of Object.entries(main))test('reverse only the exact home integration in '+file,()=>{
  const current=fs.readFileSync(file,'utf8');
  assert.equal(blob(restore(file,current)),hash);
  assert.notEqual(blob(restore(file,current+'extra')),hash);
  for(const [after] of changes[file]){
    for(const replacement of ['',after+after,after.slice(1)]){
      assert.notEqual(blob(restore(file,current.replace(after,()=>replacement))),hash);
    }
    // Moving an entire insertion elsewhere must not erase evidence of the move.
    assert.notEqual(blob(restore(file,current.replace(after,'')+after)),hash);
  }
});
