// Execute the production hybrid renderer with only GPU/Canvas adapters replaced.
// Mutations to its routing/diagnostic/default/failure logic must fail these checks.
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const src=fs.readFileSync(require('node:path').join(__dirname,'../meguru-3d.mjs'),'utf8');
const start=src.indexOf('function createHybridRenderer('),end=src.indexOf('\n// すかす 物を',start);
function setup(opts={}){
  const calls={canvas:0,gl:0,diag:[],anim:[],show:[],destroy:0,create:0};
  const gl={draw(){calls.gl++;if(opts.throwDraw)throw Error('lost');},setDiag(v){calls.diag.push(v);},setAnimLevel(v){calls.anim.push(v);},setOccluderFade(){},setAdaptiveDpr(){},show(v){calls.show.push(v);},destroy(){calls.destroy++;}};
  const M={WORLD3D_REGIONS:new Set(['forest','city']),createCanvasRenderer(){return {draw(){calls.canvas++;},setAnimLevel(){},destroy(){}};}};
  const context={create3DRenderer(){calls.create++;return gl;},Error};vm.createContext(context);
  vm.runInContext(src.slice(start,end)+'\nthis.build=createHybridRenderer;',context);
  const renderer=context.build(M,{canvas:{style:{}},W:400,H:700,ctx:null},opts);
  return {renderer,calls};
}
test('hybrid real routing requires approved region/world or both corridor endpoints',()=>{
  const {renderer:r,calls:c}=setup();
  for(const world of [null,{}, {regionId:'forest'}, {regionId:'unknown',world3d:true},{corridor:true,chartFrom:'forest',corridorTo:'unknown'},{corridor:true,chartFrom:'forest'}]) {r.draw({world},0);assert.equal(r.is3D,false);}
  assert.equal(c.canvas,6);assert.equal(c.create,0);
  for(const world of [{regionId:'forest',world3d:true},{regionId:'city',world3d:true},{corridor:true,chartFrom:'forest',corridorTo:'city'}]) {r.draw({world},0);assert.equal(r.is3D,true);}
  assert.equal(c.gl,3);assert.equal(c.create,1);
  r.draw({world:{regionId:'unknown'}},0);assert.equal(r.is3D,false);assert.equal(c.show.at(-1),false);
});
test('force2d and WebGL failure retain actual canvas fallback',()=>{
  const view={world:{regionId:'forest',world3d:true}};
  const forced=setup({force2d:true});forced.renderer.draw(view,0);assert.equal(forced.calls.create,0);assert.equal(forced.calls.canvas,1);
  const failed=setup({throwDraw:true});failed.renderer.draw(view,0);failed.renderer.draw(view,16);
  assert.equal(failed.renderer.failed,true);assert.equal(failed.renderer.is3D,false);assert.equal(failed.calls.create,1);assert.equal(failed.calls.destroy,1);assert.equal(failed.calls.canvas,2);
});
test('diagnostics default off; explicit perf or QA opt-in survives lazy creation; reduced motion forwarded',()=>{
 const view={world:{regionId:'forest',world3d:true}};
 for(const perf of [false,true]){const {renderer:r,calls:c}=setup({perf});r.setAnimLevel(0);r.draw(view,0);assert.deepEqual(c.diag,[perf]);assert.deepEqual(c.anim,[0]);}
 const {renderer:r,calls:c}=setup();r.setDiag3d(true);r.draw(view,0);assert.deepEqual(c.diag,[true]);r.setDiag3d(false);assert.deepEqual(c.diag,[true,false]);
});
test('resize failure falls back and cleanup failure cannot strand Canvas',()=>{
 const calls=[];const view={world:{regionId:'forest',world3d:true}};
 const gl={draw(){},setDiag(){},setAnimLevel(){},setOccluderFade(){},setAdaptiveDpr(){},show(){},resize(){throw Error('resize');},destroy(){calls.push('gl destroy');throw Error('dispose');}};
 const c={create3DRenderer:()=>gl,Error};vm.createContext(c);vm.runInContext(src.slice(start,end)+'\nthis.build=createHybridRenderer;',c);
 const r=c.build({WORLD3D_REGIONS:new Set(['forest']),createCanvasRenderer(){return {draw(v){assert.equal(v,view);calls.push('canvas');},resize(){},destroy(){calls.push('canvas destroy');}};}},{canvas:{style:{}},W:400,H:700},{onFallback(){calls.push('fallback');throw Error('diagnostic callback');}});
 r.draw(view,0);assert.doesNotThrow(()=>r.resize({W:700,H:400}));r.draw(view,1);assert.equal(r.failed,true);assert.equal(r.is3D,false);assert.ok(calls.includes('canvas'));assert.doesNotThrow(()=>r.destroy());assert.ok(calls.includes('canvas destroy'));
});
test('real WebGL constructor failure removes partially inserted canvas',()=>{
 const a=src.indexOf('function create3DRenderer('),b=src.indexOf('\n}',a)+2;let attached=false;
 const parent={insertBefore(gl){attached=true;gl.parentNode=this;},removeChild(gl){attached=false;gl.parentNode=null;}},gl={style:{},addEventListener(){},removeEventListener(){}};
 const canvas={style:{position:'absolute',zIndex:'7'},parentNode:parent,ownerDocument:{createElement:()=>gl}};
 const c={THREE:{WebGLRenderer:class{constructor(){throw Error('GPU creation fault');}}},Error};vm.createContext(c);vm.runInContext(src.slice(a,b).replaceAll('import.meta.url', JSON.stringify('file:///meguru-3d.mjs'))+'\nthis.create=create3DRenderer;',c);
 assert.throws(()=>c.create({}, {canvas},()=>{}),/GPU creation fault/);assert.equal(attached,false,'no stale WebGL canvas');assert.equal(canvas.style.position,'absolute');assert.equal(canvas.style.zIndex,'7');
});
test('shader link failure is fatal and releases the partially initialized renderer',()=>{
 const a=src.indexOf('function create3DRenderer('),b=src.indexOf('\n}',a)+2;let attached=false,disposed=false;
 const parent={insertBefore(gl){attached=true;gl.parentNode=this;},removeChild(gl){attached=false;gl.parentNode=null;}},gl={style:{},addEventListener(){},removeEventListener(){}};
 const canvas={style:{},parentNode:parent,ownerDocument:{createElement:()=>gl}};
 class GPU {constructor(){this.debug={};}setClearColor(){if(this.debug.onShaderError)this.debug.onShaderError();throw Error('shader error silently ignored');}dispose(){disposed=true;}forceContextLoss(){}}
 const c={THREE:{WebGLRenderer:GPU},Error};vm.createContext(c);vm.runInContext(src.slice(a,b).replaceAll('import.meta.url',JSON.stringify('file:///meguru-3d.mjs'))+'\nthis.create=create3DRenderer;',c);
 assert.throws(()=>c.create({}, {canvas},()=>{}),/WebGL shader program failed/);assert.equal(disposed,true);assert.equal(attached,false);
});
