import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
const source=readFileSync(new URL('./shell-model.mjs',import.meta.url),'utf8').replace(
  '../v10/shell-model.mjs',pathToFileURL(resolve(process.env.MOBILITY_V11_DIST,'v10/shell-model.mjs')).href);
const {readScene,gameURL,sceneQuery}=await import('data:text/javascript,'+encodeURIComponent(source));

test('real native comparisons preserve scene controls and keep free-wander policy at V11 foot-only',()=>{
  const base='https://owner.test/v12/';
  for (const [arm,source] of [['v10','v10'],['v11','v11-foot'],['v12','v12']]) {
    for (const count of [1,28]) {
      const spec=new URLSearchParams({arm,region:'forest',time:'night',count,seed:937,seats:'reference',paused:1});
      const scene=readScene(spec);
      const frame=gameURL(scene,base);
      const suffix=count===28?'-reference':'';
      const expected=arm==='v12'?'mobility-v12-compare-v12':'mobility-v11-compare-'+source;
      assert.equal(frame.pathname,'/game/'+expected+suffix+'.html');
      assert.equal(frame.searchParams.get('trialSeed'),'937');
      assert.equal(frame.searchParams.get('time'),'night');
      assert.equal(frame.searchParams.get('variant'),'B');
      assert.deepEqual(readScene(sceneQuery(scene)),scene);
    }
  }
  assert.equal(readScene(new URLSearchParams()).arm,'v12');
});
