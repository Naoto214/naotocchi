const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const controller = fs.readFileSync(path.join(__dirname, '../../home-production-diorama.js'), 'utf8');
const input = controller.slice(controller.indexOf('    function down(e){'), controller.indexOf('    function keydown(e){'));

function gesture({distance, cameraShift = 0, pause = false, ground = false, moveBefore = null}) {
  const commands = [];
  let offset = 0, blocked = false;
  const scope = {
    enabled: true, gesture: null, stage: {setPointerCapture() {}},
    hit: () => ground ? null : 'pet', point: e => ({x: e.clientX - offset, y: e.clientY}),
    blocked: () => blocked, clearGesture() {scope.gesture = null;},
    model: {selected: () => 'pet', select() {}, snapshot: () => [],
      move(key, p, source) {commands.push([key, source, p.x]); return true;}},
    paint() {}, resume() {}, guide: {visible: () => false, drag() {}}, showGuide() {},
  };
  const handlers = vm.runInNewContext(input + '\n;({down,move,up});', scope);
  const at = x => ({pointerId: 1, clientX: x, clientY: 20, button: 0, preventDefault() {}});
  handlers.down(at(50));
  if (moveBefore !== null) handlers.move(at(50 + moveBefore));
  blocked = pause;
  offset = cameraShift;
  handlers.up(at(50 + distance));
  return commands;
}

test('the final pointer position can cross the native drag threshold', () => {
  assert.deepEqual(gesture({distance: 8}), [['pet', 'drag', 58]]);
  assert.deepEqual(gesture({distance: 9, moveBefore: 5}), [['pet', 'drag', 59]]);
  assert.deepEqual(gesture({distance: 0, moveBefore: 9}), [['pet', 'drag', 50]]);
});

test('small taps, camera changes, pause and ground gestures preserve their original behavior', () => {
  assert.deepEqual(gesture({distance: 7}), []);
  assert.deepEqual(gesture({distance: 2, cameraShift: 30}), []);
  assert.deepEqual(gesture({distance: 10, pause: true}), []);
  assert.deepEqual(gesture({distance: 10, ground: true}), [['pet', 'ground', 60]]);
});
