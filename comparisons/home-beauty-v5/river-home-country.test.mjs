import test from 'node:test';
import assert from 'node:assert/strict';
import {drawRiverHomeCountry,artFootprints,fieldWind} from './river-home-country.mjs';

function inside(poly,x,y){
 let flag=false;
 for(let i=0,j=poly.length-1;i<poly.length;j=i++){
  const [a,b]=poly[i],[c,d]=poly[j];
  if((b>y)!==(d>y)&&x<(c-a)*(y-b)/(d-b)+a)flag=!flag;
 }
 return flag;
}
test('water footprint follows diagonal channel and excludes riverbank and cliff',()=>{
 const p=artFootprints.river;
 for(const [x,y] of [[530,500],[730,615],[950,774]])assert.ok(inside(p,x,y));
 for(const [x,y] of [[300,700],[540,790],[940,300],[115,440],[460,298]])assert.ok(!inside(p,x,y));
});
test('indoor pane and projected floor do not include sofa, table or wall',()=>{
 const {pane,floor}=artFootprints;
 assert.ok(inside(pane,410,300));
 for(const [x,y] of [[200,355],[610,315],[450,520],[333,945]])assert.ok(!inside(pane,x,y));
 assert.ok(inside(floor,525,850));
 for(const [x,y] of [[140,605],[316,499],[822,555],[432,358]])assert.ok(!inside(floor,x,y));
});
test('wind has local travel and long-term variation',()=>{
 assert.notEqual(fieldWind(13,.15),fieldWind(13,.80));
 assert.notEqual(fieldWind(0,.45),fieldWind(180,.45));
 assert.ok(Number.isFinite(fieldWind(1080,.80)));
});
test('foreign regions and zero strength cannot paint',()=>{
 const ctx=new Proxy({},{get(){throw Error('paint');}});
 for(const [region,strength,opacity] of [['home',0,1],['river_lake',1,0],['other',1,1]])
  drawRiverHomeCountry(ctx,{region,strength,width:390,height:585,opacity});
});
