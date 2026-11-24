// Check identity of runtime navigation methods with the real terrain in each region.
import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';

const [dir, output] = process.argv.slice(2);
if (!dir || !output) throw Error('Usage: node verify_protection_navigation.mjs DIST/GAME OUT.json');
const moduleAt = name => import(pathToFileURL(path.resolve(dir,name)));
const {default:seating}=await moduleAt('seating.js');
const {ART_SCENES}=await moduleAt('home-production-manifest.mjs');
const {createRecoveredNavigation}=await moduleAt('home-recovered-navigation.mjs');
const {default:legacyHome}=await moduleAt('home-production-diorama.js');
const {default:finalHome}=await moduleAt('home-production-diorama-v2.js');

// An old caller can still pass its obsolete overview flag. All bodies must
// keep their native normal frames, including at the six-resident boundary.
const checkedHouseholds=[1,4,5,6,10,20,28];
let normalFrames=0;
for (const count of checkedHouseholds) {
  const args={width:320,height:516,heroPercent:110,hasPartner:count>1,
    mainAsset:'assets/characters/dog/06.png',partnerAsset:'assets/characters/partners/forest_bear.png',
    companions:Array(Math.max(0,count-2)).fill('assets/characters/companions/cat_friend.png')};
  const visibleFrames=layout=>[layout.main,layout.partner,...layout.companions].filter(Boolean);
  const normal=legacyHome.layoutTerrainCast(args);
  assert.deepEqual(finalHome.layoutTerrainCast({...args,overview:true}),normal);
  assert.deepEqual(finalHome.layoutTerrainCast({...args,overview:false}),normal);
  const regular=visibleFrames(normal);
  const compact=visibleFrames(legacyHome.layoutTerrainCast({...args,overview:true}));
  for (let i=0;i<count;i++) {
    for (const dimension of ['w','h']) {
      assert.ok(Math.abs(compact[i][dimension]/regular[i][dimension]-.84)<1e-7);
    }
    normalFrames++;
  }
}

const functions=new Set();
let nativeReferences=0, smallHouseholdSeeds=0, projections=0, inspected28Seeds=0;
let compactOriginals=0, tallerOriginals=0, landscapeOriginals=0;
const compactRegions=new Set(['forest','city','river_lake','home']);
for(const [region,spec] of Object.entries(ART_SCENES)) {
  for(const [width,height] of [[320,516],[375,760],[390,792],[430,880]]) {
    const stage={left:0,top:0,width,height};
    const native=createRecoveredNavigation(spec,{width,height},stage,{stableGrid:true,expandCity:true});
    const trial=seating.withOpeningSeats(native,spec,width,height);
    projections++;
    for(const [key,value] of Object.entries(native)) {
      if(key==='initialPoint')continue;
      assert.strictEqual(trial[key],value,region+' '+key);
      if(typeof value==='function')functions.add(key);
      nativeReferences++;
    }
    for(const count of [1,4,10,20]) {
      for(let i=0;i<count;i++) {
        assert.deepEqual(trial.initialPoint(i,count),native.initialPoint(i,count));
        smallHouseholdSeeds++;
      }
    }
    for(let i=0;i<28;i++) {
      const point=trial.initialPoint(i,28);
      assert.ok(Number.isFinite(point.x)&&Number.isFinite(point.y));
      assert.deepEqual(trial.initialPoint(i,28),point,'seed is deterministic');
      if (width===320 && !compactRegions.has(region)) {
        assert.deepEqual(point,native.initialPoint(i,28)); compactOriginals++;
      } else if (width>360 && i!==1) {
        assert.deepEqual(point,native.initialPoint(i,28)); tallerOriginals++;
      }
      inspected28Seeds++;
    }
  }
  const stage={left:0,top:0,width:844,height:390};
  const native=createRecoveredNavigation(spec,stage,stage,{stableGrid:false,expandCity:false});
  const trial=seating.withOpeningSeats(native,spec,stage.width,stage.height);
  for (let i=0;i<28;i++) {
    assert.deepEqual(trial.initialPoint(i,28),native.initialPoint(i,28));
    landscapeOriginals++;
  }
}
const result={regions:Object.keys(ART_SCENES).length,projections,nativeReferences,
  identicalNativeFunctions:[...functions].sort(),identicalOriginalSeedsBelow28:smallHouseholdSeeds,
  deterministicTrialsAt28:inspected28Seeds,
  nativeOpeningsAt28:{otherNineCompactRegions:compactOriginals,tallPortraitExceptPartner:tallerOriginals,landscape:landscapeOriginals},
  overviewRemoval:{checkedHouseholds,normalFrames,legacyFlagScale:.84,finalFlagScale:1}};
await writeFile(output,JSON.stringify(result,null,2)+'\n');
console.log(result);
