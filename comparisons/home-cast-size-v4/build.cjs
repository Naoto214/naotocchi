// The V4 trial adds an independent entry to the byte-verified V3 package.
const fs = require('node:fs');
const path = require('node:path');
const {hashGame} = require('../home-cast-size-v1/build.cjs');
const {replaceOnce} = require('../home-cast-size-v1/rewrite.cjs');
const {replaceScript} = require('../home-cast-size-v2/build.cjs');

const referenceCommit = 'a6e257fef32ea2f0664b8c9fbed761f60ab63cb0';
const referenceBundle = 'c98b1de105f27b97fe5c2fd0e9f83b5ce1621d248e0c315c45c59c299c9ecc2c';
const {createOpeningFit} = require('./startup-fit.cjs');
const shellFiles = ['index.html', 'style.css', 'controls.mjs', 'shell-model.mjs'];

function populationBridge(source) {
  const start = '    const gain = input.extra;';
  const end = "    if (typeof input.paused === 'boolean')";
  const first = source.indexOf(start), last = source.indexOf(end);
  if (first < 0 || last <= first) throw Error('Unexpected V3 policy bridge');
  let code = replaceOnce(source, source.slice(first, last), `    const sized = window.HomePopulationPolicy.evaluate({
      policy: input.policy ?? input.variant ?? settings.policy,
      curve: input.curve ?? settings.curve,
      count: window.HomeBeauty.settings.count,
      width: window.innerWidth
    });
    const next = {...settings, ...sized, preset: 'custom'};
`);
  const boot = "  apply({extra: query.get('extra'), preset: 'custom', ...Object.fromEntries(";
  const ready = "    paused: query.get('paused') === '1'});";
  const from = code.indexOf(boot), to = code.indexOf(ready);
  if (from < 0 || to <= from) throw Error('Unexpected V3 policy boot');
  code = replaceOnce(code, code.slice(from, to + ready.length), `  apply({policy: query.get('policy') ?? query.get('variant'), curve: query.get('curve'),
    paused: query.get('paused') === '1'});
  window.addEventListener('resize', () => {
    if (window.innerWidth !== settings.width) apply();
  });`);
  return code;
}

function writeGame(game, baseline, seating) {
  const read = name => fs.readFileSync(path.join(baseline, name), 'utf8');
  function add(name, contents) {
    if (fs.existsSync(path.join(baseline, name))) throw Error('V4 would overwrite ' + name);
    fs.writeFileSync(path.join(game, name), contents);
  }
  add('population-policy.js', fs.readFileSync(path.join(__dirname, 'policy.js')));
  add('population-seating.js', seating);
  // Only the disposable fixture selects residents. Subsequent settings messages
  // preserve the real roster created for this document.
  add('population-beauty.js', replaceOnce(read('beauty/bridge.js'),
    '[1,4,10,20,28].includes(Number(s.count)) ? Number(s.count) : 28',
    'api.settings?.count ?? window.HomePopulationPolicy.normalizeCount(s.count)'));
  add('cast-population.js', populationBridge(read('cast-limit.js')));
  add('home-production-world-population.mjs', replaceOnce(read('home-production-world-limit.mjs'),
    'nav=win.HomeLimitSeats.withOpeningSeats(', 'nav=win.HomePopulationSeats.withOpeningSeats('));
  let controller = replaceOnce(read('home-production-diorama-limit.js'),
    "import('./home-production-world-limit.mjs?", "import('./home-production-world-population.mjs?");
  // A fractional policy change can be smaller than V3's depth cache tolerance.
  // Include the unrounded trial factor in both painting cache keys.
  controller = replaceOnce(controller,
    'depthScale=(scene.navigation?.depthScale?.(a)||1)*env.HomeCastTrial.scale(a.kind)',
    'roleScale=env.HomeCastTrial.scale(a.kind),depthScale=(scene.navigation?.depthScale?.(a)||1)*roleScale');
  controller = replaceOnce(controller, 'bod,depthScale.toFixed(4),dx.toFixed(2)',
    'bod,roleScale,depthScale.toFixed(4),dx.toFixed(2)');
  controller = replaceOnce(controller, 'bod,depthScale.toFixed(4),cacheKey',
    'bod,roleScale,depthScale.toFixed(4),cacheKey');
  controller = replaceOnce(controller, "    let residentEnvelopeKey='';",
    "    const retainOpeningFit = (" + createOpeningFit.toString() + ")(() => { stage.dataset.populationFitRecoveries=String(Number(stage.dataset.populationFitRecoveries||0)+1); });\n    let residentEnvelopeKey='';");
  controller = replaceOnce(controller,
    'if(JSON.stringify(value)===JSON.stringify(stage.__homeResidentEnvelope))return;',
    "if(retainOpeningFit(stage.__homeResidentEnvelope,value,[scene.region,env.innerWidth,env.innerHeight,...rows.keys()].join('/'),env.NaotocchiHomeViewport?.residentPresentation?.()))return;");
  controller = replaceOnce(controller, "        const metrics=JSON.parse(stage.dataset.livingMetrics||'{}');",
    "        if([...rows.values()].some(row=>!row.shadow.isConnected||!row.shadow.style.left||!row.shadow.style.top||!(parseFloat(row.shadow.style.width)>0)))return null;\n        const metrics=JSON.parse(stage.dataset.livingMetrics||'{}');");
  add('home-production-diorama-population.js', controller);
  let html = replaceScript(read('limit.html'), 'home-production-diorama-limit.js', 'home-production-diorama-population.js');
  html = replaceOnce(html, '<script src="beauty/bridge.js"></script>',
    '<script src="population-policy.js"></script><script src="population-beauty.js"></script>');
  html = replaceScript(html, 'limit-seating.js', 'population-seating.js');
  add('population.html', replaceScript(html, 'cast-limit.js', 'cast-population.js'));
}

function contains(parent, child) {
  return parent === child || child.startsWith(parent + path.sep);
}

function build(destination, baseline) {
  const out = path.resolve(destination), source = fs.realpathSync(baseline);
  const repo = path.resolve(__dirname, '../..');
  if ([source, repo].some(root => contains(root, out) || contains(out, root)) ||
      (fs.existsSync(out) && fs.realpathSync(out) !== out)) throw Error('Use a separate trial output directory');
  if (fs.existsSync(out) && fs.readdirSync(out).length && !fs.existsSync(path.join(out, 'game/population.html')))
    throw Error('Destination must be empty or an earlier V4 trial');
  if (hashGame(source) !== referenceBundle) throw Error('Expected the exact V3 distribution from ' + referenceCommit);
  const seating = fs.readFileSync(path.join(__dirname, 'seating.js'));
  const shell = shellFiles.map(name => [name, fs.readFileSync(path.join(__dirname, name))]);
  fs.cpSync(source, out, {recursive: true, mode: fs.constants.COPYFILE_FICLONE});
  writeGame(path.join(out, 'game'), path.join(source, 'game'), seating);
  const dir = path.join(out, 'v4');
  fs.mkdirSync(dir, {recursive: true});
  for (const [name, contents] of shell) fs.writeFileSync(path.join(dir, name), contents);
}

if (require.main === module) {
  const [dest, flag, source] = process.argv.slice(2);
  if (!dest || flag !== '--baseline' || !source) throw Error('Usage: node build.cjs DEST --baseline V3_DIST');
  build(dest, source);
}
module.exports = {build, populationBridge, writeGame, referenceCommit, referenceBundle};
