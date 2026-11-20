// Create a sibling trial from the verified V2 distribution. The original URLs
// and every file reached from them keep their previous content.
const fs = require('node:fs');
const path = require('node:path');
const {hashGame} = require('../home-cast-size-v1/build.cjs');
const {replaceOnce} = require('../home-cast-size-v1/rewrite.cjs');
const {replaceScript} = require('../home-cast-size-v2/build.cjs');

const referenceCommit = '7e0a8cd6a506142fbe65b9ca6fd4ff4f855d4e9a';
const referenceBundle = '41e3c1643927fda017d6dd16688129221bb80714a3bd89b86237a176e195b79c';
const shellFiles = ['index.html', 'style.css', 'controls.mjs', 'shell-model.mjs'];

function limitBridge(v2) {
  const start = '    input = {...input, preset:"custom", hero:120, partner:120, companions:105};';
  const end = "    if (typeof input.paused === 'boolean')";
  const first = v2.indexOf(start), last = v2.indexOf(end);
  if (first < 0 || last <= first) throw Error('Unexpected V2 size bridge');
  const code = replaceOnce(v2, v2.slice(first, last), `    const gain = input.extra;
    const valid = ['0', '5', '10', '15', '20'].includes(String(gain));
    const extra = valid ? Number(gain) : settings.extra || 0;
    const size = baseline => baseline * (100 + extra) / 100;
    const next = {...settings, preset: 'custom', extra,
      hero: size(120), partner: size(120), companions: size(105)};
`);
  return replaceOnce(code, "apply({preset: query.get('castPreset') || 'current',", "apply({extra: query.get('extra'), preset: 'custom',");
}

function writeGame(game, original) {
  function read(name) { return fs.readFileSync(path.join(original, name), 'utf8'); }
  function add(name, source) {
    if (fs.existsSync(path.join(original, name))) throw Error('V3 would overwrite V2: ' + name);
    fs.writeFileSync(path.join(game, name), source);
  }
  add('cast-limit.js', limitBridge(read('cast-final.js')));
  const v2 = '   nav=win.HomeOpeningSeats.withOpeningSeats(nav,spec,win.innerWidth,win.innerHeight);';
  add('home-production-world-limit.mjs', replaceOnce(read('home-production-world-v2.mjs'), v2,
    v2 + '\n   nav=win.HomeLimitSeats.withOpeningSeats(nav,spec,win.innerWidth,win.innerHeight);'));
  add('home-production-diorama-limit.js', replaceOnce(read('home-production-diorama-v2.js'),
    "import('./home-production-world-v2.mjs?", "import('./home-production-world-limit.mjs?"));
  let html = replaceScript(read('final.html'), 'home-production-diorama-v2.js', 'home-production-diorama-limit.js');
  html = replaceOnce(html, '<script src="cast-final.js"></script>',
    '<script src="limit-seating.js"></script><script src="cast-limit.js"></script>');
  add('limit.html', html);
}

function contains(parent, target) { return parent === target || target.startsWith(parent + path.sep); }

function build(destination, baseline) {
  const out = path.resolve(destination), source = fs.realpathSync(baseline);
  const repo = path.resolve(__dirname, '../..');
  if ([source, repo].some(root => contains(root, out) || contains(out, root)) ||
      (fs.existsSync(out) && fs.realpathSync(out) !== out)) throw Error('Use a separate trial output directory');
  if (fs.existsSync(out) && fs.readdirSync(out).length && !fs.existsSync(path.join(out, 'game/limit.html')))
    throw Error('Destination must be empty or an earlier size-limit trial');
  if (hashGame(source) !== referenceBundle) throw Error('Expected the exact V2 distribution from ' + referenceCommit);
  fs.cpSync(source, out, {recursive: true, mode: fs.constants.COPYFILE_FICLONE});
  const game = path.join(out, 'game');
  writeGame(game, path.join(source, 'game'));
  fs.copyFileSync(path.join(__dirname, 'seating.js'), path.join(game, 'limit-seating.js'));
  const shell = path.join(out, 'v3');
  fs.mkdirSync(shell, {recursive: true});
  for (const name of shellFiles) fs.copyFileSync(path.join(__dirname, name), path.join(shell, name));
}

if (require.main === module) {
  const [dest, flag, source] = process.argv.slice(2);
  if (!dest || flag !== '--baseline' || !source) throw Error('Usage: node build.cjs DEST --baseline V2_DIST');
  build(dest, source);
}
module.exports = {build, limitBridge, writeGame, referenceCommit, referenceBundle};
