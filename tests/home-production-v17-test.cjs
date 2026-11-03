const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const window={};const source=fs.readFileSync('home-production-touch.js','utf8');vm.runInNewContext(source.slice(source.indexOf('/* V8 viewport:')),{window});const api=window.NaotocchiHomeViewport;
test('V17 landscape lanes reserve 42/76px at the left viewport edges while portrait matches V16',()=>{
 assert.equal(typeof api.layoutV17,'function');
 for(const [width,height]of [[375,667],[320,568],[844,280],[568,320],[820,216]]){
  const args={width,height,left:16,headerBottom:46,controlsHeight:111,offsetTop:5},p=api.layoutV17(args),old=api.layoutV14(args);
  if(width<height){assert.deepEqual(p,old);continue;}
  assert.equal(p.noticeTop,5);assert.equal(p.noticeHeight,42);assert.equal(p.commentTop,5+height-76);assert.equal(p.commentHeight,76);
  for(const k of ['railLeft','railWidth','metersTop','controlsTop','frameWidth','frameHeight','nativeFrameWidth'])assert.equal(p[k],old[k],k);
 }
});
test('V17 foreground polygons follow the painted cover, not the compressed resident projection',async()=>{
 const {createHomeWorld}=await import('../home-production-world.mjs');
 const {selectRecoveredScene}=await import('../home-production-manifest.mjs');
 for(const landscape of [false,true]){
 const real={left:0,top:0,width:landscape?420:375,height:landscape?280:667},native={left:86,top:128,width:343,height:709},stage={left:86,top:262,width:343,height:380},sx=.71,sy=.47;
 const undo=({x,y})=>({x:16+(x-16)/sx,y:136+(y-136)/sy});
 const ctx={drawImage(){},setTransform(){},fillRect(){},save(){},restore(){}};
 const container={appendChild(){},getBoundingClientRect:()=>real};const doc={body:{dataset:{homeViewportVersion:'12',homeTinyOverview:'true',homeDisplayVersion:'17'}},createElement:()=>({style:{},getContext:()=>ctx,remove(){}}),getElementById:()=>({getBoundingClientRect:()=>stage})};
 const win={Image:class{set src(v){this.onload()}},devicePixelRatio:1,NaotocchiHomeViewport:{residentPresentation:()=>({landscape}),presentationRect:e=>e===container?native:stage,unscalePoint:undo}};
 const world=createHomeWorld({container,document:doc,window:win});world.setEnvironment({region:'home',time:'day'});world.navigation(stage);
 const polygons=world.occlusion({x:.5,z:.8}),original=selectRecoveredScene('home').foreground;
 const width=landscape?real.height/1.5:Math.max(real.width,real.height/1.5),height=width*1.5,left=(real.width-width)/2,top=(real.height-height)/2;
 for(let i=0;i<original.length;i++)for(let j=0;j<original[i].length;j++){
  const [x,z]=original[i][j],[nx,ny]=polygons[i][j],screenX=16+(nx+native.left-16)*sx,screenY=136+(ny+native.top-136)*sy;
  assert.ok(Math.abs(screenX-(left+x*width))<1e-6,'foreground X aligns with artwork');assert.ok(Math.abs(screenY-(top+z*height))<1e-6,'foreground Y aligns with artwork');
 }
 }
});
test('V17 actor display limits constrain existing routes without changing portrait/default bounds',()=>{
 const m=require('../home-production-model.js'),a={w:60,h:90},s={width:343,height:380,groundTop:24};const old=m.bounds(a,s);
 assert.deepEqual(m.bounds(a,{...s,actorBounds:(a,b)=>({...b,top:200,bottom:300})}),{...old,top:200,bottom:300});
 assert.deepEqual(m.bounds(a,s),old);
});
test('V17 foreground remains fixed through image reflection, rotation and motion translation',()=>{
 const {localOcclusionPolygons}=require('../home-production-diorama.js');assert.equal(typeof localOcclusionPolygons,'function');
 const polygons=[[[60,40],[100,40],[100,100],[60,100]]];
 for(const m of [[1,0,0,1],[-1,0,0,1],[.8,.2,-.3,1.1]]){
  const [a,b,c,d]=m,w=100,h=120,origin={x:13,y:-7};
  const xs=[0,a*w,c*h,a*w+c*h],ys=[0,b*w,d*h,b*w+d*h];
  const r={left:origin.x+Math.min(...xs),top:origin.y+Math.min(...ys)};
  const local=localOcclusionPolygons(polygons,r,w,h,m);
  local[0].forEach(([x,y],i)=>{assert.ok(Math.abs(origin.x+a*x+c*y-polygons[0][i][0])<1e-9);assert.ok(Math.abs(origin.y+b*x+d*y-polygons[0][i][1])<1e-9)});
 }
});
