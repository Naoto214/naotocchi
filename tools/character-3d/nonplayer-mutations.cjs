const fs = require('node:fs');
const path = require('node:path');
const cp = require('node:child_process');
const root = path.resolve(__dirname, '../..');

// Add explicit mappings here when introducing another scoped candidate batch.
const scriptsByKey = new Map([
  ['companion:owl', 'owl-remove-it.cjs'],
  ['companion:punyu', 'punyu-remove-it.cjs'],
  ['companion:parrot', 'parrot-remove-it.cjs'],
  ['companion:clock', 'clock-remove-it.cjs'],
  ['partner:oasis_cactus', 'cactus-remove-it.cjs'],
  ['companion:box', 'nonplayer-wave-remove-it.cjs'],
  ['partner:sunflower_partner', 'nonplayer-wave-remove-it.cjs'],
  ...['rabbit_friend', 'tanuki', 'squirrel', 'hamster', 'panda']
    .map(key => ['companion:' + key, 'small-mammal-remove-it.cjs']),
  ...['otter', 'monkey', 'sheep', 'seal', 'hedgehog']
    .map(key => ['companion:' + key, 'other-mammal-remove-it.cjs']),
  ...['bat', 'chicken', 'penguin_friend', 'snail', 'chameleon']
    .map(key => ['companion:' + key, 'birds-reptiles-remove-it.cjs']),
]);

function selectScripts(config) {
  if (!config || !Array.isArray(config.keys) || config.keys.length === 0) {
    throw new Error('Nonplayer mutation selection requires a nonempty keys array');
  }
  const scripts = new Set();
  for (const key of config.keys) {
    if (typeof key !== 'string' || !scriptsByKey.has(key)) {
      throw new Error('Unsupported nonplayer mutation key: ' + JSON.stringify(key));
    }
    scripts.add(scriptsByKey.get(key));
  }
  return [...scripts];
}

function runScoped(configPath, outputDir, spawn = cp.spawnSync) {
  let config;
  try { config = JSON.parse(fs.readFileSync(configPath, 'utf8')); }
  catch (error) { throw new Error('Cannot read nonplayer mutation selection: ' + error.message); }
  // Validate the entire list before creating logs or executing any mutation.
  const scripts = selectScripts(config);
  fs.mkdirSync(outputDir, { recursive: true });
  for (const script of scripts) {
    console.log('Selected nonplayer mutation: ' + script);
    const log = fs.openSync(path.join(outputDir, script.replace(/\.cjs$/, '.txt')), 'w');
    let result;
    try {
      result = spawn(process.execPath, [path.join(__dirname, script)], {
        cwd: root, stdio: ['ignore', log, log],
      });
    } finally { fs.closeSync(log); }
    if (result.error || result.status !== 0) {
      throw new Error('Nonplayer mutation ' + script + ' failed: ' +
        (result.error?.message || result.signal || 'exit ' + result.status));
    }
  }
  return scripts;
}

if (require.main === module) {
  try {
    runScoped(process.argv[2] || path.join(root, '.github/character-3d-nonplayer-qa.json'),
      process.argv[3] || path.join(root, 'test-results/full-rollout'));
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
module.exports = { selectScripts, runScoped };
