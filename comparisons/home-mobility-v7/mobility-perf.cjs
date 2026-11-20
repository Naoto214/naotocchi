const {replaceExact} = require('../home-finish-v5/native-hooks.cjs');

function patchRuntime(name, source) {
  if (name !== 'home-production-touch-finish.js') return source;
  // This branch returns the current viewport's authoritative world rectangle.
  // Resident animation and camera changes continue through the original code.
  return replaceExact(source,
    `  const r=e.getBoundingClientRect();
  if(presentation?.world&&e.matches?.('.home-living-world'))return presentation.world;`,
    `  if(presentation?.world&&e.matches?.('.home-living-world'))return presentation.world;
  const r=e.getBoundingClientRect();`);
}

module.exports = {patchRuntime};
