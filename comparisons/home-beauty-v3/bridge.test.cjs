const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
test('fixture speed, count and normalized settings',()=>{
 const window={location:{search:'?region=sea&count=28&speed=0.25',origin:'http://localhost'},parent:{},addEventListener(){}};
 const document={documentElement:{dataset:{},style:{setProperty(){}}}};
 const context={window,document,URLSearchParams,Event,location:window.location};
 vm.runInNewContext(fs.readFileSync(path.join(__dirname,'bridge.js'),'utf8'),context);
 const api=window.HomeBeauty;
 assert.equal(api.settings.count,28);
 assert.equal(api.settings.speed,.25);
 assert.equal(api.settings.region,'sea');
 assert.equal(api.settings.variant,'B');
 assert.equal(api.settings.effects.contact,true);
});

test('D selection preserves a real zero intensity and individual motion toggle on replay',()=>{
 const location={origin:'http://localhost',search:'?variant=D3&strength=0&motion=0&weather=rain'};
 const root={dataset:{},style:{setProperty(){}}};
 const listeners={};
 const window={location,parent:{},addEventListener(type,cb){listeners[type]=cb;}};
 vm.runInNewContext(fs.readFileSync(path.join(__dirname,'bridge.js'),'utf8'),{window,location,URLSearchParams,Event,document:{documentElement:root}});
 assert.equal(window.HomeBeauty.settings.variant,'D3');
 assert.equal(window.HomeBeauty.settings.strength,0);
 assert.equal(root.dataset.beautyContact,'false');
 assert.equal(root.dataset.beautyLight,'false');
 assert.equal(window.HomeBeauty.settings.effects.contact,true);
 assert.equal(window.HomeBeauty.settings.effects.motion,false);
 listeners.message({origin:location.origin,source:window.parent,data:{type:'home-beauty-settings',settings:{variant:'D1',strength:.45,effects:{particles:false}}}});
 assert.equal(window.HomeBeauty.settings.variant,'D1');
 assert.equal(window.HomeBeauty.settings.strength,.45);
 assert.equal(window.HomeBeauty.settings.effects.motion,false);
 assert.equal(window.HomeBeauty.settings.effects.particles,false);
 assert.equal(root.dataset.beautyMotion,'false');
});
