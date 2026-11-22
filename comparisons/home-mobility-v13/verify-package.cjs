'use strict';
const fs=require('node:fs');
const path=require('node:path');
const {createHash}=require('node:crypto');
const {listFiles,hashFiles}=require('../home-finish-v5/build.cjs');
const {prepare,baselineHash}=require('./build.cjs');
const [base,out,receipt]=process.argv.slice(2);
if(!base||!out||!receipt)throw Error('Usage: node verify-package.cjs V12_DIR V13_DIR RECEIPT');
const sha=v=>createHash('sha256').update(v).digest('hex');
const prior=listFiles(base);
if(prior.length!==4143 || hashFiles(base,prior)!==baselineHash || hashFiles(out,prior)!==baselineHash)throw Error('Inherited home differs');
const expected=prepare(base);
const current=listFiles(out);
if(current.length!==prior.length+expected.size)throw Error('Unexpected or missing assets');
const added={};
for(const [name,body] of expected){
  const digest=sha(fs.readFileSync(path.join(out,name)));
  if(digest!==sha(body))throw Error('Mismatch: '+name);
  added[name]=digest;
}
const report={baselineFiles:prior.length,baselineHash,additionalFiles:expected.size,completeTupleHash:hashFiles(out,current),sha256:added};
fs.writeFileSync(receipt,JSON.stringify(report,null,2)+'\n');
console.log(prior.length,'unchanged baseline files,',expected.size,'matching generated files');
