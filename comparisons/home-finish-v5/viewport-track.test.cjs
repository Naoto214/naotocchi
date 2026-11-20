const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');

const source = require('./native-source.cjs').readNative('home-production-touch.js');
function between(start, end) {
  const first = source.indexOf(start), last = source.indexOf(end, first + start.length);
  assert.ok(first >= 0 && last > first);
  return source.slice(first, last);
}

// Run the native independent rAF callback once and count actual rect() calls.
// A display:none ancestor gives an actor zero layout height despite its presence.
const actorList = between(' function actors(', ' function reveal(');
const tracking = between(' function track(){', ' schedule();root.requestAnimationFrame(track);');
function exercise(heights) {
  let reads = 0;
  const nodes = heights.map(height => ({getBoundingClientRect() { reads++; return {height}; }}));
  const stage = {dataset:{}, querySelectorAll(css) { assert.equal(css,'[data-diorama-actor]'); return nodes; }};
  const context = vm.createContext({root:{requestAnimationFrame() {}}, v12:true, v11:true,
    v10:true, active:true, stage, rect:e=>e.getBoundingClientRect()});
  vm.runInContext(actorList + tracking + 'track();', context);
  const frameReads = reads;
  const all = Array.from(vm.runInContext('actors()', context));
  assert.deepEqual(all, nodes.filter((_, i) => heights[i] > 0));
  assert.equal(reads - frameReads, heights.length, 'full-roster callers retain every visible resident');
  return [stage.dataset.homeSingleActor,frameReads];
}

test('tracking reports the exact visible-height predicate and stops at the second visible actor', () => {
  assert.deepEqual(exercise([]), ['true',0]);
  assert.deepEqual(exercise([0,0,0]), ['true',3]);
  assert.deepEqual(exercise([0,.25,0]), ['true',3]);
  assert.deepEqual(exercise([0,NaN,9,0,4,0,0]), ['false',5]);
  assert.deepEqual(exercise(Array(28).fill(1)), ['false',2]);
});
