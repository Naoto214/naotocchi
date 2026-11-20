'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {listFiles,hashFiles}=require('../home-finish-v5/build.cjs');
const {digest}=require('../home-finish-v5/native-hooks.cjs');
const {baselineHash,baselineCount,prepare}=require('./build.cjs');
const [base,dist,output]=process.argv.slice(2);
if(!base||!dist||!output)throw Error('Usage: node verify-package.cjs V7_DIST V8_DIST OUT.json');
const originals=listFiles(base),all=listFiles(dist),additions=prepare(base);
assert.equal(originals.length,baselineCount);
assert.equal(hashFiles(base,originals),baselineHash);
assert.equal(hashFiles(dist,originals),baselineHash);
assert.deepEqual(new Set(all),new Set([...originals,...additions.keys()]));
const addedFiles={};
for(const [name,bytes] of additions){
  const hash=digest(fs.readFileSync(path.join(dist,name)));
  assert.equal(hash,digest(bytes),name);
  addedFiles[name]=hash;
}
fs.writeFileSync(output,JSON.stringify({base:'e1f4a743684ce4ce8760a713d309483cedb9c50f',
  originalFiles:originals.length,originalDigest:baselineHash,addedFiles,completeDigest:hashFiles(dist,all)},null,2)+'\n');
console.log('Verified', originals.length,'original paths and',additions.size,'V8 additions');
