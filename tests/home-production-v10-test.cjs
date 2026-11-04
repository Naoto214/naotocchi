const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const s=fs.readFileSync('home-production-touch.js','utf8'),window={};vm.runInNewContext(s.slice(s.indexOf('/* V8 viewport:')),{window});
test('V10 puts the 76px comment directly above all meters and controls without changing landscape',()=>{
 assert.equal(typeof window.NaotocchiHomeViewport.layoutV10,'function');
 for(const [width,height]of [[320,480],[375,550],[375,667],[390,664],[430,740],[568,230],[844,280]]){
  const args={width,height,left:16,headerBottom:46,controlsHeight:103,offsetTop:0};
  const p=window.NaotocchiHomeViewport.layoutV10(args);
  if(width>height){assert.deepEqual(p,window.NaotocchiHomeViewport.layoutV9(args));continue;}
  assert.equal(p.commentHeight,76);assert.equal(p.metersHeight,80);
  assert.ok(p.frameTop+p.frameHeight<=p.commentTop);
  assert.equal(p.commentTop+76+4,p.metersTop);
  assert.equal(p.metersTop+80+4,p.controlsTop);
  assert.ok(p.controlsTop+p.controlsHeight<=height);
 }
});
