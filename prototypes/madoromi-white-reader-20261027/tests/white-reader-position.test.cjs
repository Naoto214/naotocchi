const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),test=require('node:test');
const source=fs.readFileSync(__dirname+'/../dist/white-reader.js','utf8');
function setup(saved=null,hash=''){
 const events={},we={},storage={};if(saved)storage['madoromi38-reading-position-v6']=JSON.stringify(saved);
 let y=0;const location={hash};const nodes=[['0',300,100],['2',1000,40],['3',1080,400],['4',1600,400],['100',6000,40]].map(([index,top,height])=>({dataset:{sourceIndex:index},getBoundingClientRect(){return {top:top-y,bottom:top+height-y,height}},closest(){return {id:index==='100'?'chapter-6':'chapter-1'}},scrollIntoView(){y=top-82}}));
 const clicker=(hash)=>({hash,hidden:true,dataset:{},handlers:[],addEventListener(n,f){if(n==='click')this.handlers.push(f)},click(){const e={defaultPrevented:false,preventDefault(){this.defaultPrevented=true}};this.handlers.forEach(f=>f(e));if(!e.defaultPrevented){history.pushState(null,'',this.hash);we.hashchange?.()}}});
 const resume=clicker('#chapter-1'),links=[clicker('#chapter-6'),clicker('#top'),resume];
 const menu={open:false,contains(){return false},querySelector(){return {focus(){}}}};
 const toolbar={offsetHeight:58,getBoundingClientRect(){return {bottom:58}}};
 const history={state:null,entries:[],replaceState(s,t,u){this.state=s;if(u)location.hash=u},pushState(s,t,u){this.entries.push({state:this.state,hash:location.hash});this.state=s;location.hash=u},back(){const entry=this.entries.pop();this.state=entry.state;location.hash=entry.hash;we.popstate?.({state:entry.state})}};
 const window={innerWidth:390,get scrollY(){return y},scrollBy(x,dy){y+=dy},scrollTo(x,v){y=v},addEventListener(n,f){we[n]=f}};window.self=window;window.top=window;
 const document={hidden:false,documentElement:{style:{setProperty(){}}},getElementById(id){return id==='reader-menu'?menu:id==='resume'?resume:id==='top'?nodes[0]:id==='chapter-6'?nodes[4]:nodes[1]},querySelector(){return toolbar},querySelectorAll(s){return s.startsWith('.source')?nodes:s==='[data-size]'?[]:links},addEventListener(n,f){events[n]=f}};
 vm.runInNewContext(source,{window,document,history,location,localStorage:{getItem:k=>storage[k]||null,setItem:(k,v)=>storage[k]=v},requestAnimationFrame:f=>f(),setTimeout:f=>{f();return 1},clearTimeout(){}});
 we.load();return {we,history,location,links,resume,storage,scroll(v){y=v;we.scroll()},get y(){return y}};
}
test('Back restores the paragraph position before chapter navigation',()=>{const s=setup();s.scroll(1700);s.links[0].click();s.history.back();assert.equal(s.y,1700)});
test('Cover preserves the current bookmark and offers resume in the same session',()=>{const s=setup();s.scroll(1700);s.links[1].click();assert.equal(s.y,0);assert.equal(JSON.parse(s.storage['madoromi38-reading-position-v6']).index,'4');assert.equal(s.resume.hidden,false);s.resume.click();assert.equal(s.y,1700)});
test('Resume with the same chapter hash retains the saved paragraph',()=>{const s=setup({index:'4',offset:-.425,hash:'#chapter-1'},'#chapter-1');s.resume.hash='#chapter-1';s.resume.click();assert.equal(s.y,1700)});
