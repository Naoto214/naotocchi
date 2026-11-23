import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {existsSync, readFileSync} from 'node:fs';
import test from 'node:test';
import {ART_SCENES} from '../../home-production-manifest.mjs';
import {createRecoveredNavigation} from '../../home-recovered-navigation.mjs';
import {extendVisibleGroundNavigation} from '../../home-visible-ground-navigation.mjs';

const filename = 'home-route-navigation.mjs';
const root = new URL('../../', import.meta.url);
const shipped = new URL('.production/'+filename, root);
const control = existsSync(shipped) ? readFileSync(shipped,'utf8') :
  execFileSync('git',['show','384730f1:'+filename],{cwd:root,encoding:'utf8'});
assert.equal(createHash('sha256').update(control).digest('hex').slice(0,12), '9459d7632eb7');
async function inspect(source) {
  // Expose the existing private grid for observation; preserve every calculation.
  const index = source.lastIndexOf('return {');
  assert.ok(index >= 0);
  const observed = source.slice(0,index)+source.slice(index).replace('return {','return {grid,');
  return (await import('data:text/javascript;base64,'+Buffer.from(observed).toString('base64'))).createTerrainNavigation;
}
const main = await inspect(control), trial = await inspect(readFileSync(new URL(filename, root),'utf8'));
const bounds = {left:0,right:48,top:0,bottom:48};
const opts = {width:48,height:48,cell:8,gridOrigin:{x:0,y:0},project:p=>p,unproject:p=>({...p,z:0}),
  walkable:p=>!(p.x>22&&p.x<26&&p.y<24),
  segmentWalkable:(a,b)=>!(a.x===16&&b.x===24&&a.y>=32)};
const predicate = p=>!(p.y>=29&&p.y<=35&&p.x>=13&&p.x<=19);

test('every directed neighbor retains the exact eager order in both grids across cache eviction',()=>{
  const a=main(opts), b=trial({...opts,staticGeometry:true});
  for(let i=0;i<20;i++){
    const box={...bounds,left:i===19?0:i/4};
    for(const spacing of [8,4]){
      const original=a.grid(box,spacing), observed=b.grid(box,spacing);
      assert.deepEqual(observed.nodes, original.nodes);
      // Request out of order so laziness cannot hide a reversed/bidirectional edge.
      for(let k=original.nodes.length-1;k>=0;k--)assert.deepEqual(observed.neighbors(k),original.edges[k]);
    }
  }
});

test('every fixture endpoint pair retains the same waypoints with each live occupancy predicate',()=>{
  const a=main(opts), b=trial({...opts,staticGeometry:true});
  const points=a.grid(bounds).nodes;
  let open=true;
  const live=p=>open||predicate(p);
  for(const state of [true,false,true]){
    open=state;
    for(const start of points)for(const goal of points){
      for(const op of ['route','referenceRoute','reachable']){
        const args=[start,goal,bounds,live,p=>p.y>=5];
        assert.deepEqual(b[op](...args),a[op](...args),op);
      }
      for(const op of ['nearest','referenceNearest'])assert.deepEqual(b[op](goal,bounds,live),a[op](goal,bounds,live));
    }
  }
});

test('mutable terrain retains eager edge snapshot and repeat traversal checks',()=>{
  let allowed=true;
  const mutable={...opts,segmentWalkable:(a,b)=>allowed||a.x<28&&b.x<28};
  const a=main(mutable), b=trial(mutable);
  for(const state of [true,false,true]){
    allowed=state;
    for(const op of ['route','reachable','referenceRoute']){
      const args=[{x:8,y:8},{x:40,y:8},bounds,predicate];
      assert.deepEqual(b[op](...args),a[op](...args),op);
    }
  }
});

test('regional seats, transforms, projected walkability and input paths match the eager mode',()=>{
  const host={width:100,height:150}, rect={left:0,top:0,width:100,height:150};
  const area={left:0,right:96,top:30,bottom:148};
  for(const spec of Object.values(ART_SCENES)){
    for(const scale of [.83,1.12]){
      const presentation={x:0,y:0,scaleX:scale,scaleY:scale};
      const visible={spec,stage:rect,presentation,cover:{left:0,top:0,width:100,height:150}};
      const make=staticGeometry=>extendVisibleGroundNavigation(createRecoveredNavigation(spec,host,rect,
        {stableGrid:true,expandCity:true,staticGeometry}),visible);
      const eager=make(false),lazy=make(true);
      for(const n of [1,2,5,10,28])for(let i=0;i<n;i++)
        assert.deepEqual(lazy.initialPoint(i,n),eager.initialPoint(i,n));
      const from=eager.nearest(eager.initialPoint(0,2),area);
      assert.ok(from,spec.region);
      for(const target of [eager.initialPoint(1,2),{x:35,y:90}]){
        assert.equal(lazy.valid(target),eager.valid(target));
        assert.deepEqual(lazy.unproject(target),eager.unproject(target));
        for(const op of ['route','referenceRoute','reachable'])
          assert.deepEqual(lazy[op](from,target,area,predicate),eager[op](from,target,area,predicate),spec.region+' '+op);
      }
    }
  }
});
