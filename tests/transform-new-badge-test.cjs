const {test}=require('node:test');
const assert=require('node:assert/strict');
const {harness}=require('./helpers/runtime-harness.cjs');
function cells(html,attr){return [...html.matchAll(new RegExp(`<button[^>]*${attr}="([^"]+)"[^>]*>([\\s\\S]*?)<\\/button>`,'g'))];}
function key(h,line){return `${line}:${h.api.stageForAge(h.api.state().ageTicks/20,line)}`;}
test('ordinary candidates mark only the undiscovered displayed form, without changing history',()=>{
 const h=harness(),s=h.api.state();s.transformOptions=['cat','dog','ren'];
 s.discoveredStages=[key(h,'dog'),'cat:0'];const before=[...s.discoveredStages];h.api.render();
 const entries=cells(h.get('transformChoices').innerHTML,'data-line');
 assert.equal(entries.length,3);
 for(const [,line,html] of entries)assert.equal(html.includes('>NEW</span>'),line!=='dog',line);
 assert.match(entries[2][2],/？？？/);assert.doesNotMatch(entries[2][2],/<img/);
 assert.deepEqual([...s.discoveredStages],before);
});
test('discovery through transformation removes NEW and persists after reload',()=>{
 const data=new Map(),storage={getItem:k=>data.get(k)||null,setItem:(k,v)=>data.set(k,v),removeItem:k=>data.delete(k)};
 const h=harness({storage}),s=h.api.state();s.transformOptions=['cat'];s.discoveredStages=[];
 h.api.render();assert.match(h.get('transformChoices').innerHTML,/>NEW<\/span>/);
 h.api.chooseTransform('cat');assert.ok(s.discoveredStages.includes(key(h,'cat')));
 s.transformOptions=['cat'];h.api.saveState();
 const next=harness({storage,resume:true});next.api.state().transformOptions=['cat'];next.api.render();
 assert.doesNotMatch(next.get('transformChoices').innerHTML,/>NEW<\/span>/);
});
test('transform ticket candidates use the same dex discovery keys',()=>{
 const h=harness(),s=h.api.state();s.items.c_transform=2;s.discoveredStages=[];
 h.api.useConsumableItem('c_transform');
 let entries=cells(h.get('pickerGrid').innerHTML,'data-picker-value');
 assert.equal(entries.length,3);entries.forEach(e=>assert.match(e[2],/>NEW<\/span>/));
 h.api.closePicker();
 for(const line of h.api.normalLines)for(let i=0;i<8;i++)s.discoveredStages.push(`${line}:${i}`);
 h.api.useConsumableItem('c_transform');
 assert.doesNotMatch(h.get('pickerGrid').innerHTML,/>NEW<\/span>/);
 assert.equal(s.items.c_transform,2);
});
