const assert = require('node:assert/strict');
const {test} = require('node:test');
const fs = require('node:fs');

test('home wings balance the painted gaps around the main body, including different PNG padding', () => {
  const {layoutHomeCast}=require('../cast-layout.js');
  const bounds=require('../cast-bounds.js');
  const master=new Function(fs.readFileSync('character-world-master.v1.js','utf8')+';return NAOTOCCHI_CHARACTER_WORLD_MASTER_V1')();
  const friends=[...master.companions.normal,...master.companions.rare].map(c=>c.asset);
  for(const [width,height] of [[270,152],[302,164],[358,260],[500,260]]) for(const count of [2,3,6,17,18,25,26,32]) {
    const mainAsset='assets/characters/cat/06.png',b=bounds[mainAsset].box;
    const r=layoutHomeCast({width,height,mainAsset,hasPartner:true,partnerAsset:master.partners[0].asset,hasAccessory:true,
      companions:Array.from({length:count},(_,i)=>friends[i%friends.length]),motionRadius:count>18?1:3,conversationHeight:44});
    const left=r.main.x+r.main.w*b[0]/128,right=r.main.x+r.main.w*b[2]/128;
    assert.ok(Math.abs((left+right)/2-width/2)<.01,'the painted main body stays at the field center');
    for(let i=0;i+1<count;i+=2) {
      const a=r.companionBodies[i],z=r.companionBodies[i+1];
      assert.ok(Math.abs((left-a.x-a.w)-(z.x-right))<.01,`paired visible gaps differ: ${width}/${height}/${count}/${i}`);
      assert.ok(Math.abs(a.y+a.h/2-z.y-z.h/2)<.01,'paired painted bodies share their vertical center');
    }
    const gap=4+2*(count>18?1:3),separate=(a,b)=>a.x+a.w+gap<=b.x+.01 || b.x+b.w+gap<=a.x+.01 || a.y+a.h+gap<=b.y+.01 || b.y+b.h+gap<=a.y+.01;
    const core=[r.main,r.partner,r.accessory,...r.hearts].filter(Boolean);
    r.companionBodies.forEach((a,i)=>{
      for(const z of [...core,...r.companionBodies.slice(0,i)])assert.ok(separate(a,z),'balanced wings retain the core and neighbor movement clearance');
    });
  }
});

test('every intermediate party size fits the minimum fixed home, with partner/item independently present', () => {
  const {layoutHomeCast}=require('../cast-layout.js');
  const master=new Function(fs.readFileSync('character-world-master.v1.js','utf8')+';return NAOTOCCHI_CHARACTER_WORLD_MASTER_V1')();
  const friends=['tanuki','cat_friend','hedgehog','many_tail_fox','sekizou','unicorn','punyu','monkey',
    ...master.companions.normal.map(c=>c.id),...master.companions.rare.map(c=>c.id)].map(id=>'assets/characters/companions/'+id+'.png');
  for(const width of [270,358]) for(let count=0;count<=32;count++) for(const hasPartner of [false,true]) for(const hasAccessory of [false,true]) {
    const r=layoutHomeCast({width,height:152,conversationHeight:44,mainAsset:'assets/characters/stagbeetle/06.png',
      hasPartner,partnerAsset:'assets/characters/partners/anglerfish.png',hasAccessory,
      companions:friends.slice(0,count),motionRadius:count>18?1:3});
    assert.equal(r.height,152,`fixed stage expanded for ${width}/${count}/${hasPartner}/${hasAccessory}`);
    assert.equal(r.companions.length,count);
    assert.equal(r.poops.length,4);
    if(count===8) {
      const a=r.companionBodies[0],b=r.companionBodies[2];
      assert.ok(Math.abs(a.x+a.w-b.x-b.w)>.5,'short fallback lanes retain an inward curve instead of a rectangular grid');
    }
  }
});

test('mixed failed and padded friend images keep every stress-count actor and poop slot in a fixed home', () => {
  const {layoutHomeCast}=require('../cast-layout.js');
  const ids=['hedgehog','tanuki','punyu','parrot','owl','otter','shiba','monkey','hamster','box','sekizou','unicorn','bat','chameleon','sheep','squirrel','panda','seal','many_tail_fox','penguin_friend',null,'clock','watcher',null,'rabbit_friend','snail','hedgehog','tanuki','punyu','parrot','owl','otter'];
  for(const width of [270,318,358]) {
    const r=layoutHomeCast({width,height:152,conversationHeight:44,mainAsset:'assets/characters/cicada/02.png',
      hasPartner:true,partnerAsset:'assets/characters/partners/robot_neighbor.png',hasAccessory:true,
      companions:ids.map(id=>id?'assets/characters/companions/'+id+'.png':null),motionRadius:1});
    assert.equal(r.height,152,'mixed transparency must not trigger an unbounded layout');
    assert.equal(r.companions.length,32);
    assert.equal(r.poops.length,4,'home rendering always has its four stable floor slots');
  }
});

test('poop follows the applied field scale rather than the companion count, with a readable floor', () => {
  const {layoutHomeCast}=require('../cast-layout.js');
  const master=new Function(fs.readFileSync('character-world-master.v1.js','utf8')+';return NAOTOCCHI_CHARACTER_WORLD_MASTER_V1')();
  const friends=[...master.companions.normal,...master.companions.rare].map(c=>c.asset);
  const layout=(width,height,count)=>layoutHomeCast({width,height,mainAsset:'assets/characters/dog/06.png',
    hasPartner:true,partnerAsset:master.partners[0].asset,hasAccessory:true,companions:friends.slice(0,count),
    motionRadius:count>18?1:3,conversationHeight:44});
  const roomy=layout(358,260,26),compact=layout(302,164,26);
  assert.ok(compact.main.w<roomy.main.w,'the same party really uses a smaller field scale');
  assert.ok(compact.poops[0].w<roomy.poops[0].w,'the smaller field also makes poop smaller');
  const solo=layoutHomeCast({width:358,height:260,mainAsset:'assets/characters/dog/06.png',companions:[],motionRadius:3,conversationHeight:44});
  assert.ok(solo.main.w>roomy.main.w,'the uncrowded pet really has a larger displayed frame');
  assert.ok(solo.poops[0].w>roomy.poops[0].w,'poop also grows with the larger normal pet instead of hitting the old small cap');
  assert.equal(solo.poops[0].w,21,'the large normal pet gets an ordinary readable poop size');
  const tall=layoutHomeCast({width:358,height:340,mainAsset:'assets/characters/dog/06.png',companions:[],motionRadius:3,conversationHeight:44});
  assert.equal(tall.poops[0].w,24,'the largest normal display retains a sensible upper size');
  assert.equal(compact.poops[0].w,8,'recognizable minimum prevents proportional shrinking into a dot');
  const one=layout(302,164,1),six=layout(302,164,6);
  assert.equal(one.main.w,six.main.w,'different party sizes can use the same field scale');
  assert.equal(one.poops[0].w,six.poops[0].w,'equal applied scales give equal poop sizes');
  assert.ok(compact.poops[1].x-compact.poops[0].x<roomy.poops[1].x-roomy.poops[0].x,'the pile spacing also shrinks');
});

test('failed companion images keep the balanced cast and the poop row inside the smallest home', () => {
  const {layoutHomeCast}=require('../cast-layout.js');
  const bounds=require('../cast-bounds.js');
  const body=(f,asset)=>{
    const b=bounds[asset]?.box || [0,0,128,128];
    return {x:f.x+f.w*b[0]/128,y:f.y+(f.artOffsetY||0)+f.h*b[1]/128,w:f.w*(b[2]-b[0])/128,h:f.h*(b[3]-b[1])/128};
  };
  const separate=(a,b,g=0)=>a.x+a.w+g<=b.x+.01 || b.x+b.w+g<=a.x+.01 || a.y+a.h+g<=b.y+.01 || b.y+b.h+g<=a.y+.01;
  for(const width of [270,302]) for(const count of [26,32]) {
    for(const mainAsset of ['assets/characters/dog/01.png',null]) for(const partnerAsset of ['assets/characters/partners/forest_bear.png',null]) {
      const r=layoutHomeCast({width,height:152,mainAsset,partnerAsset,hasPartner:true,hasAccessory:true,
        companions:Array(count).fill(null),motionRadius:1,conversationHeight:44});
      assert.equal(r.height,152,'missing images must not switch a fixed home to a taller stage');
      assert.equal(r.companions.length,count,'every companion keeps a visible frame');
      assert.ok(r.main.w>=32 && r.size>=12,'keep the existing minimum readable frame sizes');
      const main=body(r.main,mainAsset),actors=[main,body(r.partner,partnerAsset),r.accessory,...r.hearts,...r.companionBodies];
      assert.ok(Math.abs(r.conversation.x+r.conversation.w/2-main.x-main.w/2)<.01,'dialogue stays centered');
      assert.ok(Math.abs(r.conversation.y-main.y-main.h-6)<.01,'dialogue stays close');
      for(const f of [r.main,r.partner,r.accessory,...r.hearts,...r.companions]) {
        assert.ok(f.x-6>=-.01 && f.x+f.w+6<=width+.01,'every frame fits throughout the sway');
        assert.ok(f.y-18>=-.01 && f.y+f.h+1<=r.conversation.y+.01,'every frame fits throughout reactions');
      }
      r.companionBodies.forEach((a,i)=>{
        for(const b of r.companionBodies.slice(0,i)) assert.ok(separate(a,b,6),'companions retain the existing gap');
      });
      for(const p of r.poops) {
        assert.ok(separate(p,r.conversation,2) && p.y+p.h<=r.height-4+.01,'poop moves into safe floor space without growing the stage');
        for(const a of actors) for(const dx of [-5,5]) for(const dy of [0,-17]) assert.ok(separate({...a,x:a.x+dx,y:a.y+dy},p,2),'moving actors do not cross the fixed poop pocket');
      }
    }
  }
});

test('home conversation stays close and centered while the horizontal poop row avoids the completed cast', () => {
  const {layoutHomeCast} = require('../cast-layout.js');
  const bounds = require('../cast-bounds.js');
  const master = new Function(fs.readFileSync('character-world-master.v1.js','utf8')+';return NAOTOCCHI_CHARACTER_WORLD_MASTER_V1')();
  const friends = [...master.companions.normal,...master.companions.rare].map(c=>c.asset);
  const body=(f,asset)=>{
    const b=bounds[asset]?.box || [0,0,128,128];
    return {x:f.x+f.w*b[0]/128,y:f.y+(f.artOffsetY||0)+f.h*b[1]/128,
      w:f.w*(b[2]-b[0])/128,h:f.h*(b[3]-b[1])/128};
  };
  const separate=(a,b,gap=0)=>a.x+a.w+gap<=b.x+.01 || b.x+b.w+gap<=a.x+.01 || a.y+a.h+gap<=b.y+.01 || b.y+b.h+gap<=a.y+.01;
  for(const width of [270,302,358,500]) for(const height of [164,152,180,260]) {
    for(const count of [0,1,6,26,32]) for(const mainAsset of ['assets/characters/dog/01.png','assets/characters/sakura/04.png',null]) {
      const args={width,height,mainAsset,hasPartner:true,partnerAsset:'assets/characters/partners/forest_bear.png',hasAccessory:true,
        companions:Array.from({length:count},(_,i)=>friends[i%friends.length]),motionRadius:count>18?1:3,conversationHeight:44};
      const r=layoutHomeCast(args), main=body(r.main,mainAsset);
      assert.ok(r.height<=height+.01,'a crowded cast must not fall back to a taller stage');
      assert.ok(r.conversation,'a home reserves its shared conversation area');
      assert.ok(r.conversation.y-main.y-main.h>=6 && r.conversation.y-main.y-main.h<=8,'conversation stays close below the main body');
      assert.ok(Math.abs(r.conversation.x+r.conversation.w/2-main.x-main.w/2)<.01,'conversation is centered on the painted main body');
      const actors=[main,body(r.partner,args.partnerAsset),r.accessory,...r.hearts,...r.companionBodies];
      const floor=[r.conversation,...r.poops];
      for(const f of floor) {
        assert.ok(f.x>=0 && f.x+f.w<=width+.01 && f.y+f.h<=r.height+.01,'floor stays inside the stage');
        for(const a of actors) assert.ok(separate(a,f,args.motionRadius),JSON.stringify({width,height,count,mainAsset,actor:a,floor:f,layoutHeight:r.height}));
      }
      for(let i=0;i<floor.length;i++) for(let j=0;j<i;j++) assert.ok(separate(floor[i],floor[j],2),'dialogue and floor items never overlap');
      assert.equal(r.poops.length,4,'reserve the full pile even before poop appears');
      assert.ok(r.poops.every(p=>p.w>=8 && p.w<=24 && p.h===p.w),'poop stays recognizable without exceeding its normal size');
      assert.ok(Math.max(...r.poops.map(p=>p.x+p.w))-Math.min(...r.poops.map(p=>p.x))<=102,'the whole row stays compact');
      r.poops.forEach((p,i)=>{
        assert.equal(p.y,r.poops[0].y,'every poop stays on one horizontal baseline');
        if(i) assert.ok(Math.abs(p.x-r.poops[i-1].x-r.poops[i-1].w-2)<.01,'adjacent poops retain a compact 2px gap');
      });
      const first=r.poops[0],last=r.poops[3];
      const dx=Math.max(main.x-last.x-last.w,first.x-main.x-main.w,0);
      assert.ok(Math.hypot(dx,Math.max(0,first.y-main.y-main.h))<=72,'the row stays near the body or directly below its conversation');
      for(const p of r.poops) {
        assert.ok(p.x>=r.pocket.x+5-.01 && p.x+p.w<=r.pocket.x+r.pocket.w-5+.01 && p.y>=r.pocket.y-.01 && p.y+p.h<=r.pocket.y+r.pocket.h+.01,'the whole pile fits its reserved pocket with sway clearance');
        assert.ok(p.y+p.h>=main.y+main.h+4-.01,'poop stays at the feet or on the floor below');
        assert.ok(p.x>=12-.01 && p.x+p.w<=width-12+.01,'poop leaves room at either screen edge');
        for(const a of actors) for(const lift of [0,-17]) for(const sway of [-5,5]) assert.ok(separate({...a,x:a.x+sway,y:a.y+lift},p,args.motionRadius+1),'shared sway plus individual reactions do not cross the poop pocket');
      }
      assert.deepEqual(layoutHomeCast({...args,poopCount:0,speaker:'pet'}),layoutHomeCast({...args,poopCount:4,speaker:'companion'}),'speech and poop presence never reflow the cast');
    }
  }
});

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
