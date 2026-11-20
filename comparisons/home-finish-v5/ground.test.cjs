const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const {applyGroundPaint}=require('./ground-render.cjs');

function fixture() {
  const document={body:{dataset:{}}};
  const window={addEventListener(){}};
  vm.runInNewContext(fs.readFileSync(path.join(__dirname,'ground.js'),'utf8'),
    {document,window,location:{search:'?ground=off'},URLSearchParams});
  return window.HomeFinishGround;
}

test('Photograph landmarks distinguish floors, trees, furniture, banks and exposed stones',()=>{
  const {surfaceAt}=fixture();
  for (const [region,x,y,expected] of [
    ['forest',.54,.31,'uncertain'], ['forest',.48,.65,'clearing'],
    ['home',.40,.29,'uncertain'], ['home',.49,.56,'boards'],
    ['city',.55,.28,'uncertain'], ['city',.12,.84,'uncertain'], ['city',.57,.60,'paving'],
    ['river_lake',.29,.326,'uncertain'], ['river_lake',.46,.385,'river'], ['river_lake',.47,.64,'pebbles'],
    ['sea',.5,.48,''], ['star_stop',.5,.66,''], ['home',-.01,.6,'']
  ]) assert.equal(surfaceAt(region,x,y),expected);
});

test('Projected feet track camera changes and only decorate existing nodes',()=>{
  const api=fixture();
  let reads=0, stageTop=0;
  const stage={getBoundingClientRect:()=>{reads++;return {left:10,top:stageTop};}};
  const art={left:0,top:0,width:200,height:300};
  const camera={scaleX:2,scaleY:3};
  const first=api.prepare('forest',art,stage,camera,1);
  const shadow={dataset:{}}, blades={dataset:{}};
  api.annotate(shadow,blades,first,40,30);
  assert.equal(shadow.dataset.finishSurface,'uncertain');
  assert.equal(blades.dataset.finishSurface,'uncertain');
  assert.equal(api.prepare('forest',{...art},stage,camera,1),first);
  assert.equal(reads,1);
  stageTop=120;
  const second=api.prepare('forest',art,stage,camera,2);
  api.annotate(shadow,blades,second,40,30);
  assert.equal(shadow.dataset.finishSurface,'clearing');
  assert.equal(reads,2);
  assert.equal(api.prepare('sea',art,stage,camera,3),null);
  api.annotate(shadow,blades,null,40,30);
  assert.deepEqual(shadow.dataset,{});
  assert.deepEqual(blades.dataset,{});
  assert.equal(api.enabled(),false);
  api.setEnabled(true);
  assert.equal(api.enabled(),true);
  api.setEnabled('off');
  assert.equal(api.enabled(),true);
});

test('Finish renderer checks that each of its two V4 insertion points is unique',()=>{
  assert.throws(()=>applyGroundPaint('unrecognized controller'),/anchor/);
});
