'use strict';
const fs = require('node:fs');
const path = require('node:path');
const {hashFiles, listFiles} = require('../home-finish-v5/build.cjs');
const {digest, replaceExact} = require('../home-finish-v5/native-hooks.cjs');
const {patchFoot, patchFootDiagnostics} = require('./foot.cjs');
const {patchGoals, patchGoalTelemetry} = require('./goals.cjs');
const {patchAfterRefusal} = require('./goal-after-refusal.cjs');
const {modelReplay, rendererReplay} = require('./foot-replay.cjs');
const {patchCareGame} = require('./foot-care.cjs');
const {patchFastCareModel} = require('./foot-care-fast.cjs');

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

  const refusalObserver = 'mobility-v11-refusal-observer.js';
  add('game/' + refusalObserver, local('refusal-observer.js'));

  for (const arm of ['v9','v9-seats','v10','v10-reference','v11-foot','v11-foot-reference','v11','v11-reference','v11-after','v11-after-reference']) {
    const candidate = arm.startsWith('v11');
    const sourceArm = candidate ? (arm.endsWith('-reference') ? 'v10-reference' : 'v10') : arm;
    const oldModel = modelFile(sourceArm);
    let model = game(oldModel);
    const afterRefusal = arm.startsWith('v11-after');
    if (candidate) {
      if (afterRefusal) model = patchAfterRefusal(model,{policy:'ray'});
      else if (!arm.startsWith('v11-foot')) model = patchGoals(model);
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
      [goalObserver,...(afterRefusal ? [refusalObserver] : []),newTelemetry]
        .map(name=>sourceTag(name, files.get('game/' + name))).join('\n'));
    add('game/mobility-v11-compare-' + arm + '.html', owner);
  }

  const replayModel = 'home-production-model-mobility-v11-recording.js';
  add('game/' + replayModel, modelReplay(game(modelFile('v10'))));
  for (const arm of ['v10','v11']) {
    const recorder = 'home-production-diorama-mobility-v11-recording-' + arm + '.js';
    const renderer = arm === 'v10' ? game(oldPainter) : files.get('game/' + newPainter);
    add('game/' + recorder, rendererReplay(renderer));
    let page = replaceGame(game('mobility-v10.html'), modelFile('v10'), replayModel);
    page = replaceGame(page, oldPainter, recorder);
    add('game/mobility-v11-replay-' + arm + '.html', page);
  }
  const careModel = modelFile('v11-growth');
  const careGame = 'script-v2-mobility-v11-growth.js';
  const oldGame = 'script-v2-mobility-v7.js';
  add('game/' + careModel, patchFastCareModel(files.get('game/' + modelFile('v11-foot'))));
  add('game/' + careGame, patchCareGame(game(oldGame)));
  let care = replaceGame(game('mobility-v10.html'), oldGame, careGame);
  care = replaceGame(care, oldPainter, newPainter);
  care = replaceGame(care, modelFile('v10'), careModel);
  add('game/mobility-v11-care.html', care);
  add('v11/recorded-panda.json', local('evidence/foot-recorded-panda.json'));
  add('v11/space-map.json', local('evidence/space-map.json'));
  for (const name of ['replay.html','replay.mjs','growth.html','growth.mjs','space.html','space-view.mjs']) add('v11/' + name, local(name));

  let html = read('v10/index.html').replace(/(data-arm="v|aria-label="V|>V)(8|9|10)(?=["の<])/g,
    (_, prefix, n) => prefix + (Number(n) + 1));
  html = replaceExact(html, '<label for="seed">',
    '<label for="variant">V11の改善範囲<select id="variant"><option value="full">足元＋探索前に散歩先を選び直す</option><option value="foot">足元の修正のみ</option><option value="after">足元＋経路が決まらなかったときだけ前方を探す</option></select></label>\n      <label for="seed">');
  html = replaceExact(html, '<p><a href="./episode.html">', [
    '<p><a href="./replay.html">通知前後のパンダの足元を再現する</a></p>',
    '<p><a href="./growth.html">成長時の足元を比べる</a></p>',
    '<p><a href="./space.html">森で28体が歩ける方向を見る</a></p>',
    '<p><a href="https://naotocchi-mobility-v8-evidence.kerzion214.chatgpt.site/v11/forest.html">28体それぞれの10分間の歩行を比べる</a></p>',
    '<p><a href="../v10/episode.html">',
  ].join('\n'));
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
  const existing = fs.existsSync(out) ? listFiles(out) : [];
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
