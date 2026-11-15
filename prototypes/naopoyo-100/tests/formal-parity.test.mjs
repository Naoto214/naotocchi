import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { createGameState, gameMove } from '../engine.mjs';
import { createState, move } from '../../naopoyo-time-hand-chapter1/engine.mjs';
import { solutions } from '../../naopoyo-time-hand-chapter1/solutions.mjs';
import { stages } from '../../naopoyo-time-hand-chapter1/stages.mjs';

const directions = [[0, -1], [1, -1], [1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1]];
const adapterStateKeys = new Set(['baseWalls', 'layout', 'crates', 'flags', 'sequenceProgress', 'pressed', 'collapsed']);
const physics = state => Object.fromEntries(Object.entries(state).filter(([key]) => !adapterStateKeys.has(key)));
const pair = board => [createState(board), createGameState(board)];

test('the formal physics imports outside the chapter match the adopted PR504 bytes', () => {
  // The chapter files themselves are pinned in puzzle-protection.test.mjs.
  const hashes = {
    '../../naopoyo-v2/engine.mjs': 'a79bfb3459a11198402eb6081f5f2d47d6c67347dc287a1f90e1af187919507c',
    '../../naopoyo-rescue/conditions.mjs': '2bb6f3dc0a2e6e020a37509dc9197e59d61713ddebc2d0c13708fff81051849c'
  };
  for (const [path, expected] of Object.entries(hashes)) {
    assert.equal(createHash('sha256').update(readFileSync(new URL(path, import.meta.url))).digest('hex'), expected, path);
  }
});

function compareStep(formal, prototype, action, label = action.join('/')) {
  const before = structuredClone(formal);
  const expected = move(formal, ...action);
  // Heading is bookkeeping for forced movement, and the adapter always supplies an events array.
  const { heading, events, ...result } = gameMove(prototype, ...action);
  const { events: expectedEvents, ...expectedResult } = expected;
  assert.deepEqual(result, expectedResult, `${label} result`);
  assert.deepEqual(events, expectedEvents ?? [], `${label} events`);
  assert.deepEqual(physics(prototype), formal, `${label} physics`);
  if (!expected.ok) assert.deepEqual(formal, before, `${label} rejected move mutated physics`);
  return { ...result, events };
}

for (const [index, { id, board }] of stages.entries()) {
  test(`PR504 stage ${id} matches at each solution step and adjacent attempt`, () => {
    const [formal, prototype] = pair(board);
    assert.deepEqual(physics(prototype), formal);
    for (const [step, action] of solutions[index].entries()) {
      for (const actor of formal.actors) {
        for (const [dx, dy] of directions) {
          compareStep(structuredClone(formal), structuredClone(prototype), [actor.id, dx, dy],
            `step ${step} neighbor ${actor.id}/${dx}/${dy}`);
        }
      }
      assert.equal(compareStep(formal, prototype, action, `solution step ${step}`).ok, true);
    }
    assert.deepEqual(prototype.actors, []);
    assert.equal(prototype.moves, solutions[index].length);
  });
}

const actor = (id, x, y, level = 1, species = 'dog') => ({ id, x, y, level, species });
const fixture = (actors, extra = {}) => pair({ ...stages[0].board, actors, exits: [], ...extra });
const spike = { x: 3, y: 3, power: 7 };
const gate = { x: 3, y: 3, exact: 2 };
const positions = actors => actors.map(({ x, y }) => [x, y]);

test('D starts directly behind all eight entry directions', () => {
  for (const [dx, dy] of directions) {
    const states = fixture([actor('a', 3 - dx, 3 - dy, 8)], { spikes: [spike] });
    const result = compareStep(...states, ['a', dx, dy]);
    assert.deepEqual(result.children[0], actor('child1', 3 - dx, 3 - dy));
  }
});

test('D births at most seven and always leaves at least one on the spike', () => {
  const fixtureSpike = { x: 3, y: 7, power: 7 };
  const full = fixture([actor('a', 3, 6, 8)], { spikes: [fixtureSpike] });
  assert.deepEqual(positions(compareStep(...full, ['a', 0, 1]).children), [[3, 6], [3, 5], [3, 4], [3, 3], [3, 2], [3, 1], [3, 0]]);
  assert.equal(full[1].actors[0].level, 1);

  const minimum = fixture([actor('a', 3, 6)], { spikes: [fixtureSpike] });
  assert.equal(compareStep(...minimum, ['a', 0, 1]).splitBlocked, 'minimum');
  assert.deepEqual(minimum[1].actors, [actor('a', 3, 7)]);
});

test('D turns clockwise and keeps the new heading past each birth blocker', () => {
  const blocker = { x: 3, y: 1 };
  const fixtures = {
    wall: { walls: [[3, 1]] },
    companion: { actors: [actor('a', 3, 2, 8), actor('b', 3, 1, 1, 'frog')] },
    gate: { gates: [{ ...blocker, exact: 1 }] },
    exit: { exits: [{ ...blocker, exact: 1 }] },
    spike: { spikes: [spike, { ...blocker, power: 1 }] }
  };
  for (const [name, extra] of Object.entries(fixtures)) {
    const states = fixture([actor('a', 3, 2, 8)], { spikes: [spike], ...extra });
    const result = compareStep(...states, ['a', 0, 1], name);
    assert.deepEqual(positions(result.children).slice(0, 4), [[3, 2], [4, 2], [5, 2], [6, 2]], name);
  }
});

test('D stops before revisiting generated children or jumping past a blocked edge', () => {
  const closure = fixture([actor('a', 2, 2, 8)], { spikes: [spike] });
  assert.deepEqual(positions(compareStep(...closure, ['a', 1, 1]).children), [[2, 2], [1, 1], [0, 0]]);
  const shortage = fixture([actor('a', 3, 2, 8)], { spikes: [spike], walls: [[3, 1], [2, 2], [4, 2]] });
  assert.deepEqual(positions(compareStep(...shortage, ['a', 0, 1]).children), [[3, 2]]);
  assert.equal(shortage[1].actors[0].level, 7);
});

test('D cannot birth across a diagonal sealed by a gate roof and rock', () => {
  const states = fixture([actor('a', 2, 4, 8)], {
    spikes: [spike], gates: [{ x: 2, y: 5, exact: 1 }], walls: [[1, 4]]
  });
  const result = compareStep(...states, ['a', 1, -1]);
  assert.deepEqual(positions(result.children).slice(0, 2), [[2, 4], [1, 3]]);
});

test('same-species contact merges, caps at eight and validates surplus at the source gate', () => {
  const merge = fixture([actor('a', 2, 3, 2), actor('b', 3, 3, 3)]);
  assert.equal(compareStep(...merge, ['a', 1, 0]).merged, 3);
  assert.deepEqual(merge[1].actors, [actor('a', 3, 3, 5)]);
  const overflow = fixture([actor('a', 2, 3, 8), actor('b', 3, 3, 8)]);
  assert.equal(compareStep(...overflow, ['a', 1, 0]).overflow, 8);
  assert.deepEqual(overflow[1].actors, [actor('a', 3, 3, 8), actor('b', 2, 3, 8)]);
  const blocked = fixture([actor('a', 2, 3, 8), actor('b', 3, 3, 4)], {
    gates: [{ x: 2, y: 3, exact: 8, open: true }]
  });
  assert.equal(compareStep(...blocked, ['a', 1, 0]).reason, 'gate');
});

test('different species exchange places only if both can enter', () => {
  const actors = [actor('a', 2, 3, 8), actor('b', 3, 3, 8, 'frog')];
  const swap = fixture(actors);
  assert.equal(compareStep(...swap, ['a', 1, 0]).swapped, 'b');
  assert.deepEqual(swap[1].actors, [actor('a', 3, 3, 8), actor('b', 2, 3, 8, 'frog')]);
  const blocked = fixture(actors, { gates: [{ x: 2, y: 3, species: 'dog', open: true }] });
  assert.equal(compareStep(...blocked, ['a', 1, 0]).reason, 'gate');
});

test('a gate roof supports gravity and closes one orthogonal route at a diagonal', () => {
  const support = fixture([actor('a', 2, 2, 2)], { gates: [gate], gravity: true });
  assert.deepEqual(compareStep(...support, ['a', 1, 0]).events, []);
  assert.deepEqual(support[1].actors, [actor('a', 3, 2, 2)]);
  assert.equal(compareStep(...support, ['a', 0, 1]).reason, 'gate-top');

  const inside = fixture([actor('a', 3, 3, 2)], { gates: [{ ...gate, open: true }] });
  assert.equal(compareStep(...inside, ['a', 0, -1]).reason, 'gate-top');
  assert.deepEqual(compareStep(...inside, ['a', 1, 0]).events, []);

  const blocked = fixture([actor('a', 2, 2, 2)], { gates: [gate], walls: [[2, 3]] });
  assert.equal(compareStep(...blocked, ['a', 1, 1]).reason, 'corner');
  const open = fixture([actor('a', 2, 2, 2)], { gates: [gate] });
  assert.deepEqual(compareStep(...open, ['a', 1, 1]).events, [{ type: 'phase', id: 'a', x: 3, y: 3, level: 2 }]);
  assert.equal(open[1].gates[0].open, true);
});

test('gravity stops at a saturated same-species support without an exchange', () => {
  const states = fixture([actor('a', 2, 5, 2), actor('b', 3, 7, 8)], { gravity: true, walls: [[2, 6]] });
  const result = compareStep(...states, ['a', 1, 0]);
  assert.deepEqual(result.events, [{ type: 'fall', id: 'a', from: 5, to: 6, x: 3 }]);
  assert.deepEqual(states[1].actors, [actor('a', 3, 6, 2), actor('b', 3, 7, 8)]);
  assert.equal(compareStep(...states, ['a', 0, -1]).reason, 'foothold');
});

test('one gravity move can split and recombine while firing each spike only once', () => {
  const states = pair(stages[8].board);
  const result = compareStep(...states, solutions[8][0]);
  const splits = result.events.filter(event => event.type === 'split');
  assert.equal(splits.length, 1);
  assert.deepEqual(positions(splits[0].children), [[4, 4], [4, 3]]);
  assert.deepEqual(result.events.filter(event => event.type === 'merge').map(event => event.level), [2, 3]);
  assert.deepEqual(states[1].actors, [actor('parent', 4, 6, 3)]);
});

test('mismatched exits are passable and do not arrest a fall', () => {
  const walk = fixture([actor('a', 2, 2, 2)], { exits: [{ x: 3, y: 2, species: 'frog' }, { x: 4, y: 2, exact: 2 }] });
  assert.deepEqual(compareStep(...walk, ['a', 1, 0]).events, []);
  assert.equal(walk[1].rescued, 0);
  assert.equal(compareStep(...walk, ['a', 1, 0]).rescued, 2);

  const fall = fixture([actor('a', 2, 2, 2)], {
    gravity: true, exits: [{ x: 3, y: 3, exact: 1 }, { x: 3, y: 4, exact: 2 }],
    tiles: [{ x: 0, y: 7, catalogId: 'sign.gravity', params: {} }]
  });
  assert.deepEqual(compareStep(...fall, ['a', 1, 0]).events, [
    { type: 'fall', id: 'a', from: 2, to: 3, x: 3 },
    { type: 'rescue', id: 'a', x: 3, y: 4, level: 2 },
    { type: 'fall', id: 'a', from: 3, to: 4, x: 3 }
  ]);
  assert.deepEqual(fall[1].rescuedBySpecies, { dog: 2 });
});
