const assert = require('node:assert/strict');
const {test} = require('node:test');
const fs = require('node:fs');

test('whole cast fits with room for sway and four-pixel companion gaps', () => {
  assert.ok(fs.existsSync('cast-layout.js'), 'cast layout module must exist');
  const {layoutCast} = require('../cast-layout.js');
  const master = new Function(fs.readFileSync('character-world-master.v1.js','utf8')+';return NAOTOCCHI_CHARACTER_WORLD_MASTER_V1')();
  const friends = [...master.companions.normal,...master.companions.rare].map(c=>c.asset);
  for (const width of [270,294,314,334,354,384]) for (const count of [0,6,18,26,28]) {
    const assets = Array.from({length:count},(_,i)=>friends[i] || null);
    const result = layoutCast({width,mainAsset:'assets/characters/sakura/04.png',partnerAsset:'assets/characters/partners/forest_bear.png',hasPartner:true,hasAccessory:true,companions:assets});
    assert.equal(result.companions.length, count);
    assert.ok(result.main.w >= 100);
    assert.ok(result.size >= 24);
    for (const frame of [result.main,result.partner,result.accessory,...result.companions].filter(Boolean)) {
      assert.ok(frame.x >= 6-1e-6 && frame.x+frame.w <= width-6+1e-6, `frame clips horizontally ${width}/${count}`);
      assert.ok(frame.y >= 0 && frame.y+frame.h <= result.height+1e-6, `frame clips vertically ${width}/${count}`);
    }
    const bodies = result.companionBodies;
    for(let i=0;i<bodies.length;i++) for(let j=0;j<i;j++) {
      const a=bodies[i],b=bodies[j];
      assert.ok(a.x+a.w+3.99<=b.x || b.x+b.w+3.99<=a.x || a.y+a.h+3.99<=b.y || b.y+b.h+3.99<=a.y, `friends overlap ${width}/${count}/${i}/${j}`);
    }
  }
});

test('unknown or failed art retains complete frames without overlapping the core', () => {
  assert.ok(fs.existsSync('cast-layout.js'), 'cast layout module must exist');
  const {layoutCast} = require('../cast-layout.js');
  const r=layoutCast({width:294,mainAsset:null,hasPartner:true,partnerAsset:null,hasAccessory:true,companions:Array(26).fill(null)});
  const a=r.main;
  for(const b of [r.partner,r.accessory,...r.companions]) {
    assert.ok(a.x+a.w+1<=b.x || b.x+b.w+1<=a.x || a.y+a.h+1<=b.y || b.y+b.h+1<=a.y);
  }
});
