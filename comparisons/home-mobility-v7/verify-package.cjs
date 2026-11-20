const fs=require('node:fs');
const path=require('node:path');
const {listFiles,hashFiles}=require('../home-finish-v5/build.cjs');
const {digest}=require('../home-finish-v5/native-hooks.cjs');
const {referenceBundle,prepare}=require('./build.cjs');
const assert=require('node:assert/strict');
const [oldDir,newDir,output]=process.argv.slice(2);
if(!oldDir||!newDir||!output)throw Error('Usage: node verify-package.cjs V6_DIST V7_DIST OUT.json');
const names=listFiles(oldDir), built=listFiles(newDir), expected=prepare(oldDir);
assert.equal(names.length,3948);
assert.equal(hashFiles(oldDir,names),referenceBundle);
assert.equal(hashFiles(newDir,names),referenceBundle);
assert.deepEqual(new Set(built),new Set([...names,...expected.keys()]));
const added={};
for(const [name,data] of expected) {
  const h=digest(fs.readFileSync(path.join(newDir,name)));
  assert.equal(h,digest(data),name);added[name]=h;
}
const proof={base:'5db9835478eafe526271c6864e0c86ded6324172',originalFiles:names.length,originalDigest:referenceBundle,
  addedFiles:added,completeDigest:hashFiles(newDir,built)};
fs.writeFileSync(output,JSON.stringify(proof,null,2)+'\n');
console.log('Verified',names.length,'untouched reference paths;',expected.size,'comparison additions.');
