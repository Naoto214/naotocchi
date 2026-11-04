const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
function boot(){
 const microtasks=[],mutations=[],attrs={},style={},children=[];
 const slot={children,style:{setProperty:(k,v)=>style[k]=v},dataset:attrs};
 const body={dataset:{homeProduction:'true',homeTerrain:'true'}};
 vm.runInNewContext(fs.readFileSync('home-production-touch.js','utf8').split('/* Notice layout only.')[1].replace(/^[\s\S]*?\*\//,''),{
  document:{body,getElementById:()=>slot},queueMicrotask:fn=>microtasks.push(fn),
  ResizeObserver:class{observe(){}},MutationObserver:class{constructor(fn){mutations.push(fn)}observe(){}}
 });
 const flush=()=>{while(microtasks.length)microtasks.shift()();};
 const content=(height,visible=true)=>({getClientRects:()=>visible?[{}]:[],getBoundingClientRect:()=>({height})});
 return {slot,body,style,attrs,children,flush,content,change:()=>mutations[0]()};
}
test('notice expansion is reserved before the next animation frame, even when RAF is throttled',()=>{
 const h=boot();h.children.push(h.content(50));h.flush();assert.equal(h.style['--home-notice-extra'],'8px');assert.equal(h.attrs.expanded,'true');
 h.children[0]=h.content(92);h.change();h.flush();assert.equal(h.style['--home-notice-extra'],'50px');
});
test('short, expired, hidden and non-terrain messages restore the original reservation',()=>{
 const h=boot();h.children.push(h.content(92));h.flush();
 for(const [height,visible] of [[28,true],[0,false],[92,false]]){h.children[0]=h.content(height,visible);h.change();h.flush();assert.equal(h.style['--home-notice-extra'],'0px');}
 h.children[0]=h.content(92);h.body.dataset.homeTerrain='';h.change();h.flush();assert.equal(h.attrs.expanded,'false');
});
