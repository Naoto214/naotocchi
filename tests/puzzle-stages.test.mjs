import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createGameState, deserializeBoard, gameMove, isComplete, materialRules, serializeBoard } from '../prototypes/naopoyo-100/engine.mjs';
import { stages } from '../prototypes/naopoyo-100/stages.mjs';
import { tutorialPages } from '../prototypes/naopoyo-100/tutorial.mjs';

function checkSolution({ board, solution }) {
  const state = createGameState(board);
  const total = species => state.actors.filter(a => a.species === species).reduce((mass, a) => mass + a.level, state.rescuedBySpecies[species] || 0);
  const initial = ['dog', 'frog', 'fish', 'penguin'].map(total);
  assert.equal(isComplete(state), false, board.id);
  assert.ok(solution.length > 0, board.id);
  for (const { x, y, dx, dy } of solution) {
    const actor = state.actors.find(a => a.x === x && a.y === y);
    assert.ok(actor, `${board.id} actor at ${x},${y}`);
    assert.equal(gameMove(state, actor.id, dx, dy).ok, true, `${board.id} move ${state.moves + 1}`);
    assert.deepEqual(['dog', 'frog', 'fish', 'penguin'].map(total), initial);
    assert.equal(new Set(state.actors.map(a => `${a.x},${a.y}`)).size, state.actors.length, board.id);
    for (const a of state.actors) {
      assert.ok(!state.walls.some(([x, y]) => a.x === x && a.y === y), `${board.id} actor in a wall`);
      assert.ok(a.level >= 1 && a.level <= 8, `${board.id} stage out of range`);
    }
  }
  assert.equal(isComplete(state), true, board.id);
}

test('all 100 numbered, distinct 8×8 stages have full replayable solutions and documented material rules', () => {
  assert.equal(stages.length, 100);
  assert.equal(new Set(stages.map(s => s.id)).size, 100);
  assert.equal(new Set(stages.map(s => s.title)).size, 100);
  const fingerprints = new Set();
  for (const [i, stage] of stages.entries()) {
    assert.equal(stage.number, i + 1);
    assert.equal(stage.difficulty, i + 1);
    for (const field of ['title', 'text', 'idea', 'difference', 'goal', 'hint', 'mainGimmick']) assert.ok(stage[field].length, `${stage.id} ${field}`);
    assert.ok(['導入', '応用', '複合'].includes(stage.learning));
    const data = serializeBoard(stage.board);
    assert.equal(data.board.width, 8);
    assert.equal(data.board.height, 8);
    const signature = JSON.stringify([data.board, data.instances, data.startActors.map(({ id, ...a }) => a)]);
    assert.ok(!fingerprints.has(signature), stage.id);
    fingerprints.add(signature);
    assert.deepEqual([...new Set(data.instances.map(t => t.catalogId))].sort(), [...stage.materials].sort());
    for (const id of stage.materials) assert.ok(materialRules[id], id);
    checkSolution(stage);
  }
});

test('the interactive picture book is separate and fully playable', () => {
  assert.ok(tutorialPages.length >= 6);
  for (const page of tutorialPages) {
    assert.equal(page.number, undefined);
    checkSolution(page);
  }
});


test('the catalog exchange and solve reports match every shipped stage', () => {
  const read = path => JSON.parse(readFileSync(new URL(path, import.meta.url), 'utf8'));
  const data = read('../prototypes/naopoyo-100/stage-data.json');
  const report = read('../docs/naopoyo-100-v1/validation.json');
  const solutions = read('../docs/naopoyo-100-v1/solutions.json');
  const catalog = new Set(read('../docs/naopoyo-gimmick-atlas-v2/catalog.json').entries.map(e => e.catalogId));
  assert.equal(data.stages.length, 100);
  assert.equal(report.counts.replayed, 100);
  assert.equal(solutions.stages.length, 100);
  for (const [i, stage] of stages.entries()) {
    const { exchange, id } = data.stages[i];
    assert.equal(id, stage.id);
    assert.ok(stage.materials.every(key => catalog.has(key)), id);
    assert.ok(stage.materials.includes(stage.mainGimmick), id);
    assert.deepEqual(solutions.stages[i].commands, stage.solution);
    assert.equal(report.stages[id].commands, stage.solution.length);
    checkSolution({ board: deserializeBoard(exchange), solution: stage.solution });
  }
});
