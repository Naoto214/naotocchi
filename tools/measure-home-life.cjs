// Reproducible CPU-only endurance check. This is not GPU or iPhone memory evidence.
const fs=require('node:fs');
const {createModel}=require('../home-diorama-model.js');
(async()=>{
 const {createWorldLife}=await import('../world-life.mjs');
 const results=[];
 for(const region of ['forest','river_lake','city']){
  const life=createWorldLife(region),cast=createModel();
  cast.sync([{key:'pet:dog',kind:'pet',id:'dog',x:170,y:170,w:60,h:75},{key:'companion:shiba',kind:'companion',id:'shiba',x:80,y:210,w:40,h:45},{key:'partner:bear',kind:'partner',id:'bear',x:270,y:210,w:50,h:55}],{region,width:390,height:300,time:'day',weather:'sunny',tags:[{tag:'shelter',x:90,y:170},{tag:region==='river_lake'?'water':'flower',x:290,y:180}]});
  for(let i=0;i<1000;i++){life.step(.1);cast.step(.1);}global.gc?.();const before=process.memoryUsage().heapUsed;
  let peakPopulation=0;for(let i=0;i<72000;i++){life.step(.1,{time:i%36000<24000?'day':'night',weather:i%24000<18000?'sunny':'rain'});cast.step(.1);peakPopulation=Math.max(peakPopulation,life.metrics().active);}
  global.gc?.();const after=process.memoryUsage().heapUsed;results.push({region,simulatedSeconds:7200,heapBefore:before,heapAfter:after,heapDelta:after-before,peakPopulation,life:life.metrics(),cast:cast.metrics()});
 }
 const report={kind:'Node simulation only; no browser, GPU or real-device claim',gc:!!global.gc,results};
 if(process.argv[2])fs.writeFileSync(process.argv[2],JSON.stringify(report,null,2)+'\n');else console.log(JSON.stringify(report,null,2));
})();
