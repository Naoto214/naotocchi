import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {DAYPARTS} from '../../home-dayparts.mjs';

const root=new URL('../../',import.meta.url);
test('the resident comparison fixture comes verbatim from #567',()=>{
  const bytes=readFileSync(new URL('fixture.json',import.meta.url));
  assert.equal(createHash('sha256').update(bytes).digest('hex'),'f8410097fa67b95d2fc5d7afaae38dca75d8dfe2c8f4eabfd6ea5f6223a61e39');
});
test('all 52 originals belong to the official package and the owner trial is outside it',()=>{
  const files=JSON.parse(readFileSync(new URL('tools/pages/allowlist.json',root))).files;
  const art=Object.values(DAYPARTS).flatMap(parts=>Object.values(parts));
  assert.equal(Object.keys(DAYPARTS).length,13);
  assert.equal(new Set(art).size,52);
  const aggregate=createHash('sha256');
  for(const name of art.sort()){
    assert.ok(files.includes(name),name);
    const bytes=readFileSync(new URL(name,root));
    const blob=createHash('sha1').update('blob '+bytes.length+'\0').update(bytes).digest('hex');
    aggregate.update(name+' '+blob+'\n');
  }
  // Names and Git blob IDs from the pinned main tree (38b4e9d0).
  assert.equal(aggregate.digest('hex'),'76effffda2557d826cbc78f95496e436d67f27fe248cf0255236aa4bfa6d1382');
  assert.ok(files.every(name=>!name.startsWith('comparisons/home-beauty-v6/')));
  assert.doesNotMatch(readFileSync(new URL('index.html',root),'utf8'),/home-beauty-v6|beauty\/paint\.mjs/);
});
