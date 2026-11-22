const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {blob}=require('../helpers/approved-card459-v18.cjs');
const {restore}=require('../helpers/home-v14-scope.cjs');
const changes=require('../helpers/home-v14-scope-delta.json');

const main={
  'tests/helpers/approved-card459-v18.cjs':'6f1d62d81bfedf5da5a1007de68eefae7ed542df',
  'index.html':'f40897b9be732d10efa1f4343186379d99394b55',
  'script.js':'3f440d831360e43d89204379f3e12f70797d0e64',
  'tools/pages/allowlist.json':'9aba7e37169b15f7d7ffdc8f7f912c2afa70890a'
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
