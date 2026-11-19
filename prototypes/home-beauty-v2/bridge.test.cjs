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
