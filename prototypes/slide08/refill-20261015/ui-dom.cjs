const {JSDOM}=require(process.env.SLIDE08_JSDOM||'../node_modules/jsdom');const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
(async()=>{const root=__dirname,dom=new JSDOM(fs.readFileSync(path.join(root,'ui/index.html'),'utf8'),{url:'http://localhost/prototypes/slide08/refill-20261015/ui/index.html',pretendToBeVisual:true});
for(const k of ['window','document','localStorage','location'])global[k]=k==='window'?dom.window:dom.window[k];global.matchMedia=()=>({matches:true});Object.defineProperty(global,'navigator',{configurable:true,value:{locks:{request:async(n,o,fn)=>fn({name:n})}}});global.setInterval=()=>1;dom.window.scrollTo=()=>{};dom.window.HTMLDialogElement.prototype.showModal=function(){this.open=true};dom.window.HTMLDialogElement.prototype.close=function(){this.open=false};
await import(path.join(root,'ui/player.mjs'));const $=id=>document.getElementById(id),wait=()=>new Promise(r=>setTimeout(r,20));await wait();
assert.equal($('slideSpeed').value,'280');assert.equal($('qaDetails').open,false);assert.equal($('quickProfiles').children.length,3);
const read=()=>JSON.parse(localStorage.getItem('naopoyo-slide-refill-qa-v1')).snapshot;
for(const profile of ['E','A','B','C16-20','D0']){
 $('profile').value=profile;$('seedInput').value='1';$('start').click();if($('dialog').open)$('dialogChoices').children[0].click();await wait();assert.equal(read().state.lab.profile,profile);assert.equal(document.querySelector('#board .tile')!==null,true,'shared foreground tiles');
 window.dispatchEvent(new dom.window.KeyboardEvent('keydown',{key:'ArrowLeft'}));await wait();assert.equal(read().state.moves,1);const after=read().state;
 $('difficulty').dispatchEvent(new dom.window.KeyboardEvent('keydown',{key:'ArrowRight',bubbles:true}));await wait();assert.deepEqual(read().state,after,'rating keyboard must not move game');
 $('undo').click();$('dialogChoices').children[0].click();await wait();assert.equal(read().state.moves,0);
 window.dispatchEvent(new dom.window.KeyboardEvent('keydown',{key:'ArrowLeft'}));await wait();assert.deepEqual(read().state,after);
 $('pause').click();await wait();assert.ok(read().qa.pauses>0);$('dialogChoices').children[1].click();
 const{restore}=await import(path.join(root,'session.mjs'));restore(read(),read().species);
}
for(const profile of ['E','B','C16-20']){document.querySelector(`[data-profile="${profile}"]`).click();assert.equal($('restore').hidden,false);$('restore').click();await wait();$('dialogChoices').children[0].click();assert.equal(read().state.lab.profile,profile);$('qaDetails').open=true;$('qaDetails').dispatchEvent(new dom.window.Event('toggle'));assert.match($('trialStats').textContent,/占有数/);$('closeQA').click();$('pause').click();$('dialogChoices').children[1].click();}
assert.equal(localStorage.getItem('naopoyo-slide-player-v1'),null);assert.equal(localStorage.getItem('naotocchi-save-v1'),null);
console.log('PASS actual E/A/B/C/D controls, deterministic Undo, replay restore, isolated storage');
})().catch(e=>{console.error(e);process.exit(1)});
