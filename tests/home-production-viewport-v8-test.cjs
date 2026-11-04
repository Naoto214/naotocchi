const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
function api(){const s=fs.readFileSync('home-production-touch.js','utf8'),i=s.indexOf('/* V8 viewport:');const window={};if(i>=0)vm.runInNewContext(s.slice(i),{window});assert.equal(typeof window.NaotocchiHomeViewport?.revealDelta,'function','V8 viewport controller missing');return window.NaotocchiHomeViewport;}
test('reveal moves only the camera enough to show a clipped actor on both axes',()=>{
 const a=api(),v={left:16,right:284,top:94,bottom:307},r={left:260,right:397,top:49,bottom:186};
 const d=a.revealDelta(v,r);assert.equal(d.x,178.5);assert.equal(d.y,-83);
 assert.ok(r.left-d.x>=v.left&&r.right-d.x<=v.right);assert.ok(r.top-d.y>=v.top&&r.bottom-d.y<=v.bottom);
});
test('visible actor does not pull a user-scrolled camera',()=>{assert.deepEqual(JSON.parse(JSON.stringify(api().revealDelta({left:16,right:284,top:94,bottom:307},{left:64,right:201,top:132,bottom:269}))),{x:0,y:0});});
test('portrait reserves 42 and 76 without moving controls',()=>{const p=api().layout({width:375,height:667,left:16,headerBottom:46,controlsTop:551,controlsBottom:654});assert.equal(p.frameTop,94);assert.equal(p.frameHeight,377);assert.equal(p.commentTop,471);assert.equal(p.frameWidth,343);assert.equal(p.landscape,false);});
test('landscape rail preserves the 213px window from the approved spike',()=>{const p=api().layout({width:568,height:320,left:16,headerBottom:46,controlsTop:204,controlsBottom:307});assert.equal(p.frameHeight,213);assert.equal(p.frameWidth,268);assert.equal(p.railLeft,292);assert.equal(p.commentTop,124);assert.equal(p.landscape,true);});
