// Compare the actual navigation exports on a shared grid and the archived household feet.
// This supplements the source check that proves the empty-patch condition outside forest.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';

const [original,corrected,baseline,output]=process.argv.slice(2);
if(!output)throw Error('Expected original module, corrected module, V12 game directory, output JSON');
const here=path.dirname(fileURLToPath(import.meta.url));
const base=pathToFileURL(path.resolve(baseline)+'/').href;
const moduleSource=file=>fs.readFileSync(file,'utf8');
const digest=source=>createHash('sha256').update(source).digest('hex');
async function observer(file){
  const source=moduleSource(file).replaceAll("from './","from '"+base);
  return (await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'))).extendVisibleGroundNavigation;
}
const [before,after]=await Promise.all([observer(original),observer(corrected)]);
const {selectRecoveredScene}=await import(base+'home-production-manifest.mjs');
const {createRecoveredNavigation}=await import(base+'home-recovered-navigation-finish.mjs');
const read=p=>JSON.parse(fs.readFileSync(path.join(here,p),'utf8'));
const regions=Object.keys(read('matrix-fixtures/index.json').regions).filter(region=>region!=='forest');
const result={oldSHA256:digest(moduleSource(original)),newSHA256:digest(moduleSource(corrected)),
  scope:'empty-patch public navigation branches; four archived camera transforms, original regional art and the feet of all 240 nonforest households',regions:{}};
for(const region of regions){
  const spec=selectRecoveredScene(region),donors=read('matrix-fixtures/'+region+'.json');
  assert.equal(spec.region,region);
  const count={households:0,validPoints:0,segments:0,route:0,referenceRoute:0,reachable:0};
  for(const width of [320,375,390,430]){
    const recorded=read([320,390].includes(width)?'../home-mobility-v10/evidence/native-scene-'+width+'.json':
      '../home-mobility-v12/evidence/performance-scene-'+width+'.json');
    const {host,rect,stage,p,cover,stableGrid}= (recorded.camera||recorded).nav;
    const make=extend=>extend(createRecoveredNavigation(spec,host,stage,{stableGrid,expandCity:stableGrid}),
      {spec,stage:rect,presentation:p,cover});
    const a=make(before),b=make(after);
    for(let y=0;y<=stage.height;y+=8)for(let x=0;x<=stage.width;x+=8){
      const start={x,y},end={x:x+17,y:y+5};
      assert.equal(a.valid(start),b.valid(start)); count.validPoints++;
      assert.equal(a.segmentSafe(start,end),b.segmentSafe(start,end)); count.segments++;
    }
    const bounds={left:0,top:0,right:stage.width,bottom:stage.height};
    for(const n of [1,4,10,20,28]){
      const fixture=donors[n+'-'+width];
      for(const [key,x,y] of fixture.opening){
        const start={x,y};
        for(const [dx,dy] of [[-12/p.scaleX,0],[0,8/p.scaleY],[14/p.scaleX,5/p.scaleY]]){
          const end={x:x+dx,y:y+dy};
          assert.equal(a.segmentSafe(start,end),b.segmentSafe(start,end),region+'/'+n+'/'+width+'/'+key); count.segments++;
        }
      }
      const start={x:fixture.input.origin[0],y:fixture.input.origin[1]},goal={x:fixture.input.modelGoal[0],y:fixture.input.modelGoal[1]};
      for(const op of ['route','referenceRoute','reachable']){
        // Disabled visible-ground regions have only the original navigation methods.
        assert.equal(typeof a[op],typeof b[op]);
        if(typeof a[op]!=='function')continue;
        assert.deepEqual(a[op](start,goal,bounds,()=>true), b[op](start,goal,bounds,()=>true),region+'/'+n+'/'+width+'/'+op); count[op]++;
      }
      count.households++;
    }
  }
  result.regions[region]=count;
}
fs.writeFileSync(output,JSON.stringify(result,null,2)+'\n');
console.log('Verified',Object.values(result.regions).reduce((sum,r)=>sum+r.households,0),'nonforest households.');
