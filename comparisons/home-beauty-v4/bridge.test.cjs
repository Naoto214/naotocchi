const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
function fixture(search) {
  const location={origin:'http://localhost',search},parent={},handlers={};
  const window={location,parent,innerWidth:390,addEventListener(k,cb){handlers[k]=cb;}};
  const document={documentElement:{dataset:{},style:{setProperty(){}}}};
  vm.runInNewContext(fs.readFileSync(path.join(__dirname,'bridge.js'),'utf8'),{window,document,location,URLSearchParams,Event});
  return {api:window.HomeBeauty,send(data){handlers.message({origin:location.origin,source:parent,data});}};
}
test('frozen comparisons switch designs without shifting the effect clock',()=>{
  const {api,send}=fixture('?variant=E3&clock=2.5&region=sea&foam=0&compareSplit=1&split=.3');
  assert.equal(api.settings.effects.foam,false);
  assert.equal(api.settings.compareSplit,true);
  assert.equal(api.settings.split,.3);
  assert.equal(api.sampleClock(12),2.5);
  send({type:'home-beauty-settings',settings:{variant:'D3',split:.6}});
  assert.equal(api.sampleClock(18),2.5);
  send({type:'home-beauty-clock',seconds:0,paused:false});
  assert.equal(api.sampleClock(19),0);
  assert.equal(api.sampleClock(20.5),1.5);
});
test('effect clock may pause and resume independently of the game clock',()=>{
  const {api,send}=fixture('?variant=E1');
  assert.equal(api.sampleClock(50),0);
  assert.equal(api.sampleClock(55),5);
  send({type:'home-beauty-clock',paused:true});
  assert.equal(api.sampleClock(90),5);
  send({type:'home-beauty-clock',paused:false});
  assert.equal(api.sampleClock(98),5);
  assert.equal(api.sampleClock(99),6);
});
