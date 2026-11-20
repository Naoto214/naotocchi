const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {listFiles,hashFiles} = require('../home-finish-v5/build.cjs');
const {digest} = require('../home-finish-v5/native-hooks.cjs');
const {prepare,referenceBundle} = require('./build.cjs');

function verify(before, after) {
  const original = listFiles(before);
  const all = listFiles(after);
  assert.equal(original.length,3938);
  assert.equal(hashFiles(before,original),referenceBundle);
  assert.equal(hashFiles(after,original),referenceBundle);
  const expected = prepare(before);
  assert.deepEqual(new Set(all),new Set([...original,...expected.keys()]));
  const extra = {};
  for (const [name,body] of expected) {
    extra[name]=digest(fs.readFileSync(path.join(after,name)));
    assert.equal(extra[name],digest(body),name);
  }
  const control = fs.readFileSync(path.join(after,'game/drag-v5.html'),'utf8');
  const candidate = fs.readFileSync(path.join(after,'game/drag-v6.html'),'utf8');
  // The two documents differ only in the references to the three scoped modules.
  const change = /<script src="(home-production-model|home-production-diorama|script-v2)(?:-finish|-drag-v6)?\.js\?v=[^"]+"><\/script>/g;
  const canonical = html => html.replace(change,(tag,base)=>'<script src="'+base+'"></script>');
  assert.equal(canonical(control),canonical(candidate));
  assert.equal(control.match(change).length,3);
  return {reference:'a0df9061c26dde237158ba3423dd4732ca8bec42',
    originalFilesUnchanged:original.length,originalTreeSha256:referenceBundle,
    candidateTreeSha256:hashFiles(after,all),newFiles:extra,
    htmlDiffersOnlyInThreeNativeScripts:true};
}

if(require.main===module) {
  const [before,after,out]=process.argv.slice(2);
  if (!before||!after||!out) throw Error('Usage: node verify-package.cjs V5_DIST V6_DIST REPORT.json');
  const result=verify(path.resolve(before),path.resolve(after));
  fs.writeFileSync(out,JSON.stringify(result,null,2)+'\n');
  console.log('Verified %d original files and %d comparison files',result.originalFilesUnchanged,Object.keys(result.newFiles).length);
}
module.exports={verify};
