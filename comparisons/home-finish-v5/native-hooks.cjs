// The V4 comparison already contains the camera, painting, seating, and cast
// hooks. Project only the native functions that changed after its source base.
const {createHash} = require('node:crypto');

const digest = value => createHash('sha256').update(value).digest('hex');

function replaceExact(source, oldText, newText, expected = 1) {
  if (!oldText || source.split(oldText).length !== expected + 1) throw Error('Unexpected source context: ' + oldText.slice(0, 90));
  return source.replaceAll(oldText, () => newText);
}

function section(source, start, end) {
  const first = source.indexOf(start);
  if (first === -1 || first !== source.lastIndexOf(start)) throw Error('Missing or ambiguous section: ' + start);
  const last = source.indexOf(end, first + start.length);
  if (last === -1) throw Error('Missing section end: ' + end);
  return source.slice(first, last);
}

function checkOriginal(source, expected, name) {
  if (digest(source) !== expected) throw Error('Unaccounted native changes outside the V5 integration: ' + name);
}

function composeController(native, archive) {
  let result = archive, original = native;
  // The V4 pause check in pointerdown precedes the shared gesture body.
  const regions = [
    ['    function visibilityTest(', '    function visibleAt(', '    function sync(){'],
    ['      gesture={pointerId:', '      gesture={pointerId:', '    function keydown('],
  ];
  for (const [candidateStart, archiveStart, end] of regions) {
    const updated = section(native, candidateStart, end);
    const old = section(archive, archiveStart, end);
    original = replaceExact(original, updated, old);
    result = replaceExact(result, old, updated);
  }
  const visibility = 'scene.visible=visibleAt;';
  const planner = visibility + 'scene.planVisibility=planVisibility;';
  result = replaceExact(result, visibility, planner, 2);
  original = replaceExact(original, planner, visibility, 2);
  checkOriginal(original, 'ecac051a6f903dab5ee2f266d70b879686e15a035fbcefd1e6a84fa5a2db783a', 'home-production-diorama.js');
  return result;
}

function composeWorld(native, archive) {
  const start = ' return {', end = '  occlusion(p)';
  const capability = start + 'pointIndependentOcclusion:';
  const previous = section(archive, start + 'setEnvironment,navigation,draw,observationPoints', end);
  const updated = section(native, capability, end);
  checkOriginal(replaceExact(native, updated, previous), 'd824c818c676353898afb052b43f8e88db9a14a7add55c3986af0104dbdc9ca6', 'home-production-world.mjs');
  return replaceExact(archive, previous, updated);
}

module.exports = {digest, replaceExact, composeController, composeWorld};
