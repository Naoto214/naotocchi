const {test}=require('node:test'),assert=require('node:assert/strict');
const {assertStableRect}=require('./helpers/home-production-current-browser.cjs');
const before={x:16,y:143.59375,width:397.9974670410156,height:516.4031372070312,top:143.59375,right:413.9974670410156,bottom:659.9968872070312,left:16};
const after={x:16,y:143.59375,width:397.9989318847656,height:516.38623046875,top:143.59375,right:413.9989318847656,bottom:659.97998046875,left:16};
const frame={expected:{width:414.268276,height:420.221293,scaleX:.9607300945572905,scaleY:1.2288912030212176},actual:{width:413.204219,height:400.359289,scaleX:.9632041058923633,scaleY:1.2898570472790332}};
test('unchanged authored frame survives one native layout unit after camera scaling',()=>{
 assert.doesNotThrow(()=>assertStableRect(after,before,'measured WebKit frame',frame));
});
test('untransformed UI still uses the original 1/64 CSS pixel criterion',()=>{
 assert.throws(()=>assertStableRect(after,before,'unchanged original criterion'),/layout moved/);
});
test('a real authored frame change is rejected even when its native rounding is valid',()=>{
 const d=.02,layout={...frame,actual:{...frame.actual,height:frame.actual.height+d/frame.actual.scaleY}};
 const height=Math.floor(layout.actual.height*64)/64*layout.actual.scaleY;
 const actual={...after,height,bottom:after.top+height};
 assert.doesNotThrow(()=>assertStableRect(actual,before,'raw rounding conceals real resize'));
 assert.throws(()=>assertStableRect(actual,before,'real resize',layout),/layout moved/);
 assert.throws(()=>assertStableRect({...after,x:16.02,left:16.02,right:after.right+.02},before,'real position',frame),/layout moved/);
});
test('unexplained rendered drift and invalid camera measurements are rejected',()=>{
 assert.throws(()=>assertStableRect({...after,height:after.height-.1,bottom:after.bottom-.1},before,'real drift',frame));
 for(const scaleY of [0,-1,NaN,Infinity])assert.throws(()=>assertStableRect(after,before,'invalid',{...frame,actual:{...frame.actual,scaleY}}));
});

test('identical native layout cannot conceal a 0.017px painted shrink',()=>{
 assert.throws(()=>assertStableRect({...before,height:before.height-.017,bottom:before.bottom-.017},before,'fixed layout drift',{actual:frame.expected,expected:frame.expected}));
});
