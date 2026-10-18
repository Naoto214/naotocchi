import test from 'node:test';
import assert from 'node:assert/strict';
import * as profile from '../player-profile.mjs';
import { PlayerStore, STORE_KEY } from '../player-store.mjs';
import { standardRules } from '../rules.mjs';

test('normal entry remains 8/24; only explicit trial 2/3/4 selects a candidate', () => {
  assert.equal(typeof profile.playerProfile, 'function');
  const normal = profile.playerProfile('');
  assert.equal(normal.gaugeUnit, 8);
  assert.equal(normal.storeKey, STORE_KEY);
  assert.equal(normal.trial, false);
  for (const unit of [2, 3, 4]) {
    const p = profile.playerProfile('?trial=' + unit);
    assert.equal(p.gaugeUnit, unit);
    assert.equal(p.trial, true);
    assert.notEqual(p.storeKey, STORE_KEY);
  }
  for (const search of ['?gauge=2', '?trial=1', '?trial=garbage', '?trial=2&trial=4'])
    assert.deepEqual(profile.playerProfile(search), normal);
  assert.equal(standardRules().gaugeUnit, 8);
});

test('trial saves, totals and history never overwrite standard or other candidates', () => {
  const m = new Map(), storage = {getItem: k => m.get(k) ?? null, setItem: (k,v) => m.set(k,v)};
  storage.setItem('naotocchi-save-v1', 'main-unchanged');
  const standard = new PlayerStore(storage);
  standard.load(); standard.save({standard: true}, [{id:'same', category:'clear', score:8, deaths:1,maxChain:3}]);
  const original = storage.getItem(STORE_KEY);
  for (const unit of [2,3,4]) {
    const key = `${STORE_KEY}-trial-${unit}`;
    const s = new PlayerStore(storage, key);
    assert.equal(s.load().snapshot, null);
    s.save({unit}, [{id:'same', category:'clear', score:unit, deaths:1,maxChain:2}]);
    assert.equal(new PlayerStore(storage, key).load().totals.clear.best, unit);
    assert.equal(storage.getItem(STORE_KEY), original);
  }
  assert.equal(storage.getItem('naotocchi-save-v1'), 'main-unchanged');
});
