'use strict';
const fs = require('node:fs');
const path = require('node:path');
const {digest, replaceExact} = require('../home-finish-v5/native-hooks.cjs');
const {patchFoot} = require('../home-mobility-v11/foot.cjs');
const {corridorModel, corridorPainter} = require('../home-mobility-v11/foot-corridor.cjs');
const {patchReflow, patchReflowPainter, patchReflowWorld} = require('../home-mobility-v12/reflow.cjs');

const modelName = 'home-production-model-mobility-v13-foot.js';
const painterName = 'home-production-diorama-mobility-v12.js';
const nativePage = 'mobility-v13-foot.html';

function addFootEntries({add, baseline}) {
  const read = name => fs.readFileSync(path.join(baseline, name), 'utf8');
  const game = name => read('game/' + name);
  const oldModel = 'home-production-model-mobility-v11-foot.js';
  const painterV11 = 'home-production-diorama-mobility-v11.js';
  const tag = (name, data) => '<script src="' + name + '?v=' + digest(data).slice(0, 12) + '"></script>';
  const original = game('mobility-v11-foot.html');
  const replaceScript = (html, from, name, source) =>
    replaceExact(html, tag(from, game(from)), tag(name, source));

  // Verify the inherited painter and its two worlds are solely the two foot changes.
  const worlds = {};
  for (const kind of ['finish', 'mobility']) {
    const name = 'home-production-world-v12-' + kind + '.mjs';
    const expected = patchReflowWorld(game('home-production-world-' + kind + '.mjs'));
    if (game(name) !== expected) throw Error('Unexpected native projection: ' + name);
    worlds[kind] = name + '?v=' + digest(expected).slice(0, 12);
  }
  const first = patchFoot(game('home-production-diorama-mobility-v10.js'));
  const painter = patchReflowPainter(first, worlds);
  if (first !== game(painterV11) || painter !== game(painterName)) throw Error('Unexpected native foot painter');

  const model = replaceExact(patchReflow(game(oldModel)), "bindModel('v11-foot',", "bindModel('v13-foot',");
  add('game/' + modelName, model);
  const direct = replaceScript(original, oldModel, modelName, model);
  add('game/' + nativePage, replaceScript(direct, painterV11, painterName, painter));

  // Only the historical replay gets restore/step controls. Each arm calls real model.sync.
  const diagnostic = fs.readFileSync(path.join(__dirname, '../home-mobility-v11/foot-geometry-diagnostic.js'), 'utf8');
  let replayModel = corridorModel(model, diagnostic);
  replayModel = replaceExact(replayModel,
    '    actors=record.actors.map(a=>structuredClone(a));',
    `    actors=record.actors.map(saved=>{
      const current=actor(saved.key);
      return {...structuredClone(saved),reflowArt:current.reflowArt,reflowGear:current.reflowGear,reflowInk:current.reflowInk};
    });`);
  replayModel = replaceExact(replayModel, `    const canHold=mode==='guard'&&holds&&now.otherLong.length>0;
    if(!canHold)sync(list,next);
    const after=canHold?now:geometryExitAudit(scene,actors);`, `    if(mode==='native')delete next.navigation.reflowGeometry;
    sync(list,next);
    const decision=globalThis.HomeV12Reflow.read(actors[0].key);
    const canHold=decision?.held===true;
    const after=geometryExitAudit(scene,actors);`);
  replayModel = replaceExact(replayModel, 'policy={mode,held:canHold', 'policy={mode,decision,held:canHold');
  const replayName = 'home-production-model-v13-foot-replay.js';
  const replayPaint = 'home-production-diorama-v12-corridor.js';
  if (corridorPainter(painter) !== game(replayPaint)) throw Error('Unexpected replay painter');
  add('game/' + replayName, replayModel);
  const replay = replaceScript(original, oldModel, replayName, replayModel);
  add('game/mobility-v13-foot-corridor.html', replaceScript(replay, painterV11, replayPaint, game(replayPaint)));
  add('v13/foot-corridor.html',replaceExact(read('v12/corridor.html'),'src="./corridor.mjs"','src="./foot-corridor.mjs"'));
  let controls = replaceExact(read('v12/corridor.mjs'),"'../game/mobility-v12-corridor-'+key+'.html'","'../game/mobility-v13-foot-corridor.html'");
  controls = replaceExact(controls,"fetch('./corridor-'+key+'.json')","fetch('../v12/corridor-'+key+'.json')");
  add('v13/foot-corridor.mjs', controls);
}
module.exports = {addFootEntries, modelName, painterName, nativePage};
