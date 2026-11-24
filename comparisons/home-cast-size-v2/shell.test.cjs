const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const {approvedRoles,replaceScript}=require('./build.cjs');

test('the final frame applies the approved size once, including direct links and parent changes',()=>{
  const code=fs.readFileSync(path.join(__dirname,'../home-cast-size-v1/cast-trial.js'),'utf8');
  const handlers={},observed=[];
  const location={search:'?castPreset=A&hero=149&partner=97&companions=80',origin:'https://example.test'};
  const document={
    createElement:()=>({}),head:{appendChild(){}},documentElement:{toggleAttribute(){}},
  };
  const window={HomeBeauty:{settings:{time:'day'},setCastClockPaused(){},setCastTime(time){observed.push(time);}},
    parent:{postMessage(){}},addEventListener:(name,cb)=>{handlers[name]=cb;}};
  vm.runInNewContext(approvedRoles(code),{window,document,location,URLSearchParams});
  const api=window.HomeCastTrial;
  const scales=()=>['pet','partner','companion'].map(key=>api.scale(key));
  assert.deepEqual(scales(),[1.2,1.2,1.05]);
  handlers.message({origin:location.origin,source:window.parent,data:{type:'home-cast-settings',settings:{preset:'current',time:'night',paused:true,hero:149}}});
  assert.deepEqual(scales(),[1.2,1.2,1.05]);
  assert.deepEqual(observed,['night']);
  assert.equal(api.settings.paused,true);
});

test('all initial modes use the same region, count and environment with an independent final entry',async()=>{
  const {readScene,gameURL,regions,times,counts}=await import('./shell-model.mjs');
  const base='https://example.test/';
  for(const [region] of regions)for(const [time] of times)for(const count of counts){
    const controls=new URLSearchParams({region,time,count,paused:'1'});
    for(const [mode,powers] of [['current',[100,100,100]],['adopted',[120,120,105]],['final',[120,120,105]]]){
      controls.set('mode',mode);
      const url=gameURL(readScene(controls),base);
      assert.equal(url.pathname,mode==='final'?'/game/final.html':'/game/index.html');
      assert.deepEqual(['region','time','count','paused','variant','compareSplit'].map(k=>url.searchParams.get(k)),[region,time,String(count),'1','B','0']);
      assert.deepEqual(['hero','partner','companions'].map(k=>Number(url.searchParams.get(k))),powers);
    }
  }
});

test('legacy trial and custom links round-trip to the V1 archive; a new entry defaults to final',async()=>{
  const {readScene,isArchivedLink,median}=await import('./shell-model.mjs');
  for(const v of ['castPreset=A','preset=B','hero=120&partner=120&companions=105']){
    assert.equal(isArchivedLink(new URLSearchParams(v)),true);
    assert.equal(isArchivedLink(new URLSearchParams(v+'&mode=final')),false);
  }
  for (const region of ['forest','city','home']) {
    assert.equal(isArchivedLink(new URLSearchParams({region,count:28,paused:1})),true);
    assert.equal(isArchivedLink(new URLSearchParams({region,count:28,paused:1,mode:'final'})),false);
    assert.equal(isArchivedLink(new URLSearchParams({region,count:28,paused:1,time:'day'})),false);
  }
  assert.equal(readScene(new URLSearchParams()).mode,'final');
  assert.equal(readScene(new URLSearchParams('mode=constructor&count=27')).count,28);
  assert.deepEqual([median([]),median([24]),median([30,18,20]),median([20,18,23,30])],[null,24,20,21.5]);
});

test('retargets the actual script tag without dropping the original version query',()=>{
  assert.equal(replaceScript('<script src="script.js?v=abc"></script>','script.js','script-v2.js'),
    '<script src="script-v2.js?v=abc"></script>');
  assert.throws(()=>replaceScript('','script.js','script-v2.js'));
});
