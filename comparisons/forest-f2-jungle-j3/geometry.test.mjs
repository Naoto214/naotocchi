import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
const local=new URL('./scenes.mjs',import.meta.url);
test('candidate geometry exists independently of the production manifest',()=>assert.ok(fs.existsSync(local),'candidate scenes not yet implemented'));
if(fs.existsSync(local)){
 const {CANDIDATE_SCENES}=await import(local);
 const base=process.env.F2J3_BASE||path.resolve('../naotocchi');
 const {createRecoveredNavigation}=await import(pathToFileURL(path.join(base,'home-recovered-navigation.mjs')));
 for(const [name,s]of Object.entries(CANDIDATE_SCENES)){
  test(name+' all seats, activity points and forbidden samples respect terrain',()=>{
   const nav=createRecoveredNavigation(s,{width:430,height:932},{left:0,top:0,width:430,height:645});
   for(const [x,z]of [...s.seats,...s.points])assert.ok(nav.valid(nav.project({x,z})),`${name}: ${x},${z}`);
   for(const [x,z]of s.forbidden)assert.equal(nav.valid(nav.project({x,z})),false,`${name} forbidden ${x},${z}`);
  });
  test(name+' all resolved paths stay on ground at five projection widths',()=>{
   for(const width of [320,375,390,430,844]){
    const nav=createRecoveredNavigation(s,{width,height:width*1.5},{left:0,top:0,width,height:width*1.5});
    for(const a of s.seats)for(const b of s.seats){
     const route=nav.route(nav.project({x:a[0],z:a[1]}),nav.project({x:b[0],z:b[1]}),{left:0,right:width,top:0,bottom:width*1.5});
     assert.ok(route?.length,`${name} disconnected seat`);
     for(const p of route)assert.ok(nav.valid(p));
    }
   }
  });
 }
 test('J3 rejects wetland interior, F2 provides wide grassy ground',()=>{
  const j=CANDIDATE_SCENES['jungle-j3'],f=CANDIDATE_SCENES['forest-f2'];
  assert.ok(Math.min(...j.ground.map(p=>p[1]))>=.59);
  assert.ok(Math.max(...f.ground.map(p=>p[0]))-Math.min(...f.ground.map(p=>p[0]))>.65);
 });
}
