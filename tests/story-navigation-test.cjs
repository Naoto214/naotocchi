const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
function run({search='?from=game',type='navigate',state=null}={}) {
  const links=[];
  const history={state,replaceState(value){this.state=value;}};
  const nav={append(link){links.push(link);}};
  const context={URLSearchParams,location:{search},history,performance:{getEntriesByType:()=>[{type}]},document:{querySelector:()=>nav,createElement:()=>({})}};
  vm.runInNewContext(fs.readFileSync(path.join(root,'story-navigation.js'),'utf8'),context);
  return {links,history};
}
test('game entry opens the white cover without clearing any saved bookmark',()=>{
  const {history,links}=run();
  assert.equal(history.state.whiteReader.top,true);
  assert.equal(history.state.whiteReader.index,'0');
  assert.equal(links.length,1);
  assert.equal(links[0].textContent,'ゲームにもどる');
  for(const base of ['https://example.com/','https://example.com/naotocchi/']){
    const reader=new URL('prototypes/madoromi-white-reader-20261027/dist/?from=game',base);
    assert.equal(new URL(links[0].href,reader).href,new URL('index.html',base).href);
  }
});
test('reload and browser back preserve reader restoration state',()=>{
  for(const type of ['reload','back_forward']){
    const state={whiteReader:{index:'55',offset:.25}};
    assert.equal(run({type,state}).history.state,state);
    assert.equal(run({type}).history.state,null);
  }
});
test('direct reader entry stays unchanged and cannot accept arbitrary return destinations',()=>{
  assert.equal(run({search:''}).links.length,0);
  assert.equal(run({search:'?from=https://evil.example'}).links.length,0);
  assert.equal(run({search:'?from=game&return=https://evil.example'}).links[0].href,'../../../index.html');
});
