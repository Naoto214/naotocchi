import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {DAYPARTS} from '../../home-dayparts.mjs';

const root=new URL('../../',import.meta.url);
const approved={
  "sea-e.mjs": "449faf765c493c261c5355526d26881c85f410b2b12e459be57dcb927c32f59a",
  "forest-e.mjs": "3107cfa312c7c463936824d284b09700fef42661b8f15074f3d2c5d0787f4a2a",
  "fixture.json": "f8410097fa67b95d2fc5d7afaae38dca75d8dfe2c8f4eabfd6ea5f6223a61e39",
  "full-motion.mjs": "c93fef1527c6629e728f6b7ab5b9f634531d3201ee1addcb0b864107b38e6039",
  "other-regions.mjs": "437b5b930a1dc7cf0d79c6716f136fbe79dde0b313de44e91db3cb260e0d9af8",
  "nature.mjs": "7d1cdd479413b6ecd98d5bde074af49e3dfb9247f9b1eca7d8b377058472456e"
};

test('the five reference components and the saved resident fixture are pinned to the earlier Drafts',()=>{
  for(const [name,digest] of Object.entries(approved)){
    const bytes=readFileSync(new URL(name,import.meta.url));
    assert.equal(createHash('sha256').update(bytes).digest('hex'),digest,name);
  }
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
  assert.ok(files.every(name=>!name.startsWith('comparisons/home-beauty-v5/')));
  assert.doesNotMatch(readFileSync(new URL('index.html',root),'utf8'),/home-beauty-v5|beauty\/paint\.mjs/);
});
