// Compare the actual limit-trial navigation facade with the pinned V2 facade.
import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';

const [game, output] = process.argv.slice(2);
if (!game || !output) throw new Error('Usage: node verify_protection_navigation.mjs GAME OUT.json');
const load = name => import(pathToFileURL(resolve(game, name)));
const {ART_SCENES} = await load('home-production-manifest.mjs');
const {createRecoveredNavigation} = await load('home-recovered-navigation.mjs');
const {default: priorSeats} = await load('seating.js');
const {default: trialSeats} = await load('limit-seating.js');

let sameSeeds = 0, alternateSeeds = 0, equivalentMethods = 0, configurations = 0;
const methods = new Set();
const changedByGain = {5:0,10:0,15:0,20:0};
for (const [region, spec] of Object.entries(ART_SCENES)) {
  for (const [width, height] of [[320,516], [375,760], [390,792], [430,880]]) {
    const stage = {left:0, top:0, width, height};
    const native = createRecoveredNavigation(spec, {width,height}, stage, {stableGrid:true, expandCity:true});
    const v2 = priorSeats.withOpeningSeats(native, spec, width, height);
    for (const layout of ['fixed','optimized']) {
      for (const extra of [0,5,10,15,20]) {
        const hint = region + '/' + width + '/' + layout + '/' + extra;
        const trial = trialSeats.withOpeningSeats(v2, spec, width, height, '?extra=' + extra + '&layout=' + layout);
        const fixed = layout === 'fixed' || extra === 0;
        if (fixed) assert.strictEqual(trial, v2, hint);
        for (const [name, fn] of Object.entries(v2)) {
          if (name === 'initialPoint') continue;
          assert.strictEqual(trial[name], fn, hint + '/' + name);
          if (typeof fn === 'function') {
            methods.add(name);
            equivalentMethods++;
          }
        }
        configurations++;
        for (const count of [1,4,10,20,28]) {
          for (let i=0; i<count; i++) {
            const point = trial.initialPoint(i, count);
            assert.ok(Number.isFinite(point.x) && Number.isFinite(point.y), hint);
            assert.deepEqual(trial.initialPoint(i, count), point, 'deterministic ' + hint);
            if (fixed) {
              assert.deepEqual(point, v2.initialPoint(i, count), hint);
              sameSeeds++;
            } else {
              alternateSeeds++;
              const previous = v2.initialPoint(i, count);
              if (point.x !== previous.x || point.y !== previous.y) {
                assert.ok(trial.valid(point), 'alternate hint outside native walkable ground: ' + hint);
                changedByGain[extra]++;
              }
            }
          }
        }
      }
    }
  }
}
const result = {regions:Object.keys(ART_SCENES).length, phoneWidths:4, configurations,
  exactV2OpeningsAtAllFixedGainsOrZero:sameSeeds, deterministicOptimizedOpenings:alternateSeeds,
  changedHintsPassingNativeTerrainCheck:changedByGain,
  identicalNativeFunctionReferences:equivalentMethods, nativeFunctions:[...methods].sort()};
await writeFile(output, JSON.stringify(result,null,2) + '\n');
console.log(result);
