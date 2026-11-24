import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {DAYPARTS} from '../../home-dayparts.mjs';

const root=new URL('../../',import.meta.url);
test('the resident comparison fixture comes verbatim from #568',()=>{
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
  assert.ok(files.every(name=>!name.startsWith('comparisons/home-beauty-v7/')));
  assert.doesNotMatch(readFileSync(new URL('index.html',root),'utf8'),/home-beauty-v7|beauty\/paint\.mjs/);
});

test('cast styles, shared motion and protected renderers match the #568 Git blobs',()=>{
  const protectedFiles = {
    'cast.css':'c7c2168c788ccd335cbd3858f614d0bc3e025b7d',
    'deepsea-stars.mjs':'575a41fc5cde6a93e0ccee0a8d0bed632cbfb697',
    'fall-motion.mjs':'475c4ffbb63695f003f3a95553bf493444660862',
    'full-motion.mjs':'ee3072ba3882a79e66e7a0f0bfab8ac2d4d55d26',
    'mountain-jungle-desert.mjs':'5f7f77df06feb2a1778509abb53a6e8e586247be',
    'nature.mjs':'494ca1246a8560b1edd7052fe53b753ed9c34374',
    'other-regions.mjs':'c036ce2c751bd37c1bc682777651c35b804d9fee',
    'regional-fall.mjs':'dd879bfe1bd6bc0d9dd6a36520823168aaaa74c2',
    'sea-e.mjs':'6fab9a34cfa8a644b7a74f8dac4a90117bdcfc03',
    'snow-city-lake.mjs':'5da4b06acfb35491c4d929e828fa389165c8a1d4'
  };
  for (const [name, expected] of Object.entries(protectedFiles)) {
    const bytes = readFileSync(new URL(name, import.meta.url));
    const actual = createHash('sha1').update('blob '+bytes.length+'\0').update(bytes).digest('hex');
    assert.equal(actual, expected, name);
  }
});
