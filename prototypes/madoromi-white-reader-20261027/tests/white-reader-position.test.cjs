const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),test=require('node:test');
const source=fs.readFileSync(__dirname+'/../dist/white-reader.js','utf8');
function setup(saved=null,hash='',withSignature=false){
 const events={},we={},storage={};if(saved)storage['madoromi38-reading-position-v6']=JSON.stringify(saved);
 let y=0;const location={hash};const nodes=[['0',300,100],['2',1000,40],['3',1080,400],['4',1600,400],['394',6000,40]].map(([index,top,height])=>({dataset:{sourceIndex:index},getBoundingClientRect(){return {top:top-y,bottom:top+height-y,height}},closest(){return {id:index==='394'?'chapter-6':'chapter-1'}},scrollIntoView(){y=top-82}}));
 const clicker=(hash)=>({hash,hidden:true,dataset:{},handlers:[],addEventListener(n,f){if(n==='click')this.handlers.push(f)},click(){const e={defaultPrevented:false,preventDefault(){this.defaultPrevented=true}};this.handlers.forEach(f=>f(e));if(!e.defaultPrevented&&this.hash){history.pushState(null,'',this.hash);we.hashchange?.()}}});
 const signature=withSignature?{id:'signature',dataset:{sourceIndex:'396'},getBoundingClientRect(){return {top:7000-y,bottom:7800-y,height:800}},closest(){return null},scrollIntoView(){y=7000-82}}:null;
 const resume=clicker('#chapter-1'),links=[clicker('#chapter-6'),clicker('#top'),resume];
 const controls=Object.fromEntries(['toc-content','work-info','open-work-info','back-to-toc'].map(id=>[id,{...clicker(''),hidden:id==='work-info',focus(){this.focused=true}}]));
 const menu={open:false,addEventListener(n,f){this[n]=f},contains(){return false},querySelector(){return {focus(){}}}};
 const toolbar={offsetHeight:58,getBoundingClientRect(){return {bottom:58}}};
 const history={state:null,entries:[],replaceState(s,t,u){this.state=s;if(u)location.hash=u},pushState(s,t,u){this.entries.push({state:this.state,hash:location.hash});this.state=s;location.hash=u},back(){const entry=this.entries.pop();this.state=entry.state;location.hash=entry.hash;we.popstate?.({state:entry.state})}};
 const classes=new Set();
 const window={innerWidth:390,innerHeight:844,get scrollY(){return y},scrollBy(x,dy){y+=dy},scrollTo(x,v){y=v},addEventListener(n,f){we[n]=f}};window.self=window;window.top=window;
 const document={body:{classList:{toggle(name,on){on?classes.add(name):classes.delete(name)}}},hidden:false,documentElement:{style:{setProperty(){}}},getElementById(id){if(controls[id])return controls[id];return id==='signature'?signature:id==='reader-menu'?menu:id==='resume'?resume:id==='top'?nodes[0]:id==='chapter-6'?nodes[4]:nodes[1]},querySelector(){return toolbar},querySelectorAll(s){return s.startsWith('.source')?nodes:s==='[data-size]'?[]:links},addEventListener(n,f){events[n]=f}};
 vm.runInNewContext(source,{window,document,history,location,localStorage:{getItem:k=>storage[k]||null,setItem:(k,v)=>storage[k]=v},requestAnimationFrame:f=>f(),setTimeout:f=>{f();return 1},clearTimeout(){}});
 we.load();return {we,events,controls,menu,history,location,links,resume,storage,classes,scroll(v){y=v;we.scroll()},get y(){return y}};
}
test('Back restores the paragraph position before chapter navigation',()=>{const s=setup();s.scroll(1700);s.links[0].click();s.history.back();assert.equal(s.y,1700)});
test('Cover preserves the current bookmark and offers resume in the same session',()=>{const s=setup();s.scroll(1700);s.links[1].click();assert.equal(s.y,0);assert.equal(JSON.parse(s.storage['madoromi38-reading-position-v6']).index,'4');assert.equal(s.resume.hidden,false);s.resume.click();assert.equal(s.y,1700)});
test('Resume with the same chapter hash retains the saved paragraph',()=>{const s=setup({index:'4',offset:-.425,hash:'#chapter-1'},'#chapter-1');s.resume.hash='#chapter-1';s.resume.click();assert.equal(s.y,1700)});

test('Old signature bookmarks resume at the final manuscript paragraph',()=>{
 const s=setup({index:'396',offset:-.2,hash:'#signature'});
 assert.equal(s.y,5930);
 assert.equal(s.resume.href,'#chapter-6');
 s.we.pagehide();
 assert.equal(JSON.parse(s.storage['madoromi38-reading-position-v6']).index,'394');
});
test('An old signature URL resolves to the final manuscript paragraph',()=>{
 const s=setup(null,'#signature');assert.equal(s.y,5930);
});
test('Work information opens and returns without changing reading position, history or bookmark',()=>{
 const s=setup();s.scroll(1700);s.menu.open=true;
 const saved=s.storage['madoromi38-reading-position-v6'],state=JSON.stringify(s.history.state);
 s.controls['open-work-info'].click();
 assert.equal(s.controls['work-info'].hidden,false);
 assert.equal(s.controls['toc-content'].hidden,true);
 assert.equal(s.y,1700);assert.equal(s.history.entries.length,0);
 assert.equal(s.storage['madoromi38-reading-position-v6'],saved);
 assert.equal(JSON.stringify(s.history.state),state);
 s.controls['back-to-toc'].click();
 assert.equal(s.controls['work-info'].hidden,true);
 assert.equal(s.controls['toc-content'].hidden,false);
 assert.equal(s.controls['open-work-info'].focused,true);
 assert.equal(s.y,1700);
 const reloaded=setup(JSON.parse(saved));assert.equal(reloaded.y,1700);
});
test('Escape returns from work information to the contents before closing the menu',()=>{
 const s=setup();s.menu.open=true;s.controls['open-work-info'].click();
 s.events.keydown({key:'Escape'});
 assert.equal(s.controls['work-info'].hidden,true);assert.equal(s.menu.open,true);
 s.events.keydown({key:'Escape'});assert.equal(s.menu.open,false);
});
