const assert = require('node:assert/strict');
const {test} = require('node:test');
const fs = require('node:fs');

test('a home cast stays in view during its larger hop and sway and leaves the floor clear', () => {
  const {layoutHomeCast} = require('../cast-layout.js');
  const {motionRadiusFor} = require('../cast-motion.js');
  const master = new Function(fs.readFileSync('character-world-master.v1.js','utf8')+';return NAOTOCCHI_CHARACTER_WORLD_MASTER_V1')();
  const friends = [...master.companions.normal,...master.companions.rare].map(c=>c.asset);
  for (const width of [270,294,338,384]) for (const height of [132,156,200,270,320]) {
    for (const count of [0,6,18,26]) for (const known of [false,true]) {
      const radius=motionRadiusFor(count);
      const r=layoutHomeCast({width,height,mainAsset:known?'assets/characters/sakura/04.png':null,
        hasPartner:true,partnerAsset:known?'assets/characters/partners/forest_bear.png':null,hasAccessory:true,
        companions:Array.from({length:count},(_,i)=>known?friends[i]:null),motionRadius:radius});
      assert.equal(r.height,height,'the response and floor fit inside the available stage');
      assert.equal(r.companions.length,count);
      for (const f of [r.main,r.partner,r.accessory,...r.hearts,...r.companions]) {
        assert.ok(f.x-radius-6>=-.001 && f.x+f.w+radius+6<=width+.001,'full frame throughout the wider sway');
        assert.ok(f.y-radius-1-16>=-.001,'full frame at the highest shared hop');
        assert.ok(f.y+f.h+radius<=height-20+.001,'the cast never enters the poop floor');
      }
    }
  }
});

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

test('independent reactions retain full frames and four-pixel friend gaps throughout the sway', () => {
  const {layoutCast} = require('../cast-layout.js');
  const master = new Function(fs.readFileSync('character-world-master.v1.js','utf8')+';return NAOTOCCHI_CHARACTER_WORLD_MASTER_V1')();
  const friends=[...master.companions.normal,...master.companions.rare].map(c=>c.asset);
  for (const width of [270,294,314,334,354,384]) for (const count of [0,6,18,26,28]) {
    const radius=count>18?1:3;
    const r=layoutCast({width,mainAsset:null,hasPartner:true,partnerAsset:null,hasAccessory:true,
      companions:Array.from({length:count},(_,i)=>friends[i] || null),motionRadius:radius});
    const core=[r.main,r.partner,r.accessory];
    for (const f of [...core,...r.companions]) {
      assert.ok(f.x-radius-4>=0 && f.x+f.w+radius+4<=width,`full horizontal frame ${width}/${count}`);
      assert.ok(f.y-radius-1>=-1e-6 && f.y+f.h+radius+1<=r.height+1e-6,`full vertical frame ${width}/${count}`);
    }
    const separated=(a,b,gap)=>a.x+a.w+gap<=b.x+.001 || b.x+b.w+gap<=a.x+.001 || a.y+a.h+gap<=b.y+.001 || b.y+b.h+gap<=a.y+.001;
    for(let i=0;i<core.length;i++) for(let j=0;j<i;j++) assert.ok(separated(core[i],core[j],2+2*radius),'core reserves two reaction envelopes');
    r.companionBodies.forEach((a,i)=>{
      for(const b of [...core,...r.companionBodies.slice(0,i)]) assert.ok(separated(a,b,4+2*radius),`friend gap ${width}/${count}/${i}`);
    });
  }
});
