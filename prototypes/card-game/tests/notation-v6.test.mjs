import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {CATALOG as sources} from '../full-catalog.mjs';
import {abilityName} from '../display-catalog.mjs';
import {CARDS, restore, save} from '../engine.mjs';
import {readFileSync} from 'node:fs';
import {collectionCards} from '../collection.mjs';
import {filterCards} from '../my-decks.mjs';
import {recordCards} from '../records-ui.mjs';
import {cardMarkup, detailMarkup} from '../ui-presentation.mjs';
import {projectOperation} from '../ui-context.mjs';

function digest(entries) {
  return createHash('sha256').update(JSON.stringify(entries)).digest('hex');
}

test('11 approved titles resolve by both names in the collection, deck builder and records', () => {
  const changed = [];
  assert.deepEqual(Object.keys(CARDS), Object.keys(sources));
  assert.equal(Object.keys(CARDS).length, 459);
  for (const id of Object.keys(sources).sort()) {
    const card = CARDS[id], source = sources[id];
    if (card.name === source.name) {
      assert.deepEqual(card, source);
      continue;
    }
    changed.push([id, card.name]);
    assert.deepEqual(card, {...source, name: card.name, searchAliases: [...(source.searchAliases ?? []), source.name]});
    for (const query of [source.name, card.name, id]) {
      for (const result of [collectionCards({query}), filterCards({query}), recordCards(query)]) {
        assert.ok(result.some(entry => entry.id === id), id + ' / ' + query);
      }
    }
  }
  assert.equal(changed.length, 11);
  assert.equal(digest(changed), 'cbcb830f7b9ea24ff99459427d5ae2bcfea8fd26eda29e9526c0aa8f2bfce99a');
});

function effectSource(card, linkKind = 'ability') {
  const link = {source: 'instance', actor: 'A', kind: linkKind};
  const board = {companions: [], prepared: []};
  const projected = {phase: 'trigger', actor: 'A', players: {A: {hand: [card], discard: [], board}}, actions: []};
  projectOperation({pending: [link]}, projected, 'A');
  return projected.effect;
}

test('166 approved ability headings agree in card details, collection details and public effect sources', () => {
  const changed = [];
  for (const id of Object.keys(sources).sort()) {
    const src = sources[id];
    if (src.type !== 'main') continue;
    const projected = {...CARDS[id], cardId: id, id: 'instance'};
    const original = src.source.match(/「([^」]+)」/)?.[1];
    const title = abilityName(projected);
    if (title !== original) changed.push([id, title]);
    if (!title) continue;
    assert.ok(cardMarkup(projected, {detail: true}).includes('>' + title + '</strong>'), id);
    const detail = detailMarkup(projected, {catalog: true});
    assert.ok(detail.includes('<h3>' + title + '</h3>'), id);
    assert.equal(effectSource(projected).ability, title, id);
  }
  assert.equal(changed.length, 166);
  assert.equal(digest(changed), '9ccde6a42678652a3771ccbfff8c0bf12a58af2818c561ddab24143f32935d40');
  const example = {...CARDS['M-dandelion-05'], cardId: 'M-dandelion-05', id: 'instance'};
  assert.equal(abilityName(example), 'つぼみを守る');
  assert.equal(abilityName({...example, hidden: true}), undefined);
  assert.equal(effectSource({...example, hidden: true}).ability, 'カード効果');
  assert.equal(effectSource(example, 'birth').ability, 'たんじょう時の効果');
});


test('old command histories restore identical save bytes and regenerate the current E-mirror title', () => {
  const fixtures = JSON.parse(readFileSync(new URL('./doodle-jump-hotseat2-saves.json', import.meta.url), 'utf8'));
  const expected = {'old-second-skip-plus5': 9, 'single-step-draw': 5, 'multi-step-draw': 10};
  for (const row of fixtures.rows) {
    const bytes = JSON.stringify(row.save);
    const state = restore(bytes);
    assert.equal(save(state), bytes);
    assert.deepEqual(state.result, row.result);
    assert.equal(state.log.filter(line => line.includes('年をとった自分')).length, expected[row.case]);
    assert.ok(state.log.every(line => !line.includes('としをとったじぶん')));
  }
});
