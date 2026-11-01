const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');

function boot(){
 const frames=[],properties={},listeners={},observers=[];
 const frame={scrollTop:0,scrollHeight:679,clientHeight:207,clientWidth:635,
  addEventListener(type,fn){listeners[type]=fn;},getBoundingClientRect(){return {top:49,bottom:49+this.clientHeight,height:this.clientHeight};}};
 const device={dataset:{homeFixed:'true'},querySelector:()=>frame};
 const actor={getBoundingClientRect:()=>({top:246-frame.scrollTop,bottom:366-frame.scrollTop,height:120})};
 const speech={classList:{contains:()=>false},querySelector:()=>null,getBoundingClientRect:()=>({top:564-frame.scrollTop,bottom:640-frame.scrollTop,height:76})};
 const doc={body:{dataset:{homeProduction:'true',homeTerrain:'true'},style:{setProperty:(k,v)=>properties[k]=v}},
  getElementById:id=>id==='device'?device:id==='speechSlot'?speech:{},querySelector:()=>actor,addEventListener(){}};
 vm.runInNewContext(fs.readFileSync('home-production-touch.js','utf8'),{document:doc,window:{},requestAnimationFrame:fn=>frames.push(fn),
  ResizeObserver:class{constructor(fn){observers.push(fn);}observe(){}},MutationObserver:class{observe(){}}});
 const resize=()=>observers[0](),flush=()=>{for(let guard=0;frames.length&&guard<20;guard++)frames.shift()();};
 resize();return {frame,properties,listeners,resize,flush,speech};
}
test('entry brings the existing actor into the central viewport',()=>{
 const h=boot();h.flush();assert.equal(h.frame.scrollTop,153.5);assert.equal(h.properties['--home-center-scroll'],'153.5px');
});
test('a pending entry focus cannot undo a later scroll to the meters',()=>{
 const h=boot();h.frame.scrollTop=472;h.flush();
 assert.equal(h.frame.scrollTop,472);assert.equal(h.properties['--home-center-scroll'],'472px');
});
test('a delayed scroll event still preserves the latest viewport position',()=>{
 const h=boot();h.frame.scrollTop=279;h.flush();h.listeners.scroll();
 assert.equal(h.frame.scrollTop,279);assert.equal(h.properties['--home-center-scroll'],'279px');
});
test('scroll after entry focus paints even when WebKit delays the scroll event',()=>{
 const h=boot();h.flush();
 h.frame.scrollTop=279;h.flush();
 assert.equal(h.frame.scrollTop,279,'background synchronization must not refocus the viewport');
 assert.equal(h.properties['--home-center-scroll'],'279px');
 h.frame.scrollTop=472;h.flush();
 assert.equal(h.properties['--home-center-scroll'],'472px');
});
test('a later real resize may reveal the actor again after an interrupted focus',()=>{
 const h=boot();h.frame.scrollTop=472;h.flush();h.frame.clientHeight=152;h.resize();h.flush();
 assert.equal(h.frame.scrollTop,181);assert.equal(h.properties['--home-center-scroll'],'181px');
});
test('resize keeps an active question reachable using the existing speech slot',()=>{
 const h=boot();h.speech.classList.contains=()=>true;h.flush();assert.equal(h.frame.scrollTop,449.5);
});

test('comment dock remeasures controls after the rotation layout settles',()=>{
 const frames=[],events={},props={},rect={left:8,width:304,top:200};
 const dock={style:{setProperty:(k,v)=>props[k]=v}},slot={children:[dock]};
 const controls={getBoundingClientRect:()=>({...rect})};
 const context={innerHeight:320,document:{body:{dataset:{homeProduction:'true'}},getElementById:id=>({speechSlot:slot,careActions:controls,homeCommentDock:dock})[id]},window:{addEventListener:(k,f)=>events[k]=f},requestAnimationFrame:f=>frames.push(f),ResizeObserver:class{observe(){}},MutationObserver:class{observe(){}}};
 const src=fs.readFileSync('home-production-touch.js','utf8');vm.runInNewContext(src.slice(src.indexOf('/* V7 presentation dock:'),src.indexOf('/* Notice layout only.')),context);
 events.resize(); // WebKit can deliver resize before the final viewport/control layout.
 context.innerHeight=844;rect.top=700;rect.width=304;
 for(let n=0;frames.length&&n<5;n++)frames.shift()();
 assert.equal(props['--comment-bottom'],'148px','bubble remains four pixels above the actual controls');
 assert.equal(props['--comment-max-height'],'692px');
});
