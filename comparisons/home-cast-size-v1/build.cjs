// Build from a verified #569 game bundle or from a complete checkout pinned to
// #569. The source, movement model, and original private comparison stay intact.
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {createHash} = require('node:crypto');
const {execFileSync} = require('node:child_process');
const {adaptController} = require('./controller-adapter.cjs');
const {replaceOnce} = require('./rewrite.cjs');

const referenceCommit = '28628cf336a8ed92efe4e9e197ca03298b798a1e';
const referenceHashes = {
  private: 'ce83090978b4ba00c6efd68f9e73f206ce381c7f9c53a4acece2dcd3327dd8e0',
  full: '251ae4a1cfed7b4e3d668bbe35a91872b7b8dda9464d8738a761e61f47ecee0a'
};
const saveKey = 'naotocchi-cast-size-v1-fixture';
const priorKey = 'naotocchi-beauty-v7-fixture';

function hashGame(root) {
  const files = [];
  function visit(dir) {
    for (const entry of fs.readdirSync(dir, {withFileTypes: true})) {
      const name = path.join(dir, entry.name);
      if (entry.isDirectory()) visit(name);
      else if (entry.isFile()) files.push(path.relative(root, name).split(path.sep).join('/'));
      else throw new Error('Unexpected entry in pinned game: ' + name);
    }
  }
  visit(root);
  files.sort((a, b) => Buffer.compare(Buffer.from(a), Buffer.from(b)));
  const hash = createHash('sha256');
  for (const name of files) {
    const content = fs.readFileSync(path.join(root, name));
    hash.update(name + '\0').update(createHash('sha256').update(content).digest());
  }
  return hash.digest('hex');
}

function packPinnedCards(game) {
  const directory = path.join(game, 'prototypes/card-game');
  const catalog = path.join(directory, 'ui-art.mjs');
  const prefix = 'art-delivery/large/';
  const remote = 'https://raw.githubusercontent.com/Naoto214/naotocchi/38b4e9d0c8ed4cacdfc1cc6c072a7a9e62e5c053/prototypes/card-game/';
  const source = fs.readFileSync(catalog, 'utf8');
  const images = fs.readdirSync(path.join(directory, prefix)).filter(name => name.endsWith('.webp'));
  if (images.length !== 452 || !images.every(name => source.includes('"' + prefix + name + '"')))
    throw new Error('Unexpected card image manifest in #569');
  fs.writeFileSync(catalog, source.replaceAll('"' + prefix, '"' + remote + prefix));
  for (const name of images) fs.unlinkSync(path.join(directory, prefix, name));
}

function adaptGame(game) {
  const read = file => fs.readFileSync(path.join(game, file), 'utf8');
  const write = (file, value) => fs.writeFileSync(path.join(game, file), value);
  const html = replaceOnce(read('index.html'), '<script src="beauty/bridge.js"></script>',
    '<script src="beauty/bridge.js"></script><script src="cast-trial.js"></script>');
  write('index.html', html.replaceAll(priorKey, saveKey));
  write('script.js', read('script.js').replaceAll(priorKey, saveKey));
  fs.copyFileSync(path.join(__dirname, 'cast-trial.js'), path.join(game, 'cast-trial.js'));

  let bridge = read('beauty/bridge.js');
  bridge = replaceOnce(bridge, '[1,4,28].includes(Number(s.count)) ? Number(s.count) : 1;',
    '[1,4,10,20,28].includes(Number(s.count)) ? Number(s.count) : 28;');
  bridge = replaceOnce(bridge, '  apply(values);', `  values.variant='B';
  values.compareSplit=false;
  values.region=values.region||'river_lake';
  api.setCastTime=time=>apply({time});
  api.setCastClockPaused=paused=>setClock({paused});
  apply(values);`);
  write('beauty/bridge.js', bridge);

  let fixture = read('beauty/fixture.js').replaceAll(priorKey, saveKey);
  fixture = replaceOnce(fixture, '  const memory = new Map();', "  for (const storageName of ['localStorage','sessionStorage']) {\n  const memory = new Map();");
  fixture = replaceOnce(fixture, "Object.defineProperty(window,'localStorage',", 'Object.defineProperty(window,storageName,');
  fixture = replaceOnce(fixture, '  let seed=214;', '  }\n  let seed=214;');
  fixture = replaceOnce(fixture, '  const roster=', `  if (new URLSearchParams(location.search).get('gear') !== 'none') {
    state.lifetime.ownedShopItems=['ribbon'];
    state.lifetime.equippedItemId='ribbon';
  }
  const roster=`);
  write('beauty/fixture.js', fixture);
  write('home-production-diorama.js', adaptController(read('home-production-diorama.js')));
}

function inside(parent, child) {
  return parent === child || child.startsWith(parent + path.sep);
}

function build(destination, sourceType, sourcePath, gameOnly = false) {
  const out = path.resolve(destination);
  const source = fs.realpathSync(sourcePath);
  const repo = path.resolve(__dirname, '../..');
  if (inside(repo, out) || inside(source, out) || inside(out, source) ||
      (fs.existsSync(out) && fs.realpathSync(out) !== out))
    throw new Error('Use a separate output directory outside the source checkouts');
  if (fs.existsSync(out) && fs.readdirSync(out).length && !fs.existsSync(path.join(out, 'game/cast-trial.js')))
    throw new Error('Destination must be an empty directory or a previous cast trial build');
  let scratch;
  try {
    let sourceGame;
    if (sourceType === '--baseline') {
      sourceGame = path.join(source, 'game');
    } else if (sourceType === '--reference-checkout') {
      const actual = execFileSync('git', ['-C', source, 'rev-parse', 'HEAD'], {encoding: 'utf8'}).trim();
      if (actual !== referenceCommit) throw new Error('Expected checkout of #569 commit ' + referenceCommit);
      scratch = fs.mkdtempSync(path.join(os.tmpdir(), 'cast-reference-'));
      execFileSync(process.execPath, [path.join(source, 'comparisons/home-beauty-v7/build.cjs'), scratch, '--fresh'], {stdio: 'inherit'});
      sourceGame = path.join(scratch, 'game');
    } else throw new Error('Choose --reference-checkout or --baseline');

    const digest = hashGame(sourceGame);
    if (!Object.values(referenceHashes).includes(digest)) throw new Error('Input does not match pinned #569 game: ' + digest);
    const game = path.join(out, 'game');
    fs.mkdirSync(out, {recursive: true});
    fs.cpSync(sourceGame, game, {recursive: true, mode: fs.constants.COPYFILE_FICLONE});
    if (digest === referenceHashes.full) packPinnedCards(game);
    adaptGame(game);
    if (!gameOnly) for (const file of ['index.html', 'style.css', 'controls.mjs'])
      fs.copyFileSync(path.join(__dirname, file), path.join(out, file));
    console.log('Private cast comparison built at ' + out + ' using verified #569 ' + digest);
  } finally {
    if (scratch) fs.rmSync(scratch, {recursive: true, force: true});
  }
}

if (require.main === module) {
  const [out, type, input, option] = process.argv.slice(2);
  if (!out || !type || !input || (option && option !== '--game-only'))
    throw new Error('Usage: node build.cjs DEST (--reference-checkout CHECKOUT | --baseline DIST) [--game-only]');
  build(out, type, input, option === '--game-only');
}
module.exports = {adaptGame, build, hashGame, referenceCommit, referenceHashes};
