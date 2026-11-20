import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFinishScene, sceneQuery, finishFrameURL} from './shell-model.mjs';

const base = 'https://example.invalid/private/v5/';
const readReference = () => ({region:'river_lake', time:'night', paused:true});

test('accepts every household and rejects ambiguous count formats', () => {
  for (let count = 1; count <= 28; count++)
    assert.equal(readFinishScene(new URLSearchParams({count}), readReference).count, count);
  for (const count of ['', '0', '-1', '29', '19.5', '019', '2e1', ' 19'])
    assert.equal(readFinishScene(new URLSearchParams({count}), readReference).count, 28);
});

test('owner and embedded links preserve the scene and omit retired controls', () => {
  const input = new URLSearchParams('ground=off&count=19&variant=C&curve=step&layout=fixed&policy=A');
  const scene = readFinishScene(input, readReference);
  assert.deepEqual(scene, {region:'river_lake', time:'night', paused:true, ground:'off', count:19});
  const game = finishFrameURL(scene, base);
  assert.equal(game.pathname, '/private/game/finish.html');
  assert.equal(game.origin, new URL(base).origin);
  assert.equal(game.searchParams.toString(), sceneQuery(scene).toString());
  assert.deepEqual(Object.fromEntries(game.searchParams), {
    region:'river_lake', time:'night', count:'19', paused:'1', ground:'off',
  });
  for (const ground of ['', '0', 'on', 'true', 'original'])
    assert.equal(readFinishScene(new URLSearchParams({ground}), readReference).ground, 'on');
});
