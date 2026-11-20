// Exercise the exact packaged models with one resident and a six-pixel native terrain grid.
// Re-sync supplies a fresh navigation object, as a real camera/reprojection update does.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {pathToFileURL} = require('node:url');
const {createHash} = require('node:crypto');

async function exercise(game, finish) {
  const name = suffix => finish ? suffix+'-finish' : suffix;
  const modelPath = path.join(game,name('home-production-model')+'.js');
  const navPath = path.join(game,name('home-route-navigation')+'.mjs');
  const {createModel} = require(modelPath);
  const {createTerrainNavigation} = await import(pathToFileURL(navPath));
  const native = createModel({random:()=>0.5});
  const roster = [{key:'pet:dog',kind:'pet',id:'dog',x:52,y:68,w:15,h:18}];
  const bounds = {left:8,top:20,right:148,bottom:110};
  function navigation(walkable) {
    return createTerrainNavigation({width:156,height:120,cell:6,gridOrigin:{x:0,y:0},
      project:point=>({x:point.x,y:point.z}),unproject:p=>({x:p.x,y:0,z:p.y}),walkable});
  }
  function sync(nav) {
    native.sync(roster,{region:'home',width:156,height:120,navigation:nav,actorBounds:()=>bounds});
  }
  const point = () => {const {x,y}=native.snapshot()[0];return {x,y};};
  const within = p => p.x>=bounds.left && p.x<=bounds.right && p.z>=bounds.top && p.z<=bounds.bottom;
  sync(navigation(within));
  const start=point();
  const goal={x:95,y:73};
  assert.ok(native.move('pet:dog',goal,'drag'));
  for(let i=0;i<180 && native.snapshot()[0].target;i++) native.step(.05,{autonomy:false});
  const arrived=point();
  assert.ok(Math.hypot(goal.x-arrived.x,goal.y-arrived.y)<=.5);
  sync(navigation(within));
  const retained=point();
  assert.deepEqual(retained,arrived);
  const narrow=navigation(p=>within(p)&&p.x<=72);
  assert.equal(narrow.valid(retained),false);
  sync(narrow);
  const recovered=point();
  assert.ok(narrow.valid(recovered));
  assert.notDeepEqual(recovered,retained);
  sync(narrow);
  assert.deepEqual(point(),recovered);
  const sha = file => createHash('sha256').update(fs.readFileSync(file)).digest('hex');
  return {modelSHA256:sha(modelPath),navigationSHA256:sha(navPath),start,requested:goal,arrived,retained,recovered};
}

async function main() {
  const [root,output]=process.argv.slice(2);
  if (!root||!output) throw Error('Supply the built V5 distribution and result JSON path');
  const game=path.resolve(root,'game');
  const v4=await exercise(game,false),finish=await exercise(game,true);
  for (const field of ['start','requested','arrived','retained','recovered']) assert.deepEqual(finish[field],v4[field],field);
  fs.writeFileSync(output,JSON.stringify({terrainFixture:'156x120; native 6px grid; closing boundary x=72',v4,finish},null,2)+'\n');
  console.log('Native walk, safe-position retention and invalid-position recovery agree.',finish.arrived,finish.recovered);
}
main().catch(e=>{console.error(e);process.exitCode=1;});
