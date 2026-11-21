import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';

const require = createRequire(import.meta.url);
const {patchSeats} = require('./seats.cjs');
const game = process.env.MOBILITY_GAME;
if (!game) throw new Error('Set MOBILITY_GAME to the pinned V9 comparison game directory');
const source = name => fs.readFileSync(path.join(game,`home-production-model-mobility-${name}.js`),'utf8');
const historic = source('v9-seats');
const fixed = source('v9');

test('the guarded fallback has exactly the ordinary sync, layout, save and movement implementation',()=>{
  const result = patchSeats(historic).replace("bindModel('v9-seats',","bindModel('v9',");
  assert.equal(result, fixed);
  assert.equal(historic.includes('next.compareFreshSeats === true'),true);
});

test('a change outside the optional seating block survives the fallback transformer',()=>{
  const next = historic.replace('function cancel(){','/* movement revision */function cancel(){');
  assert.notEqual(next,historic);
  assert.ok(patchSeats(next).includes('/* movement revision */function cancel(){'));
  assert.throws(()=>patchSeats(fixed),/V9 optional/);
});
