const fs = require('node:fs');
const path = require('node:path');
const {createHash} = require('node:crypto');
const {digest, replaceExact, composeController, composeWorld} = require('./native-hooks.cjs');
const {applyGroundPaint} = require('./ground-render.cjs');
const {readNative} = require('./native-source.cjs');

const referenceCommit = 'e07d2cc53eca36ff23e02142ab385d6001e0521b';
const referenceBundle = 'f9b927c65ea9f683dead97b906d569c2216f7334bad7e70e1ee915635c56f90a';
const defaultSourceRoot = path.resolve(__dirname, '../..');
const shellFiles = ['index.html', 'style.css', 'controls.mjs', 'shell-model.mjs'];

function listFiles(root) {
  const files = [];
  function walk(dir) {
    for (const entry of fs.readdirSync(dir, {withFileTypes:true})) {
      const file = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(file);
      else if (entry.isFile()) files.push(path.relative(root, file).split(path.sep).join('/'));
      else throw Error('Unexpected filesystem entry: ' + file);
    }
  }
  walk(root);
  return files.sort((a,b) => Buffer.compare(Buffer.from(a), Buffer.from(b)));
}

function hashFiles(root, names) {
  const hash = createHash('sha256');
  for (const name of names) {
    const body = fs.readFileSync(path.join(root, name));
    hash.update(name + '\0').update(createHash('sha256').update(body).digest());
  }
  return hash.digest('hex');
}

function prepare(baseline, sourceRoot) {
  const native = name => readNative(name, sourceRoot);
  const archived = name => fs.readFileSync(path.join(baseline, 'game', name), 'utf8');
  const local = name => fs.readFileSync(path.join(__dirname, name), 'utf8');
  const files = new Map();
  const add = (name, body) => {
    if (files.has(name) || fs.existsSync(path.join(baseline, name))) throw Error('Unexpected path collision: ' + name);
    files.set(name, body);
  };
  const gameFile = (name, body) => add('game/' + name, body);
  const ref = name => name + '?v=' + digest(files.get('game/' + name)).slice(0, 12);
  // Each new URL gets its own content hash, including dependencies' URLs.
  function updateURL(body, oldName, newName) {
    const pattern = oldName.replaceAll('.', '\\.');
    const matches = [...body.matchAll(new RegExp(pattern + '(?:\\?v=[0-9a-f]+)?(?=[\'"])', 'g'))];
    if (matches.length !== 1) throw Error('Expected one URL for ' + oldName);
    return replaceExact(body, matches[0][0], ref(newName));
  }

  const route = 'home-route-navigation', art = 'home-art-navigation';
  const visible = 'home-visible-ground-navigation', recovered = 'home-recovered-navigation';
  const finishModule = name => name + '-finish.mjs';
  for (const [name, dependencies] of [[route, []], [art, [route]], [visible, [route, art]], [recovered, [art]]]) {
    let body = native(name + '.mjs');
    for (const dep of dependencies) body = updateURL(body, dep + '.mjs', finishModule(dep));
    gameFile(finishModule(name), body);
  }

  let world = composeWorld(native('home-production-world.mjs'), archived('home-production-world-population.mjs'));
  for (const dep of [visible, recovered]) world = updateURL(world, dep + '.mjs', finishModule(dep));
  gameFile('home-production-world-finish.mjs', world);
  let controller = composeController(native('home-production-diorama.js'), archived('home-production-diorama-population.js'));
  controller = updateURL(controller, 'home-production-world-population.mjs', 'home-production-world-finish.mjs');
  gameFile('home-production-diorama-finish.js', applyGroundPaint(controller));

  gameFile('home-production-model-finish.js', native('home-production-model.js'));
  gameFile('home-production-touch-finish.js', native('home-production-touch.js'));
  gameFile('ground.js', local('ground.js'));
  gameFile('ground.css', local('ground.css'));

  // V4 provides the formula and the canonical seat table. A direct game URL
  // and messages from its parent must select the same adopted B and linear curve.
  const policy = replaceExact(archived('population-policy.js'),
    'const selected = input.policy ?? input.variant;', "const selected = 'B';");
  gameFile('finish-policy.js', replaceExact(policy,
    "const curve = input.curve === 'step' ? 'step' : 'linear';", "const curve = 'linear';"));
  gameFile('finish-seating.js', replaceExact(archived('population-seating.js'),
    "if (query.get('layout') !== 'optimized' || !selected.extra)", 'if (!selected.extra)'));
  gameFile('cast-finish.js', archived('cast-population.js'));

  let html = archived('population.html');
  for (const [from,to] of [
    ['population-policy.js','finish-policy.js'], ['population-seating.js','finish-seating.js'], ['cast-population.js','cast-finish.js'],
    ['home-production-model.js','home-production-model-finish.js'], ['home-production-touch.js','home-production-touch-finish.js'],
    ['home-production-diorama-population.js','home-production-diorama-finish.js'],
  ]) html = updateURL(html, from, to);
  html = replaceExact(html, '</head>', '<link rel="stylesheet" href="' + ref('ground.css') + '">\n<script defer src="' + ref('ground.js') + '"></script>\n</head>');
  gameFile('finish.html', html);
  for (const name of shellFiles) add('v5/' + name, local(name));
  return files;
}

function contains(parent, child) {
  return parent === child || child.startsWith(parent + path.sep);
}

function build(destination, baseline, sourceRoot = defaultSourceRoot) {
  const out = path.resolve(destination), base = fs.realpathSync(baseline), source = fs.realpathSync(sourceRoot);
  let ancestor = out;
  while (!fs.existsSync(ancestor)) ancestor = path.dirname(ancestor);
  if ([base,source,path.resolve(__dirname)].some(root => contains(root,out) || contains(out,root)) ||
      fs.realpathSync(ancestor) !== ancestor) {
    throw Error('Use a separate output directory outside the source trees');
  }
  const names = listFiles(base);
  if (names.length !== 3920 || hashFiles(base, names) !== referenceBundle)
    throw Error('Expected the exact 3920-file V4 distribution from ' + referenceCommit);
  const additions = prepare(base, source);
  const existing = fs.existsSync(out) ? listFiles(out) : [];
  if (existing.length) {
    const entries = new Set(existing);
    if (entries.size !== names.length + additions.size ||
        ![...additions.keys(), ...names].every(name => entries.has(name)) || hashFiles(out,names) !== referenceBundle)
      throw Error('Destination must be empty or contain exactly a previous V5 build');
  } else fs.cpSync(base, out, {recursive:true, mode:fs.constants.COPYFILE_FICLONE});
  for (const [name, value] of additions) {
    const file = path.join(out, name);
    fs.mkdirSync(path.dirname(file), {recursive:true});
    fs.writeFileSync(file, value);
  }
  return [...additions.keys()];
}

if (require.main === module) {
  const [out, flag, base, sourceFlag, source, ...rest] = process.argv.slice(2);
  if (!out || flag !== '--baseline' || !base || (sourceFlag && (sourceFlag !== '--source-root' || !source)) || rest.length)
    throw Error('Usage: node build.cjs DEST --baseline V4_DIST [--source-root NATIVE_SOURCE_DIR]');
  console.log('Built ' + build(out, base, source).length + ' V5 files at ' + path.resolve(out));
}
module.exports = {build, prepare, listFiles, hashFiles, referenceBundle, referenceCommit};
