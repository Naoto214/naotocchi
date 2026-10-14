import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { CATALOG } from '../full-catalog.mjs';
const root = fileURLToPath(new URL('../../../', import.meta.url));

test('canonical catalog contains all452 current cards, including explicit vanilla', () => {
  assert.equal(Object.keys(CATALOG).length, 452);
  const counts = {};
  for (const [id, card] of Object.entries(CATALOG)) {
    assert.equal(card.id, id);
    counts[card.type] = (counts[card.type] || 0) + 1;
    assert.ok(card.name && card.text);
    assert.equal(typeof card.rare, 'boolean');
    assert.ok(Number.isInteger(card.cost) && card.cost >= 0);
    if (card.type === 'main') {
      assert.ok(Number.isInteger(card.stage) && card.stage >= 1 && card.stage <= 8);
      assert.ok(card.species && card.attribute && card.form);
      assert.ok(Number.isInteger(card.power) && card.power > 0);
      assert.ok(Number.isInteger(card.wisdom) && card.wisdom > 0);
    }
    if (['play', 'item', 'event'].includes(card.type)) {
      assert.ok(['すぐつかう', 'しかける', 'みにつける'].includes(card.method));
    }
  }
  assert.deepEqual(counts, { companion: 26, event: 21, play: 100, item: 26, main: 248, partner: 18, world: 13 });
  assert.equal(Object.values(CATALOG).filter(c => c.text === '能力なし。').length, 7);
  assert.equal(Object.values(CATALOG).filter(c => c.type === 'main' && c.rare).length, 64);
  assert.equal(CATALOG['M-ren-01'].rare, false);
});

test('every source is real, exact text is preserved, and content hashes match', () => {
  for (const card of Object.values(CATALOG)) {
    const [path, anchor] = card.source.split('#');
    assert.ok(path && anchor);
    const raw = readFileSync(`${root}docs/card-game/${path}`);
    const source = raw.toString();
    assert.equal(createHash('sha256').update(raw).digest('hex'), card.source_sha256, card.id);
    assert.ok(source.split('\n').some(line => /^#{1,3} /.test(line) && line.replace(/^#{1,3} /, '') === anchor), card.id);
    assert.ok(source.includes(card.text) || (card.text === '能力なし。' && source.includes('能力なし')), card.id);
  }
});

test('95/96 current revisions and canonical names survive export', () => {
  assert.equal(CATALOG['G-bowling-3d'].cost, 3);
  assert.ok(CATALOG['M-dragon-06'].text.includes('相手のメイン1枚または相手のなかま1枚'));
  assert.ok(CATALOG['M-stagbeetle-06'].text.includes('このメイン以外'));
  assert.ok(CATALOG['M-penguin-07'].text.includes('次の自分のターン開始時まで'));
  assert.ok(CATALOG['M-dandelion-04'].text.includes('手札または捨て札'));
  assert.ok(CATALOG['P-snowman'].text.includes('手札または捨て札'));
  assert.ok(CATALOG['G-p3-drive'].text.includes('捨て札'));
  assert.equal(CATALOG['M-antlion-01'].name, 'アリジゴク①');
});

test('regeneration is deterministic and read-only in check mode', () => {
  const path = `${root}prototypes/card-game/full-catalog.mjs`;
  const before = readFileSync(path);
  execFileSync('python', [`${root}prototypes/card-game/build_full_catalog.py`, '--check'], { cwd: root });
  assert.deepEqual(readFileSync(path), before);
});
