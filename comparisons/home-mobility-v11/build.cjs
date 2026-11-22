'use strict';
const fs = require('node:fs');
const path = require('node:path');
const {hashFiles, listFiles} = require('../home-finish-v5/build.cjs');
const {digest, replaceExact} = require('../home-finish-v5/native-hooks.cjs');
const {patchFoot, patchFootDiagnostics} = require('./foot.cjs');
const {patchGoals, patchGoalTelemetry} = require('./goals.cjs');

const originalCount = 4016;
const originalHash = 'd8eb7138a4932e0465897dcfc79b80580b8686c18125846e429e597e9bcad965';
const local = name => fs.readFileSync(path.join(__dirname, name), 'utf8');
const modelFile = arm => 'home-production-model-mobility-' + arm + '.js';
const painter = 'home-production-diorama-mobility-';
const sourceTag = (name, content) => '<script src="' + name + '?v=' + digest(content).slice(0, 12) + '"></script>';

function prepare(base) {
  const read = name => fs.readFileSync(path.join(base, name), 'utf8');
  const game = name => read('game/' + name);
  const files = new Map();
  function add(name, content) {
    if (files.has(name) || fs.existsSync(path.join(base, name))) throw Error('Output collides with ' + name);
    files.set(name, content);
  }
  function replaceGame(html, oldName, newName) {
    return replaceExact(html, sourceTag(oldName, game(oldName)),
      sourceTag(newName, files.get('game/' + newName)));
  }
  const oldPainter = painter + 'v10.js';
  const newPainter = painter + 'v11.js';
  add('game/' + newPainter, patchFoot(game(oldPainter)));
  const telemetry = 'telemetry-mobility-v10-owner.js';
  const newTelemetry = 'telemetry-mobility-v11-owner.js';
  add('game/' + newTelemetry, patchGoalTelemetry(game(telemetry)));
  const goalObserver = 'mobility-v11-goal-observer.js';
  add('game/' + goalObserver, local('goal-observer.js'));

  for (const arm of ['v9','v9-seats','v10','v10-reference','v11-foot','v11-foot-reference','v11','v11-reference']) {
    const candidate = arm.startsWith('v11');
    const sourceArm = candidate ? (arm.endsWith('-reference') ? 'v10-reference' : 'v10') : arm;
    const oldModel = modelFile(sourceArm);
    let model = game(oldModel);
    if (candidate) {
      if (!arm.startsWith('v11-foot')) model = patchGoals(model);
      model = replaceExact(model, "bindModel('" + sourceArm + "',", "bindModel('" + arm + "',");
      add('game/' + modelFile(arm), model);
      let direct = replaceGame(game('mobility-' + sourceArm + '.html'), oldModel, modelFile(arm));
      direct = replaceGame(direct, oldPainter, newPainter);
      add('game/mobility-' + arm + '.html', direct);
    }
    const recordedModel = modelFile('v11-owner-' + arm);
    add('game/' + recordedModel, patchFootDiagnostics(model));
    let owner = replaceGame(game('mobility-v10-compare-' + sourceArm + '.html'), oldModel, recordedModel);
    if (candidate) owner = replaceGame(owner, oldPainter, newPainter);
    owner = replaceExact(owner, sourceTag(telemetry, game(telemetry)),
      sourceTag(goalObserver, files.get('game/' + goalObserver)) + '\n' +
      sourceTag(newTelemetry, files.get('game/' + newTelemetry)));
    add('game/mobility-v11-compare-' + arm + '.html', owner);
  }

  let html = read('v10/index.html').replace(/(data-arm="v|aria-label="V|>V)(8|9|10)(?=["の<])/g,
    (_, prefix, n) => prefix + (Number(n) + 1));
  html = replaceExact(html, '<label for="seed">',
    '<label for="variant">V11の改善範囲<select id="variant"><option value="full">足元と目的地選択</option><option value="foot">足元の修正のみ</option></select></label>\n      <label for="seed">');
  html = replaceExact(html, 'href="./episode.html"', 'href="../v10/episode.html"');
  html = replaceExact(html, '<p id="recent"></p>',
    '<p id="recent"></p><p id="foot-events"></p><p id="wander-goal"></p>');
  add('v11/index.html', html);
  let controls = read('v10/controls.mjs');
  controls = replaceExact(controls, "  byId('seed').value = scene.seed;", [
    "  byId('seed').value = scene.seed;",
    "  byId('variant').value = scene.variant;",
    "  byId('variant').disabled = scene.arm !== 'v11';",
  ].join('\n'));
  controls = replaceExact(controls, "'time','seats','seed']", "'time','seats','seed','variant']");
  controls = replaceExact(controls, "byId('seed').addEventListener",
    "byId('variant').addEventListener('change', event => change({variant:event.target.value}));\nbyId('seed').addEventListener");
  add('v11/controls.mjs', controls);
  let diagnostics = "import {showChanges} from './changes.mjs';\n" + read('v10/diagnostics.mjs');
  diagnostics = replaceExact(diagnostics, '    if(!row)return;',
    '    if(!row)return;\n    showChanges(root, frame, row.key);');
  add('v11/diagnostics.mjs', diagnostics);
  for (const file of ['shell-model.mjs','changes.mjs']) add('v11/' + file, local(file));
  return files;
}

function build(destination, baseline) {
  const base = fs.realpathSync(baseline);
  const out = path.resolve(destination);
  const contains = (a,b) => a === b || b.startsWith(a + path.sep);
  let parent = out;
  while (!fs.existsSync(parent)) parent = path.dirname(parent);
  if (fs.realpathSync(parent) !== parent || [base,__dirname].some(p => contains(p,out) || contains(out,p))) {
    throw Error('Choose a separate output directory');
  }
  const originals = listFiles(base);
  if (originals.length !== originalCount || hashFiles(base,originals) !== originalHash) {
    throw Error('Expected the owner distribution from PR #580 at ed671e26');
  }
  const files = prepare(base);
  let existing = fs.existsSync(out) ? listFiles(out) : [];
  if (existing.length) {
    const allowed = new Set([...originals, ...files.keys()]);
    if (existing.some(n => !allowed.has(n)) || hashFiles(out,originals) !== originalHash) {
      throw Error('The existing output contains unrelated or modified content');
    }
  } else {
    fs.cpSync(base,out,{recursive:true,mode:fs.constants.COPYFILE_FICLONE});
  }
  for (const [name, content] of files) {
    const target = path.join(out,name);
    fs.mkdirSync(path.dirname(target),{recursive:true});
    fs.writeFileSync(target+'.tmp',content);
    fs.renameSync(target+'.tmp',target);
  }
  return files.size;
}

if (require.main === module) {
  const [out,flag,base,...extra] = process.argv.slice(2);
  if (!out || flag !== '--baseline' || !base || extra.length) throw Error('Usage: node build.cjs OUT --baseline V10_DIST');
  console.log('Added %d files to the %d-file V10 baseline.', build(out,base),originalCount);
}
module.exports = {build,prepare,originalCount,originalHash};
