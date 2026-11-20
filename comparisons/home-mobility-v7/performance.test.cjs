const test=require('node:test');
const assert=require('node:assert/strict');
const {readNative}=require('../home-finish-v5/native-source.cjs');
const vm=require('node:vm');
const {patchRuntime}=require('./mobility-perf.cjs');

// Use the release touch file's actual coordinate reader, including stage and
// resident branches and the camera object currently owned by that controller.
function reader(source) {
  const start=source.indexOf(' function presentationRect(e){');
  const end=source.indexOf('\n root.NaotocchiHomeViewport=', start);
  assert.ok(start>=0 && end>start);
  return vm.runInNewContext(`(presentation,e)=>{function unscalePoint(p){return {x:p.x/2,y:p.y/2};}${source.slice(start,end)};return presentationRect(e);}`);
}

test('only the unused world-host layout read is removed, including successive cameras', ()=>{
  const source=readNative('home-production-touch.js');
  const before=reader(source),after=reader(patchRuntime('home-production-touch-finish.js',source));
  const rect={left:5,top:10,right:65,bottom:90,width:60,height:80};
  for(const p of [null,{scale:2},{world:{...rect,top:13},scaleX:1.5,scaleY:2},{world:{...rect,top:29},scaleX:3,scaleY:3}]){
    for(const [world,related] of [[true,true],[false,true],[false,false]]){
      let reads=0; const elem={matches:()=>world,closest:()=>related,getBoundingClientRect(){reads++;return rect;}};
      const expected=before(p,elem);assert.equal(reads,1);reads=0;
      const actual=after(p,elem);assert.equal(JSON.stringify(actual),JSON.stringify(expected));
      assert.equal(reads,p?.world&&world?0:1);
      if(p?.world&&world)assert.equal(actual,p.world);
    }
  }
});
