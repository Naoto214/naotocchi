import test from 'node:test';
import assert from 'node:assert/strict';
import model from '../../../home-production-model.js';
import {cases,replay} from './replay.mjs';

test('a native release around a painted corner finishes within 2.5 screen pixels',()=>{
  const drag=replay(model.createModel,cases.corner);
  assert.ok(drag.accepted);
  assert.equal(drag.terrain+drag.contact,0);
  assert.ok(Math.hypot(drag.feet[0][0]-61,drag.feet[0][1]-47.8)<=2.5);
  assert.deepEqual(replay(model.createModel,cases.corner,false).feet,[[52,52]]);
});

test('a bounded refinement preserves the 16px partial and the existing retry when a peer leaves',()=>{
  for(const [name,expected] of Object.entries({partial16:[[48,36]],island:[[40,36]],deadEnd:[[40,36],[60,36]],movingPeer:[[52,36],[95.7,36],[120,36]]})){
    const result=replay(model.createModel,cases[name]);
    assert.deepEqual(result.feet,expected,name);
    assert.equal(result.terrain+result.contact,0,name);
  }
});
