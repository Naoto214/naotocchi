const {test}=require('node:test'),assert=require('node:assert/strict');
test('comparison capture omits hidden art surface and composites preserved 3D plus overlay in order',async()=>{
 const {captureBackground}=await import('../home-v6-capture.mjs');const draws=[],rect={left:0,top:0,width:390,height:844};
 const layers=[{id:'hidden-art',style:{display:'none'}},{id:'legacy-world',style:{display:''}},{id:'legacy-overlay',style:{display:''}}].map(x=>({...x,getBoundingClientRect:()=>rect}));
 const result={getContext:()=>({drawImage:(...a)=>draws.push(a)})};let rendered=0;const host={getBoundingClientRect:()=>rect,querySelectorAll:()=>layers,ownerDocument:{createElement:()=>result}};
 assert.equal(captureBackground(host,{draw:()=>rendered++}),result);assert.equal(rendered,1);assert.equal(result.width,390);assert.equal(result.height,844);assert.deepEqual(draws.map(a=>a[0].id),['legacy-world','legacy-overlay']);
});
