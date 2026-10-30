const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm');
const findGroundTarget=require('./helpers/home-ground-target.cjs');
test('ground destination is outside every actor body and touch padding, including the selected pet',async()=>{
 const d=structuredClone(require('./fixtures/home-v7-sea-pointer.json'));Object.assign(d.actors[0],{x:124.4,y:245.3});
 const a=d.actors[0],r=d.slots.castStage;
 const {ART_SCENES}=await import('../home-v7-manifest.mjs'),{createRecoveredNavigation}=await import('../home-recovered-navigation.mjs'),{insidePolygon}=await import('../home-art-navigation.mjs');
 const s=ART_SCENES['sea-b'],nav=createRecoveredNavigation(s,{width:390,height:844},{left:r.x,top:r.y,width:r.width,height:r.height});
 const visible=(p,a)=>[.22,.5,.8].every(y=>[-.3,0,.3].every(x=>{const q=nav.unproject({x:p.x+a.w*x,y:p.y-a.h*y});return !s.foreground.some(poly=>insidePolygon(q.x,q.z,poly));}));
 const b={left:a.w/2+12,right:r.width-a.w/2-12,top:a.h+30,bottom:r.height-12};
 const q={detail:()=>d,inspect:()=>({bounds:[b],scene:{navigation:nav,visible}})};
 const result=vm.runInNewContext('('+findGroundTarget.toString()+')()',{HomeV22QA:q});
 assert.ok(nav.valid(result.p));
 assert.ok(d.actors.every(c=>!(Math.abs(result.p.x-c.x)<=Math.max(22,c.w/2)&&result.p.y>=c.y-Math.max(44,c.h)&&result.p.y<=c.y+10)),JSON.stringify(result.p));
 assert.ok(Math.hypot(result.p.x-a.x,result.p.y-a.y)>=45);
});
