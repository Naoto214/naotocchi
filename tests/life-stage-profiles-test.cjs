'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const lifeStages = require('../life-stage-profiles.js');

const { PROFILES, LINE_PROFILE, LINE_OVERRIDES, minsForLine, stageForAge, transformAside } = lifeStages;

for (const [name, mins] of Object.entries(PROFILES)) {
  assert.equal(mins.length, 8, `${name}: 8 stages`);
  assert.equal(mins[0], 0, `${name}: starts at age 0`);
  assert.ok(mins[7] < 100, `${name}: stage 8 starts before 100`);
  for (let i = 1; i < mins.length; i += 1) {
    assert.ok(mins[i] > mins[i - 1], `${name}: boundaries increase`);
  }
}
for (const [line, mins] of Object.entries(LINE_OVERRIDES)) {
  assert.equal(mins.length, 8, `${line}: 8 override stages`);
  assert.equal(mins[0], 0, `${line}: override starts at 0`);
  assert.ok(mins[7] < 100, `${line}: override reaches stage 8 before 100`);
}

const master = fs.readFileSync(path.join(__dirname, '..', 'character-world-master.v1.js'), 'utf8');
const speciesBlock = master.slice(master.indexOf('playerSpecies:'), master.indexOf('companions:'));
const playableIds = [...speciesBlock.matchAll(/\{ id: '([^']+)'/g)]
  .map((match) => match[1])
  .filter((id) => id !== 'naoto');
for (const id of playableIds) {
  assert.ok(LINE_PROFILE[id] || LINE_OVERRIDES[id], `life-stage mapping exists for ${id}`);
  assert.equal(stageForAge(100, id), 7, `${id}: reaches stage 8 by age 100`);
}

assert.equal(stageForAge(50, 'man'), 6, '50-year-old human is stage 7');
assert.equal(stageForAge(50, 'cicada'), 2, '50-year-old cicada is still stage 3 larval life');
assert.equal(stageForAge(70, 'cicada'), 3, 'cicada reaches stage 4 at 70');
assert.equal(stageForAge(98, 'cicada'), 7, 'cicada reaches stage 8 at 98');
assert.equal(stageForAge(50, 'butterfly'), 4, '50-year-old butterfly is stage 5');
assert.deepEqual(minsForLine('legacy_unknown_species'), lifeStages.DEFAULT_MINS, 'legacy species use safe default');

assert.equal(transformAside('cicada', 6, 2), 'まだ ちじょうには でないみたい。');
assert.equal(transformAside('butterfly', 6, 4), 'こんどは さなぎの じかん。');
assert.equal(transformAside('cat', 6, 3), 'まだまだ これからみたい。');
assert.equal(transformAside('man', 2, 6), 'こっちでは もう りっぱなおとな。');
assert.equal(transformAside('man', 6, 6), '');

const script = fs.readFileSync(path.join(__dirname, '..', 'script.js'), 'utf8');
assert.match(script, /stageForAge\(currentAge\(\), line\)/, 'transform candidates use destination species age');
assert.match(script, /const beforeStageIndex = currentFormStageIndex\(\)/, 'transform captures origin stage');
assert.match(script, /const afterStageIndex = stageForAge\(currentAge\(\), line\)/, 'transform derives destination stage at same age');
assert.match(script, /transformAside\(line, beforeStageIndex, afterStageIndex\)/, 'transform adds life-stage aside');

console.log('life-stage profiles: ok');
